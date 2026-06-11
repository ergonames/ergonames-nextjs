// ErgoNames v4 mint client.
//
// All byte-exact protocol crypto (commit hash, reveal-box hash) is computed by
// the bot API, not here. This module only:
//   1. resolves a name (indexer API)
//   2. asks the bot to /prepare (pricing, contracts, generated secret, commit hash)
//   3. builds the user-funded commit + reveal-proxy boxes with Fleet
//   4. signs both with the Nautilus dApp connector
//   5. submits both, then /submit-s the reveal payload to the bot
//
// The bot then performs reveal + register and the indexer records the name.

import {
  ErgoAddress,
  OutputBuilder,
  SByte,
  SColl,
  SGroupElement,
  SLong,
  TransactionBuilder,
} from "@fleet-sdk/core";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.ergonames.io";
const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? "https://bot.ergonames.io";
const BOT_TOKEN = process.env.NEXT_PUBLIC_BOT_TOKEN ?? "";
const EXPLORER = "https://explorer.ergoplatform.com";

declare const ergo: any;
declare const ergoConnector: any;

export const txLink = (txId: string) => `${EXPLORER}/transactions/${txId}`;

export interface ResolveResult {
  isValid: boolean;
  isAvailable?: boolean;
  ergoname?: string;
  mintCost?: number;
  owner?: string;
}

export async function resolveName(name: string): Promise<ResolveResult> {
  const res = await fetch(`${API_URL}/resolve/${name}`);
  return res.json();
}

export interface MintStatus {
  name: string;
  state:
    | "queued"
    | "revealing"
    | "registering"
    | "registered"
    | "refunded"
    | "not_found";
  registerTxId?: string;
  ergoNameTokenId?: string;
  refundTxId?: string;
  revealTxId?: string;
}

export async function getStatus(name: string): Promise<MintStatus> {
  const res = await fetch(`${BOT_URL}/status/${name}`);
  return res.json();
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out — is Nautilus installed and unlocked?`)), ms),
    ),
  ]);
}

// Connects the Nautilus dApp connector and returns the wallet's change address.
// Timed out so a non-responsive extension can't hang the UI silently.
export async function connectWallet(): Promise<string> {
  if (typeof window === "undefined") throw new Error("No browser window.");
  if (typeof ergoConnector === "undefined" || !ergoConnector?.nautilus) {
    throw new Error(
      "Nautilus wallet not found. Install the Nautilus extension in Chrome or Firefox, then reload this page.",
    );
  }
  console.log("[ergonames] requesting Nautilus connection…");
  const granted = await withTimeout(
    ergoConnector.nautilus.connect({ createErgoObject: true }),
    60000,
    "Wallet connection",
  );
  console.log("[ergonames] connect() returned:", granted);
  if (!granted) throw new Error("Connection request was declined in Nautilus.");
  if (typeof ergo === "undefined") {
    throw new Error("Wallet connected but context not injected. Reload the page and try again.");
  }
  const address = (await withTimeout(ergo.get_change_address(), 30000, "Reading wallet address")) as string;
  console.log("[ergonames] connected:", address);
  return address;
}

async function botPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${BOT_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429)
    throw new Error("The registration service is busy. Please try again in a minute.");
  if (!res.ok) throw new Error(`Registration service error: ${await res.text()}`);
  return res.json();
}

// Maps raw wallet/build errors to messages a user can act on.
function friendlyError(e: any): string {
  const msg = String(e?.message ?? e ?? "");
  if (/not connected|connect/i.test(msg) && /wallet/i.test(msg))
    return "Wallet not connected.";
  if (/insufficient|not enough|cannot cover/i.test(msg))
    return "Not enough ERG in your wallet to cover the registration.";
  if (/reject|declined|cancell?ed|denied/i.test(msg))
    return "You cancelled the transaction in your wallet.";
  if (/busy|try again/i.test(msg)) return msg;
  return msg || "Something went wrong. Please try again.";
}

export interface MintProgress {
  (stage: string): void;
}

// Drives a full mint. The wallet must already be connected (call
// connectWallet first); userAddress is passed in from that step.
export async function mintErgoName(
  name: string,
  userAddress: string,
  onProgress: MintProgress = () => {},
): Promise<{ commitTxId: string; proxyTxId: string }> {
  if (typeof ergo === "undefined") {
    throw new Error("Wallet not connected. Click Connect Wallet first.");
  }

  // Guard against a race: the name may have been taken between the check and
  // now. The bot also refunds if a register can't win, but failing fast here
  // avoids spending fees on a doomed mint.
  const fresh = await resolveName(name);
  if (fresh.isValid && fresh.isAvailable === false) {
    throw new Error(`~${name} was just registered by someone else.`);
  }

  const utxos = (await withTimeout(ergo.get_utxos(), 30000, "Reading wallet boxes")) as any[];

  onProgress("Fetching price and parameters…");
  const p = await botPost("/prepare", { name, userAddress });

  const userPk = ErgoAddress.fromBase58(userAddress).getPublicKeys()[0];

  // ----- Commit box -----
  // R4 commit hash, R5 user PK group element, R6 miner fee. Value carries the
  // tx-operator fee (becomes the operator payout at register).
  onProgress("Building commit transaction…");
  const commitOutput = new OutputBuilder(
    BigInt(p.txOperatorFee) + BigInt(p.minBoxValue),
    p.commitContractAddress,
  ).setAdditionalRegisters({
    R4: SColl(SByte, hexToBytes(p.commitHashHex)).toHex(),
    R5: SGroupElement(userPk).toHex(),
    R6: SLong(BigInt(p.minerFee)).toHex(),
  });

  const commitTx = new TransactionBuilder(p.creationHeight)
    .from(utxos)
    .to(commitOutput)
    .sendChangeTo(userAddress)
    .payFee(BigInt(p.minerFee))
    .build();
  const commitEip12 = commitTx.toEIP12Object();
  const commitBoxId = commitTx.outputs[0].boxId;

  // ----- Reveal-box hash for the proxy R4 -----
  onProgress("Computing reveal commitment…");
  const pending = {
    name,
    secret: p.secret,
    userAddress,
    minerFee: p.minerFee,
    txOperatorFee: p.txOperatorFee,
    minBoxValue: p.minBoxValue,
    commitBoxId,
    revealValue: p.revealValue,
    revealCreationHeight: p.creationHeight,
  };
  const { revealBoxHash } = await botPost("/reveal-hash", pending);

  // ----- Reveal-proxy box -----
  // Funded from the commit change box so the two chain cleanly.
  onProgress("Building reveal transaction…");
  const proxyOutput = new OutputBuilder(BigInt(p.proxyValue), p.revealProxyContractAddress)
    .setAdditionalRegisters({
      R4: SColl(SByte, hexToBytes(revealBoxHash)).toHex(),
      R5: SLong(BigInt(p.minerFee)).toHex(),
      R6: SLong(BigInt(p.txOperatorFee)).toHex(),
      R7: SGroupElement(userPk).toHex(),
    });

  const changeBox = commitTx.outputs.find(
    (o: any) => o.ergoTree === ErgoAddress.fromBase58(userAddress).ergoTree,
  );
  const proxyTx = new TransactionBuilder(p.creationHeight)
    .from([changeBox, ...utxos.filter((u: any) => u.boxId !== commitTx.inputs[0].boxId)])
    .to(proxyOutput)
    .sendChangeTo(userAddress)
    .payFee(BigInt(p.minerFee))
    .build();
  const proxyEip12 = proxyTx.toEIP12Object();

  // ----- Sign + submit both -----
  // The commit must not be left dangling: if the proxy step fails after the
  // commit is broadcast, surface a clear, recoverable message (the commit box
  // is refundable after the commit-age window).
  onProgress("Awaiting wallet signature (1 of 2)…");
  let commitTxId: string;
  try {
    const commitSigned = await ergo.sign_tx(commitEip12);
    commitTxId = await ergo.submit_tx(commitSigned);
  } catch (e) {
    // Nothing broadcast yet — safe to fail with a friendly message.
    throw new Error(friendlyError(e));
  }

  let proxyTxId: string;
  try {
    onProgress("Awaiting wallet signature (2 of 2)…");
    const proxySigned = await ergo.sign_tx(proxyEip12);
    proxyTxId = await ergo.submit_tx(proxySigned);
  } catch (e) {
    throw new Error(
      "Your commit transaction was sent, but the second transaction was not " +
        "completed, so registration cannot proceed. No name was minted; the " +
        "committed funds become refundable automatically after a short wait. " +
        `(commit ${commitTxId.slice(0, 10)}…)`,
    );
  }

  // ----- Hand the reveal payload to the bot -----
  onProgress("Queueing with the registration bot…");
  await botPost("/submit", {
    ...pending,
    commitTxId,
    proxyBoxId: proxyTx.outputs[0].boxId,
    proxyTxId,
  });

  onProgress("Submitted! The bot will complete your registration shortly.");
  return { commitTxId, proxyTxId };
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

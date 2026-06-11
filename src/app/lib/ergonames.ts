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

declare const ergo: any;
declare const ergoConnector: any;

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

async function botPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${BOT_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`bot ${path} failed: ${await res.text()}`);
  return res.json();
}

export interface MintProgress {
  (stage: string): void;
}

// Drives a full mint. Requires Nautilus connected (window.ergo present).
export async function mintErgoName(
  name: string,
  onProgress: MintProgress = () => {},
): Promise<{ commitTxId: string; proxyTxId: string }> {
  const connected = await ergoConnector.nautilus.connect();
  if (!connected) throw new Error("wallet not connected");

  const userAddress = await ergo.get_change_address();
  const utxos = await ergo.get_utxos();

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
  onProgress("Awaiting wallet signature…");
  const commitSigned = await ergo.sign_tx(commitEip12);
  const commitTxId = await ergo.submit_tx(commitSigned);

  const proxySigned = await ergo.sign_tx(proxyEip12);
  const proxyTxId = await ergo.submit_tx(proxySigned);

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

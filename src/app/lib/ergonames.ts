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
// Beta-tester badge COLLECTION token id (EIP-34). Each badge is a 1-of-1 NFT in
// this collection (renders + groups in wallets); the API counts a wallet's
// badges. UPDATE AT GENESIS like the contract addresses — minted on the beta
// deployment and carried forward in wallets, so this id is stable across cutover.
export const BETA_BADGE_COLLECTION_ID =
  process.env.NEXT_PUBLIC_BETA_BADGE_COLLECTION_ID ??
  "363285d224b9eb9c82f0ba738a4ab9e8271d18d71792b59a43ee2665c8048718";
const EXPLORER = "https://explorer.ergoplatform.com";

// Pinned protocol contract addresses (current mainnet genesis). The mint flow
// builds USER-SIGNED commit + reveal-proxy boxes from the bot's /prepare
// response; without pinning, a compromised/MITM'd bot could return an
// attacker address and the user would sign funds to it. We assert the bot's
// addresses match these before building any box. UPDATE THESE AT EVERY GENESIS
// (the commit contract bakes in the registry singleton token id, so the
// address changes when the registry is redeployed). Overridable via env for
// staging/genesis cutover without a code change.
const EXPECTED_COMMIT_ADDRESS =
  process.env.NEXT_PUBLIC_COMMIT_ADDRESS ?? "2eR9oE6KNihih7gH3L6uZ39ej38mQukuEKN8vHLf5wE67Hg7wBSSAwf3P1yTVkB4uoNmLqEwwfF1PiW1xcNSSwhyY5jmQndtcC9gePWFC6LgwpMzi1iWP2VLTLZwnfuFUxxKx5TJgA8XFMdEmV6nGntVhKKKSrvGQteJRkJPU47m9EcZthzHMfja5rRjTErkXqh3pmWBwZNxBEAnHrNTBPuHt3eUhsKX9VFaqzEnTKPGdth5ftNFuEPToYpP4HPTyLQ24bZvinWVXBp8JBLtq8H64nXiKkb4DKKXRfCiksyjQhKgBLWjNdCjBRBgcZSkABvHThVP1HmSMrX9vZpCdu2AfGymLRSbQnZ9peAQsCBUHyd2jzrgp4XSUGcqLNkcd8GfM";
const EXPECTED_PROXY_ADDRESS =
  process.env.NEXT_PUBLIC_PROXY_ADDRESS ?? "YpQiTGJDYCJRNJCv15sLy7LtDugqPcRgPEG1oxEYxpRDQQSze2yYg91umNE9kfcsogUMy2S6HtF8VGnydFoshJjiowV1QUdHKnXVHFFwDhC1qLzuhzroEW2xsboAPGQN2nH79geX6hDHNkDvJa4AzkoQNwgCKcfc6JMkRfRngMc7A2Hmi2gCRLP1SjBMgjMR3iBYr9HeQ6j9hQ3V5gA3jgsR3LhcNHgEt7QS3Uj2sf8bF8Bh6nFqEW7bDmU9gJ8GQneTjBpMSWak6rqxiX94NDGdpbqqJNdmcPSKkVqLbED9cnbKR1FgpAMivsPcnZW5YT94F7nf1omYUfXijKuZgbD5D3ExLXB6EjWvLKn4bJS74dQCXenuHBUa3JsVAvpkShTzbeddW6FEnpDF727Jx3WfvAYSTHtmntMmgGnWfG82SBtDuWd133wD9f1kNAnuv83ZwAEjEMMQaCi1LmrC2FDgfkeWGwkgdisZTiuyKb45NwzW4t6QrzyFGsYWYbjvJcJ8hesvxACgnJJa5nzW3trATMA6afRzentY7u6AeGqSUiBj7puqqA8tp4p8w4";
// Sanity ceiling on the funded values (nanoERG). Legitimate mints are well
// under 1 ERG; this bounds a lying bot from inflating the spend even if an
// address somehow matched. 10 ERG headroom for premium short names.
const MAX_PROXY_VALUE = 10_000_000_000n;

declare const ergo: any;
declare const ergoConnector: any;

export const txLink = (txId: string) => `${EXPLORER}/transactions/${txId}`;

export interface ResolveResult {
  isValid: boolean;
  isAvailable?: boolean;
  isReserved?: boolean;
  ergoname?: string;
  mintCost?: number;
  owner?: string;
}

export async function resolveName(name: string): Promise<ResolveResult> {
  const res = await fetch(`${API_URL}/resolve/${name}`);
  // An error body ({"error":...}) has no isAvailable and would render as
  // "Taken" — surface it to the caller's catch instead.
  if (!res.ok) throw new Error(`resolve failed (${res.status})`);
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
  if (!res.ok) throw new Error(`status failed (${res.status})`);
  return res.json();
}

export interface OwnedName { name: string; tokenId: string; }

// Names currently held by the connected wallet: collect token ids from the
// wallet's boxes, then ask the indexer which are ErgoNames.
export async function getOwnedNames(): Promise<OwnedName[]> {
  const wallet: any = (globalThis as any).__ergo ?? (typeof ergo !== "undefined" ? ergo : null);
  if (!wallet) throw new Error("Wallet not connected.");
  // An empty wallet makes get_utxos() hang in Nautilus. A 0-ERG wallet holds no
  // boxes (every box carries ERG), so it owns no name NFTs — short-circuit it.
  try {
    if (BigInt(await withTimeout(wallet.get_balance(), 10000, "Reading wallet balance")) === 0n) return [];
  } catch { /* connector without get_balance — fall through */ }
  const utxos: any[] = (await withTimeout(wallet.get_utxos(), 20000, "Reading wallet boxes").catch(() => [])) as any[];
  const tokenIds = new Set<string>();
  for (const u of utxos) for (const a of u.assets || []) tokenIds.add(a.tokenId);

  const found: OwnedName[] = [];
  await Promise.all(
    [...tokenIds].map(async (id) => {
      try {
        const r = await (await fetch(`${API_URL}/token/${id}`)).json();
        if (r && r.ergoname) found.push({ name: r.ergoname, tokenId: id });
      } catch {}
    }),
  );
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

// ---- Commit dust recovery -------------------------------------------------
// Orphaned commit boxes (failed/duplicate attempts) hold ~0.002 ERG each.
// The bot lists which ones this wallet may refund (age-gated, not referenced
// by any pending mint); the refund tx itself is built here and signed by the
// user — the contract requires exactly [user payout, miner fee] outputs.

export interface RefundableCommit {
  boxId: string;
  value: number;
  minerFee: number;
  refundNanoErg: number;
  ageBlocks: number;
}

export async function getRefundableCommits(address: string): Promise<RefundableCommit[]> {
  try {
    const r = await (await fetch(`${BOT_URL}/refundable-commits/${address}`)).json();
    return r.commits ?? [];
  } catch { return []; }
}

export async function refundCommit(boxId: string, userAddress: string): Promise<string> {
  const wallet: any = (globalThis as any).__ergo ?? (typeof ergo !== "undefined" ? ergo : null);
  if (!wallet) throw new Error("Connect your wallet first.");

  const raw = await (await fetch(`${EXPLORER_API}/api/v1/boxes/${boxId}`)).json();
  if (raw.spentTransactionId) throw new Error("This box was already recovered.");
  const commitBox = toFleetBox(raw);
  const minerFee = BigInt(raw.additionalRegisters.R6.renderedValue);

  // Exactly two outputs (user payout, miner fee) — the contract checks the
  // count and that the payout equals box value minus the R6 miner fee.
  const userOut = new OutputBuilder(BigInt(raw.value) - minerFee, userAddress);
  const height = await wallet.get_current_height();
  const tx = new TransactionBuilder(height)
    .from([commitBox])
    .to([userOut])
    .payFee(minerFee)
    .build()
    .toEIP12Object();

  return signSubmit(wallet, tx);
}

export interface StuckMint { name: string; revealValue: number; }

export async function getStuckMints(address: string): Promise<StuckMint[]> {
  try {
    const r = await (await fetch(`${BOT_URL}/stuck/${address}`)).json();
    return r.stuck || [];
  } catch { return []; }
}

export interface ReservedStatus {
  reserved: boolean;
  allowlisted: boolean;
}

// May this (connected) address mint a reserved name? Fail-closed: on any
// error we report reserved + not allowlisted so the UI never offers a mint
// that the bot would 409.
export async function getReservedStatus(
  name: string,
  address?: string,
): Promise<ReservedStatus> {
  try {
    const path = address ? `${name}/${address}` : name;
    const res = await fetch(`${BOT_URL}/reserved/${path}`);
    if (!res.ok) return { reserved: true, allowlisted: false };
    return res.json();
  } catch {
    return { reserved: true, allowlisted: false };
  }
}

// Verification application for a reserved name. Proof is free-form evidence
// of identity (tweet from the official account, signed message, etc.).
export async function applyForVerification(
  name: string,
  address: string,
  proof: string,
  contact: string,
): Promise<void> {
  const res = await fetch(`${BOT_URL}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, address, proof, contact }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `application failed (${res.status})`);
}

export type ReportCategory =
  | "bug" | "mint" | "wallet" | "resolution" | "art" | "ui" | "suggestion" | "other";

export interface IssueReport {
  category: ReportCategory;
  message: string;
  contact?: string;
  name?: string;
  page?: string;
  /** Honeypot — leave empty; a filled value is treated as a bot and dropped. */
  website?: string;
}

// Submit a user issue/bug report. The bot forwards it to the team's Discord
// channel (the webhook URL stays server-side, never in this bundle). Throws a
// user-facing message on failure so the form can surface it.
export async function reportIssue(report: IssueReport): Promise<void> {
  const res = await fetch(`${BOT_URL}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 429)
    throw new Error("You've sent several reports already — please try again later.");
  if (res.status === 503)
    throw new Error("Reporting is temporarily unavailable. Please reach us on Discord.");
  if (!res.ok) throw new Error(body.error ?? `Couldn't send the report (${res.status}).`);
}

export interface Quote {
  name: string; priceCents: number; nanoErgPerUsd: number;
  priceNanoErg: number; bufferNanoErg: number; networkFeeNanoErg: number;
  serviceFeeNanoErg: number; depositNanoErg: number; totalNanoErg: number;
}

// Live, itemised cost breakdown for a name. Returns null on any failure —
// including rate-limit/error JSON bodies, which would otherwise reach the
// price card as an object with no numeric fields and render as NaN.
export async function getQuote(name: string): Promise<Quote | null> {
  try {
    const res = await fetch(`${BOT_URL}/quote/${name}`);
    if (!res.ok) return null;
    const q = await res.json();
    return typeof q?.totalNanoErg === "number" ? q : null;
  } catch { return null; }
}

export interface StatsData {
  totalNames: number;
  uniqueMinters: number;
  last24Hours: number;
  last7Days: number;
  perDay: { dayStartMs: number; count: number }[];
  lengthDistribution: { length: number; count: number }[];
  latest: {
    name: string; tokenId: string; mintTransactionId: string;
    timestampRegistered: number; registrationNumber: number;
  }[];
  priceMapCents: number[];
}

// Aggregate registry statistics for the public /stats page.
export async function getStats(): Promise<StatsData | null> {
  try {
    const res = await fetch(`${API_URL}/stats`);
    if (!res.ok) return null;
    const s = await res.json();
    return typeof s?.totalNames === "number" ? s : null;
  } catch { return null; }
}

export interface MintsForAddress { minting: string[]; stuck: StuckMint[]; }

// In-progress + stuck mints for a wallet (so they show in My Names too).
export async function getMints(address: string): Promise<MintsForAddress> {
  try {
    const r = await (await fetch(`${BOT_URL}/mints/${address}`)).json();
    return { minting: r.minting || [], stuck: r.stuck || [] };
  } catch { return { minting: [], stuck: [] }; }
}

// Full on-chain stats for a registered name (from the indexer).
export async function getNameStats(name: string): Promise<any> {
  const r = await (await fetch(`${API_URL}/resolve/${name}`)).json();
  let owner: string | null = null;
  try { owner = (await (await fetch(`${API_URL}/owner/${name}`)).json()).owner ?? null; } catch {}
  return { ...r, owner };
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
// onStep reports progress to the UI so a hang is visible (which call stalled).
export async function connectWallet(onStep: (s: string) => void = () => {}): Promise<string> {
  const log = (s: string) => { console.log("[ergonames]", s); onStep(s); };

  if (typeof window === "undefined") throw new Error("No browser window.");
  if (typeof ergoConnector === "undefined" || !ergoConnector?.nautilus) {
    throw new Error(
      "Nautilus wallet not found. Install the Nautilus extension in Chrome or Firefox, then reload this page.",
    );
  }
  const nautilus = ergoConnector.nautilus;

  // If the site is already authorized, calling connect() again can hang
  // forever (Nautilus won't re-prompt). Check first and skip straight to it.
  log("step 1/3: checking existing connection…");
  let already = false;
  try {
    if (typeof nautilus.isConnected === "function") {
      already = await withTimeout(nautilus.isConnected(), 5000, "Wallet check");
    }
  } catch { already = false; }
  log(`already connected? ${already}`);

  if (!already) {
    log("step 2/3: requesting connection — approve in Nautilus (or click the Nautilus toolbar icon)…");
    const granted = await withTimeout(nautilus.connect(), 90000, "Wallet connection");
    log(`connect() returned: ${granted}`);
    if (!granted) throw new Error("Connection request was declined in Nautilus.");
  }

  log("step 3/3: reading wallet address…");
  let ctx: any = typeof ergo !== "undefined" ? ergo : null;
  if (!ctx && typeof nautilus.getContext === "function") {
    ctx = await withTimeout(nautilus.getContext(), 10000, "Wallet context");
  }
  if (!ctx) throw new Error("Wallet context unavailable. Reload the page and try again.");
  (globalThis as any).__ergo = ctx;

  const address = (await withTimeout(ctx.get_change_address(), 30000, "Reading wallet address")) as string;
  log(`connected: ${address}`);
  return address;
}

const EXPLORER_API = "https://api.ergoplatform.com";

// Converts an explorer box to the shape Fleet expects as a transaction input.
function toFleetBox(b: any): any {
  const regs: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.additionalRegisters || {})) {
    regs[k] = typeof v === "string" ? v : (v as any).serializedValue;
  }
  return {
    boxId: b.boxId,
    value: BigInt(b.value).toString(),
    ergoTree: b.ergoTree,
    creationHeight: b.creationHeight,
    assets: (b.assets || []).map((a: any) => ({ tokenId: a.tokenId, amount: BigInt(a.amount).toString() })),
    additionalRegisters: regs,
    transactionId: b.transactionId,
    index: b.index,
  };
}

// Recovers funds from a mint that couldn't complete, in either of two stages —
// the user signs it (the operator can't, both boxes require the user's key):
//   • reveal-stage: the reveal happened but register failed → spends the
//     protocol collection box + the user's reveal box.
//   • proxy-stage: the reveal never landed → the user reclaims the proxy box
//     directly (single input, [user payout, miner fee]).
export async function refundStuckMint(
  name: string,
  onProgress: (s: string) => void = () => {},
): Promise<string> {
  const wallet: any = (globalThis as any).__ergo ?? (typeof ergo !== "undefined" ? ergo : null);
  if (!wallet) throw new Error("Connect your wallet first.");

  onProgress("Fetching refund details…");
  const infoRes = await fetch(`${BOT_URL}/refund-info/${name}`);
  if (!infoRes.ok) throw new Error(`No refundable registration found for ~${name}.`);
  const info = await infoRes.json();

  if (info.stage === "proxy") return refundProxyStage(info, wallet, onProgress);

  onProgress("Fetching on-chain boxes…");
  const collRes = await (await fetch(`${EXPLORER_API}/api/v1/boxes/unspent/byTokenId/${info.collectionSingletonTokenId}`)).json();
  if (!collRes.items?.length) throw new Error("Collection box not found.");
  const collBox = toFleetBox(collRes.items[0]);

  const revealRaw = await (await fetch(`${EXPLORER_API}/api/v1/boxes/${info.revealBoxId}`)).json();
  if (revealRaw.spentTransactionId) throw new Error("These funds were already recovered or registered.");
  const revealBox = toFleetBox(revealRaw);

  const collTokenAmount = BigInt(
    collBox.assets.find((a: any) => a.tokenId === info.collectionTokenId).amount,
  );

  onProgress("Building refund transaction…");
  // Recreate the collection box (+1 collection token returned) and pay the user.
  const collectionOut = new OutputBuilder(BigInt(collBox.value), info.collectionContractAddress)
    .addTokens([
      { tokenId: info.collectionSingletonTokenId, amount: 1n },
      { tokenId: info.collectionTokenId, amount: collTokenAmount + 1n },
    ]);
  const userOut = new OutputBuilder(
    BigInt(info.revealValue) - BigInt(info.minerFee),
    info.userAddress,
  );

  const height = await wallet.get_current_height();
  // Collection MUST be input 0 and reveal input 1 (both contracts index them).
  const tx = new TransactionBuilder(height)
    .from([collBox, revealBox])
    .to([collectionOut, userOut])
    .payFee(BigInt(info.minerFee))
    .sendChangeTo(info.userAddress)
    .build()
    .toEIP12Object();

  onProgress("Awaiting wallet signature…");
  const txId = await signSubmit(wallet, tx);
  onProgress(`Refund submitted (${txId.slice(0, 10)}…). Funds will return shortly.`);
  return txId;
}

// Proxy-stage refund: the reveal never landed, so the user reclaims the whole
// proxy box (less the miner fee) in a single-input tx. The reveal-proxy
// contract's refund branch requires exactly two outputs — [user payout, miner
// fee] — with the payout equal to the box value minus the R5 miner fee, so we
// add no change box.
async function refundProxyStage(
  info: any,
  wallet: any,
  onProgress: (s: string) => void,
): Promise<string> {
  onProgress("Fetching on-chain box…");
  const proxyRaw = await (await fetch(`${EXPLORER_API}/api/v1/boxes/${info.proxyBoxId}`)).json();
  if (!proxyRaw || proxyRaw.error) throw new Error("Proxy box not found on-chain.");
  if (proxyRaw.spentTransactionId) throw new Error("These funds were already recovered.");
  const proxyBox = toFleetBox(proxyRaw);

  // The contract checks the miner fee against the box's own R5 register.
  const minerFee = BigInt(proxyRaw.additionalRegisters.R5.renderedValue);

  onProgress("Building refund transaction…");
  const userOut = new OutputBuilder(BigInt(proxyRaw.value) - minerFee, info.userAddress);
  // The contract requires the payout's tokens to equal the proxy's tokens
  // (a custom-token mint carries the payment token through the refund).
  if (proxyBox.assets.length) userOut.addTokens(proxyBox.assets);

  const height = await wallet.get_current_height();
  const tx = new TransactionBuilder(height)
    .from([proxyBox])
    .to([userOut])
    .payFee(minerFee)
    .build()
    .toEIP12Object();

  onProgress("Awaiting wallet signature…");
  const txId = await signSubmit(wallet, tx);
  onProgress(`Refund submitted (${txId.slice(0, 10)}…). Funds will return shortly.`);
  return txId;
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

/**
 * Turn any thrown value into a human-readable string. Wallet / dApp-connector
 * errors (Nautilus, EIP-12) reject with PLAIN OBJECTS like `{ code, info }`
 * that have no `.message`, so `String(e)` on them yields "[object Object]".
 * Unwrap the common shapes; never return "[object Object]".
 */
export function errMsg(e: any): string {
  if (e == null) return "Something went wrong. Please try again.";
  if (typeof e === "string") return e;
  if (typeof e.message === "string" && e.message) return e.message;
  if (typeof e.info === "string" && e.info) return e.info; // EIP-12 { code, info }
  if (e.error) return errMsg(e.error);
  // Some wallet/connector bridges serialize a STRING error by spreading it into
  // an object with sequential numeric keys: {"0":"T","1":"r",...}. Detect that
  // shape and rejoin it into the original message (else it renders as gibberish).
  if (typeof e === "object") {
    const keys = Object.keys(e);
    if (
      keys.length > 0 &&
      keys.every((k, i) => k === String(i)) &&
      Object.values(e).every((v) => typeof v === "string" && (v as string).length === 1)
    ) {
      return Object.values(e).join("");
    }
  }
  try {
    const s = JSON.stringify(e);
    if (s && s !== "{}" && s !== "[]") return s;
  } catch { /* circular ref — fall through */ }
  return "Something went wrong. Please try again.";
}

// Maps raw wallet/build errors to messages a user can act on.
function friendlyError(e: any): string {
  const msg = errMsg(e);
  if (/not connected|connect/i.test(msg) && /wallet/i.test(msg))
    return "Wallet not connected.";
  if (/insufficient|not enough|cannot cover/i.test(msg))
    return "Not enough ERG in your wallet to cover the registration.";
  if (/reject|declined|cancell?ed|denied|ended before|aborted|closed/i.test(msg))
    return "The transaction was cancelled in your wallet.";
  if (/busy|try again/i.test(msg)) return msg;
  return msg || "Something went wrong. Please try again.";
}

// Sign + submit a built tx, normalizing the EIP-12 object rejections Nautilus
// throws (e.g. { code, info } on user-reject) into a real Error so refund
// callers never surface "[object Object]".
async function signSubmit(wallet: any, tx: any): Promise<string> {
  try {
    const signed = await wallet.sign_tx(tx);
    return await wallet.submit_tx(signed);
  } catch (e) {
    throw new Error(friendlyError(e));
  }
}

// ---- On-chain NFT art + royalty (display) ----------------------------------
// The authentic artwork lives in the issuance box's R9 as a data: URI; the
// royalty lives in R5 of the box whose id equals the token id (the EIP-24
// issuer box). Both are display-only reads with graceful null fallbacks.

export async function getOnChainArt(tokenId: string): Promise<string | null> {
  try {
    const tok = await (await fetch(`${EXPLORER_API}/api/v1/tokens/${tokenId}`)).json();
    if (!tok?.boxId) return null;
    const box = await (await fetch(`${EXPLORER_API}/api/v1/boxes/${tok.boxId}`)).json();
    const r9 = box?.additionalRegisters?.R9?.renderedValue;
    if (!r9) return null;
    const text = hexToUtf8(r9);
    return text.startsWith("data:image/") ? text : null;
  } catch {
    return null;
  }
}

export async function getRoyaltyPerMille(tokenId: string): Promise<number | null> {
  try {
    const box = await (await fetch(`${EXPLORER_API}/api/v1/boxes/${tokenId}`)).json();
    const r5 = box?.additionalRegisters?.R5;
    if (!r5 || !r5.renderedValue) return null;
    // Coll[(Coll[Byte], Int)] renders like "[[<bytes>,25]]" (brackets, not
    // parens) — pull the integer of the first pair. Legacy filler (empty
    // Coll[Byte]) won't match.
    const m = /,(\d+)[\]\)]/.exec(r5.renderedValue);
    return m ? parseInt(m[1], 10) : null;
  } catch {
    return null;
  }
}

function hexToUtf8(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return new TextDecoder().decode(bytes);
}

// How many beta-tester badges an address holds. Each badge is a unique 1-of-1
// NFT in the Beta Tester collection, so the API counts the wallet's tokens that
// the bot has minted as badges. Display-only: returns 0 on any error, never throws.
export async function getBadgeBalance(address: string): Promise<number> {
  try {
    const r = await (await fetch(`${API_URL}/badges/${address}`)).json();
    return typeof r?.count === "number" ? r.count : 0;
  } catch {
    return 0;
  }
}

export interface MintProgress {
  (stage: string): void;
}

// Drives a full mint. The wallet must already be connected (call
// connectWallet first); userAddress is passed in from that step.
export interface ArtChoice {
  bg?: string | null;
  accent?: string | null;
  hex?: string | null;
}

export async function mintErgoName(
  name: string,
  userAddress: string,
  onProgress: MintProgress = () => {},
  art: ArtChoice = {},
): Promise<{ commitTxId: string; proxyTxId: string }> {
  const wallet: any = (globalThis as any).__ergo ?? (typeof ergo !== "undefined" ? ergo : null);
  if (!wallet) {
    throw new Error("Wallet not connected. Click Connect Wallet first.");
  }

  // Guard against a race: the name may have been taken between the check and
  // now. The bot also refunds if a register can't win, but failing fast here
  // avoids spending fees on a doomed mint.
  const fresh = await resolveName(name);
  if (fresh.isValid && fresh.isAvailable === false) {
    throw new Error(`~${name} was just registered by someone else.`);
  }

  // Backstop (the UI checks too): never start a second mint for a name that's
  // already in flight — it would orphan the first attempt's funds.
  const inFlight = await getStatus(name).catch(() => null);
  if (inFlight && ["queued", "revealing", "registering"].includes(inFlight.state)) {
    throw new Error(`~${name} is already being registered — check My Names for progress.`);
  }

  onProgress("Fetching price and parameters…");
  const p = await botPost("/prepare", { name, userAddress });

  // SECURITY: the bot returns the addresses these user-signed boxes pay into.
  // Verify them against the pinned protocol addresses BEFORE building anything,
  // so a compromised/MITM'd bot cannot redirect the registration payment to an
  // attacker. (The contract-level fund guarantees only protect funds once they
  // are inside the CORRECT contracts — pinning the destination closes the gap.)
  if (p.commitContractAddress !== EXPECTED_COMMIT_ADDRESS ||
      p.revealProxyContractAddress !== EXPECTED_PROXY_ADDRESS) {
    throw new Error(
      "Registration aborted: the service returned an unexpected contract address. " +
        "For your safety nothing was signed. Please report this — do not retry.",
    );
  }
  if (BigInt(p.proxyValue) > MAX_PROXY_VALUE || BigInt(p.proxyValue) <= 0n) {
    throw new Error("Registration aborted: the quoted amount is out of range. Nothing was signed.");
  }

  // Funds preflight. An empty/underfunded wallet makes Nautilus's get_utxos()
  // hang — which used to surface as a misleading "Reading wallet boxes timed
  // out — is Nautilus installed and unlocked?" even though the wallet is fine,
  // just empty. get_balance() returns instantly (0 for empty), so check it first
  // and fail with a clear, actionable message.
  const ergFmt = (n: bigint) => (Number(n) / 1e9).toFixed(3);
  const required = BigInt(p.proxyValue) + BigInt(p.txOperatorFee) + BigInt(p.minerFee) * 2n;
  let balance = -1n;
  try {
    balance = BigInt(await withTimeout(wallet.get_balance(), 15000, "Reading wallet balance"));
  } catch { /* connector without get_balance — fall through to the box read */ }
  if (balance === 0n) {
    throw new Error(`Your wallet is empty — add about ${ergFmt(required)} ERG to register ~${name}.`);
  }
  if (balance > 0n && balance < required) {
    throw new Error(`Not enough ERG to register ~${name}: you have ${ergFmt(balance)}, but it costs about ${ergFmt(required)} ERG.`);
  }

  onProgress("Reading your wallet…");
  const utxos = (await withTimeout(wallet.get_utxos(), 30000, "Reading your wallet's funds")) as any[];
  if (!utxos || utxos.length === 0) {
    throw new Error(`Your wallet has no spendable ERG — add about ${ergFmt(required)} ERG to register ~${name}.`);
  }

  const userPk = ErgoAddress.fromBase58(userAddress).getPublicKeys()[0];

  // ----- Commit box -----
  // R4 commit hash, R5 user PK group element, R6 miner fee. Value carries the
  // tx-operator fee (becomes the operator payout at register).
  onProgress("Building commit transaction…");
  // The commit box value MUST equal the tx-operator fee — the register tx's
  // reveal contract enforces `txOperatorFee == commitBox.value`. (Earlier this
  // added minBoxValue, which made every UI register fail.)
  const commitOutput = new OutputBuilder(
    BigInt(p.txOperatorFee),
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

  // Sign + submit the commit FIRST. The reveal box embeds the commit box id,
  // and a reliable box id is only available from the *signed* transaction
  // (Fleet doesn't populate it on the unsigned tx).
  onProgress("Awaiting wallet signature (1 of 2)…");
  let commitSigned: any, commitTxId: string, commitBoxId: string;
  try {
    commitSigned = await wallet.sign_tx(commitTx.toEIP12Object());
    commitTxId = await wallet.submit_tx(commitSigned);
    commitBoxId = commitSigned.outputs[0].boxId;
  } catch (e) {
    // Nothing broadcast yet — safe to fail with a friendly message.
    throw new Error(friendlyError(e));
  }

  // ----- Reveal-box hash for the proxy R4 (needs the real commit box id) -----
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
    // Royalty terms are server-decided at /prepare and must be echoed back
    // verbatim — they're hashed into the reveal box, and /submit rejects
    // pendings whose terms don't match the server's.
    royaltyPerMille: p.royaltyPerMille ?? 0,
    royaltyAddress: p.royaltyAddress ?? null,
    // User's art palette (whitelisted keys; null = the classic card).
    artBg: art.bg ?? null,
    artAccent: art.accent ?? null,
    artHex: art.hex && art.hex !== "none" ? art.hex : null,
  };
  const { revealBoxHash } = await botPost("/reveal-hash", pending);

  // ----- Reveal-proxy box, funded from the commit's change box -----
  onProgress("Building reveal transaction…");
  const proxyOutput = new OutputBuilder(BigInt(p.proxyValue), p.revealProxyContractAddress)
    .setAdditionalRegisters({
      R4: SColl(SByte, hexToBytes(revealBoxHash)).toHex(),
      R5: SLong(BigInt(p.minerFee)).toHex(),
      R6: SLong(BigInt(p.txOperatorFee)).toHex(),
      R7: SGroupElement(userPk).toHex(),
    });

  const userErgoTree = ErgoAddress.fromBase58(userAddress).ergoTree;
  const changeBox = commitSigned.outputs.find((o: any) => o.ergoTree === userErgoTree);

  // Fund the proxy from the commit's change box plus whatever wallet boxes the
  // commit didn't spend. Funding from the change box alone fails with
  // "insufficient inputs" whenever the commit happened to select a small box,
  // even though the wallet holds plenty across other boxes.
  const spentByCommit = new Set(commitSigned.inputs.map((i: any) => i.boxId));
  const remainingUtxos = utxos.filter((u: any) => !spentByCommit.has(u.boxId));
  const proxyFunding = changeBox ? [changeBox, ...remainingUtxos] : remainingUtxos;
  if (proxyFunding.length === 0) {
    throw new Error("No wallet boxes available to fund the reveal transaction.");
  }

  const proxyTx = new TransactionBuilder(p.creationHeight)
    .from(proxyFunding)
    .to(proxyOutput)
    .sendChangeTo(userAddress)
    .payFee(BigInt(p.minerFee))
    .build();

  let proxyTxId: string, proxyBoxId: string;
  try {
    onProgress("Awaiting wallet signature (2 of 2)…");
    const proxySigned = await wallet.sign_tx(proxyTx.toEIP12Object());
    proxyTxId = await wallet.submit_tx(proxySigned);
    proxyBoxId = proxySigned.outputs[0].boxId;
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
  await botPost("/submit", { ...pending, commitTxId, proxyBoxId, proxyTxId });

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

// ───────────────────────── Governance dashboard (team) ─────────────────────
// Auth wall: a founder proves control of their signer address by signing a
// server nonce with the wallet (EIP-12 sign_data); the API verifies the
// Schnorr proof and returns a bearer token. All governance reads/writes carry
// that token. Only the multisig founders can authenticate.

// Normalize whatever sign_data returns (hex string, Uint8Array, byte array, or
// an array-like object) into a plain hex string for the API.
function toHex(v: any): string {
  if (v == null) throw new Error("Wallet returned no signature.");
  if (typeof v === "string") return v.startsWith("0x") ? v.slice(2) : v;
  if (v instanceof Uint8Array) return [...v].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (Array.isArray(v)) return v.map((b) => (Number(b) & 0xff).toString(16).padStart(2, "0")).join("");
  if (typeof v.proof === "string") return toHex(v.proof);
  const vals = Object.values(v);
  if (vals.length && vals.every((x) => typeof x === "number")) return toHex(vals);
  throw new Error("Unexpected signature format from wallet.");
}

// Sign a message with the connected wallet and return the proof as hex.
export async function signMessage(address: string, message: string): Promise<string> {
  const wallet: any = (globalThis as any).__ergo ?? (typeof ergo !== "undefined" ? ergo : null);
  if (!wallet) throw new Error("Connect your wallet first.");
  if (typeof wallet.sign_data !== "function") {
    throw new Error(
      "This wallet can't sign messages (no sign_data). Update Nautilus; note some hardware wallets don't support message signing.",
    );
  }
  try {
    const proof = await withTimeout(
      wallet.sign_data(address, new TextEncoder().encode(message)),
      60000,
      "Awaiting wallet signature",
    );
    return toHex(proof);
  } catch (e) {
    throw new Error(friendlyError(e));
  }
}

async function govGet(path: string, token?: string): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("SESSION_EXPIRED");
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

async function govPost(path: string, payload: any, token?: string): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("SESSION_EXPIRED");
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export interface GovConfig { signers: string[]; threshold: number; actions: string[]; }
export interface GovProposal {
  id: string; action: string; description: string | null; threshold: number;
  status: string; publishedTx: string | null; createdBy: string;
  createdAt: number; signatureCount: number;
}
export interface GovProposalDetail extends Omit<GovProposal, "signatureCount"> {
  signers: string[]; unsignedTx: any;
  signatures: { signer: string; signedAt: number }[];
}

export async function govConfig(): Promise<GovConfig> { return govGet("/governance/config"); }

// Full login: pick the wallet address that is a configured signer, sign the
// server challenge with it, and exchange the proof for a session token.
export async function govLogin(onStep: (s: string) => void = () => {}): Promise<{ token: string; address: string }> {
  const cfg = await govConfig();
  const signerSet = new Set(cfg.signers);
  onStep("Connecting wallet…");
  await connectWallet(onStep);
  const wallet: any = (globalThis as any).__ergo;
  const candidates: string[] = [];
  const collect = async (fn: string) => {
    try { const r = await wallet[fn]?.(); if (Array.isArray(r)) candidates.push(...r); else if (typeof r === "string") candidates.push(r); } catch {}
  };
  await collect("get_change_address");
  await collect("get_used_addresses");
  await collect("get_unused_addresses");
  const address = candidates.find((a) => signerSet.has(a));
  if (!address) {
    throw new Error("This wallet doesn't hold a governance signer key. Connect the wallet for one of the founder addresses.");
  }
  onStep("Sign the challenge in your wallet to prove the key…");
  const { nonce } = await govGet(`/governance/challenge?address=${encodeURIComponent(address)}`);
  const proof = await signMessage(address, nonce);
  const { token } = await govPost("/governance/auth", { address, proof });
  return { token, address };
}

export async function govListProposals(token: string): Promise<{ threshold: number; signers: string[]; proposals: GovProposal[] }> {
  return govGet("/governance/proposals", token);
}
export async function govGetProposal(token: string, id: string): Promise<GovProposalDetail> {
  return govGet(`/governance/proposals/${encodeURIComponent(id)}`, token);
}
export async function govCreateProposal(
  token: string,
  p: { action: string; description: string; unsignedTx: any },
): Promise<GovProposal> {
  return govPost("/governance/proposals", p, token);
}

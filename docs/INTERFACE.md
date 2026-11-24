# Module interface of the derivation (written by the auditor, not from the casino)

`src/rng.ts` and `src/rules.ts` are the derivation of [ALGORITHM.md](ALGORITHM.md) in code (TypeScript, strict, Node
`crypto` only, no dependencies). The names below are what the verifier (`tests/verify.ts`), the simulation
(`src/simulate.ts`) and the RTP table (`src/rtp-settings.ts`) import from them. Semantics come from ALGORITHM.md; this file
fixes names, types and the package's conventions: flips as `H` / `T` strings, multipliers in **1e-4 units** (`mult4`,
`bigint`, 1.98× = 19800n), money in **1e-8 units** (`bigint`).

```ts
// src/rng.ts
// HMAC-SHA256(key = UTF-8(serverSeed), message = `${clientSeed}:${nonce}:${block}`), 32 bytes = 8 draws.
export function hmacBlock(serverSeed: string, clientSeed: string, nonce: number, block: number): Buffer;
// The first k draws u of a bet: draw i is bytes 4(i mod 8) … +3 of block floor(i / 8), big-endian.
export function draws(serverSeed: string, clientSeed: string, nonce: number, k: number): number[];
// floor(u / 2^32 × 2): 0 = H, 1 = T.
export const sideOf: (u: number) => number;
export const SIDES: 'HT';
// The first k flips of a bet as an H / T string.
export const flips: (serverSeed: string, clientSeed: string, nonce: number, k: number) => string;
// The commitment: SHA-256 of the seed's UTF-8 text, lowercase hex.
export const sha256Hex: (s: string) => string;

// src/rules.ts
// Flips a bet reads: n, or C × F for coins × flips.
export const flipsNeeded: (s: Setting) => number;
// Calls landed (streak / target game) or coins surviving all F flips (coins × flips), from the flips alone.
export function matchedOf(s: Setting, flipStr: string): number;
// The multiplier a setting pays for a match count, 0n on a loss (ALGORITHM.md §3.1–3.2).
export function mult4Of(s: Setting, matched: number): bigint;
// C(n, k) and S(n, t) = Σ_{i ≥ t} C(n, i), exact.
export function choose(n: number, k: number): bigint;
export function S(n: number, t: number): bigint;
// floor(9900 × 2^n / S(n, t)); floor(19800 × h / n); floor(9900 × 2^F × h / C).
export const mult4Target: (n: number, t: number) => bigint;
export const mult4Multi: (n: number, h: number) => bigint;
export const mult4Coins: (C: number, F: number, h: number) => bigint;
// mult4 in 1e-8 units (× 10^4).
export const multiplier8: (m4: bigint) => bigint;
// A decimal as JSON gave it to 1e-8 units; throws on a value with a non-zero digit past the eighth decimal.
export function units8(x: number | string): bigint;
// floor(stake8 × m4 / 10^4): the payout in 1e-8 units.
export const payout8: (stake8: bigint, m4: bigint) => bigint;
// Whether a setting is legal under E01 / E02.
export function legal(s: Setting): boolean;
// The exact payout law of a setting (levels mult4 with weights over 2^bits outcomes), every legal setting (147), and the
// law's first two moments; the RTP table, the simulation bands and Pass 2 read these.
export function lawTarget(n: number, t: number): Law;
export function lawMulti(n: number): Law;
export function lawCoins(C: number, F: number): Law;
export function allLaws(): Law[];
export const lawOf: (s: Setting) => Law;
export function moments(l: Law): { m1: bigint; m2: bigint; den: bigint };
```

`Setting` (`src/types.ts`) is `{ cls: string; kind: 'streak' | 'target' | 'coins'; n: number; t?: number; coins?: number;
calls: string }`: `n` is the number of calls (for coins × flips, the flips per coin F), `t` the target of the target game,
`coins` C; `cls` is the capture's class label and plays no part in the derivation. `src/rules.ts` also exports
`targetOf`, `units4` and the grid helpers the verifier uses on served values before any rounding (`decimalText`,
`decimals`, `onGrid8`, `u8`).

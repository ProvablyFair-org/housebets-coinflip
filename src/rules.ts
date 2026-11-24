// HouseBets coin flip — match counting, the win rule per mode, the multiplier and the payout, from E01 / E02.
//   target game ('streak' t = n, 'target' t < n): win iff at least t of the n calls land; pays floor4(0.99 × 2^n / S(n, t)),
//     S(n, t) = Σ_{i ≥ t} C(n, i)  (E01 multiplier; E02 jo = floor(99 × 2^n × (1e4 / 100) / S) / 1e4)
//   multi toss (n coins, one call each, 2 ≤ n ≤ 10): h landed coins pay floor4(1.98 × h / n)  (E01 multiMultiplier; E02 Yo)
//   coins × flips (C coins, F flips each, 2 ≤ C ≤ 10): coin i reads flips i·F … i·F + F − 1 and survives when all F land;
//     h survivors pay floor4(0.99 × 2^F × h / C)  (E01 coinsMultiplier; E02 Jo, Ld)
// Multipliers are integers in 1e-4 units (mult4); the payout is floor(stake × multiplier) at the wallet's 1e-8 unit.
import { MIN_TARGETS, MIN_FLIPS, MAX_FLIPS, MIN_COINS, MAX_COINS, PAY_NUMERATOR_4 } from './spec.ts';
import type { Setting } from './types.ts';

/** The decimal digits of a value exactly as JSON gave it: a number through its shortest round-trip string (String(x)),
 *  exponent forms expanded without rounding; a string as written. Never toFixed, which rounds. */
export function decimalText(x: number | string): string {
  let s = typeof x === 'number' ? String(x) : String(x).trim();
  const m = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(s);
  if (m) {
    const [, sign, ip, fp = '', ex] = m; const digits = ip + fp; let point = ip.length + Number(ex);
    if (point <= 0) s = `${sign}0.${'0'.repeat(-point)}${digits}`;
    else if (point >= digits.length) s = `${sign}${digits}${'0'.repeat(point - digits.length)}`;
    else s = `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`not a decimal: ${s}`);
  return s;
}
/** Decimal places carrying a non-zero digit (trailing zeros do not count). */
export const decimals = (x: number | string): number => { const f = (decimalText(x).split('.')[1] || '').replace(/0+$/, ''); return f.length; };
/** money on the platform's 1e-8 grid (at most 8 decimals), checked on the value as given, before any rounding. */
export const onGrid8 = (x: unknown): boolean => (typeof x === 'number' || typeof x === 'string') && decimals(x) <= 8;

/** A decimal number (as JSON gave it) to integer 1e-8 units. Throws on a value off the 1e-8 grid: callers that compare data
 *  check onGrid8 first, so an off-grid value is a FAIL of the check that reads it, never a silent rounding. */
export function units8(x: number | string): bigint {
  const s = decimalText(x);
  const [i, f = ''] = s.replace('-', '').split('.');
  if (f.length > 8 && /[1-9]/.test(f.slice(8))) throw new Error(`more than 8 decimals: ${s}`);
  const v = BigInt(i) * 100000000n + BigInt((f + '00000000').slice(0, 8));
  return s.startsWith('-') ? -v : v;
}
/** units8 for data: null when the value is off the 1e-8 grid or not a number (a comparison against null is false). */
export const u8 = (x: unknown): bigint | null => (onGrid8(x) ? units8(x as number | string) : null);

export const units4 = (x: number | string): bigint => units8(x) / 10000n;

export function choose(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  let r = 1n; for (let i = 1; i <= k; i++) r = (r * BigInt(n - k + i)) / BigInt(i);
  return r;
}
/** S(n, t) = the number of the 2^n call outcomes with at least t calls landed. */
export function S(n: number, t: number): bigint { let s = 0n; for (let i = t; i <= n; i++) s += choose(n, i); return s; }

/** The pay coefficient in 1e-4 units: 9900 = 0.99 × 1e4 (src/spec.ts PAY_NUMERATOR_4, held to E01 / E02 by COINFLIP-26). */
const P4 = BigInt(PAY_NUMERATOR_4);
export const mult4Target = (n: number, t: number): bigint => (P4 * (1n << BigInt(n))) / S(n, t);
export const mult4Multi = (n: number, h: number): bigint => (2n * P4 * BigInt(h)) / BigInt(n);
export const mult4Coins = (C: number, F: number, h: number): bigint => (P4 * (1n << BigInt(F)) * BigInt(h)) / BigInt(C);

/** The target a target-game setting plays (t = n for the every-flip streak). */
export const targetOf = (s: Setting): number => (s.kind === 'streak' ? s.n : (s.t as number));
/** Flips a bet reads: n, or C × F for coins × flips. */
export const flipsNeeded = (s: Setting): number => (s.kind === 'coins' ? (s.coins as number) * s.n : s.n);

/** Whether a setting is legal under E01 / E02 (1 ≤ n ≤ 10, minTargets[n] ≤ t ≤ n, coins 2 … 10, calls n letters H / T). */
export function legal(s: Setting): boolean {
  const callsOk = typeof s.calls === 'string' && s.calls.length === s.n && /^[HT]+$/.test(s.calls);
  if (!(s.n >= MIN_FLIPS && s.n <= MAX_FLIPS) || !callsOk) return false;
  if (s.kind === 'coins') return Number.isInteger(s.coins) && (s.coins as number) >= MIN_COINS && (s.coins as number) <= MAX_COINS;
  const t = targetOf(s);
  return Number.isInteger(t) && t >= MIN_TARGETS[s.n - 1] && t <= s.n && (s.kind === 'streak' ? true : t < s.n);
}

/** Calls landed (target game) or coins surviving all F flips (coins × flips), counted from the flips alone. */
export function matchedOf(s: Setting, flipStr: string): number {
  if (s.kind === 'coins') {
    let h = 0; for (let j = 0; j < (s.coins as number); j++) if (flipStr.slice(j * s.n, (j + 1) * s.n) === s.calls) h++;
    return h;
  }
  let m = 0; for (let i = 0; i < s.n; i++) if (flipStr[i] === s.calls[i]) m++;
  return m;
}

/** The multiplier (1e-4 units) a setting pays for a given match count; 0 on a loss. */
export function mult4Of(s: Setting, matched: number): bigint {
  if (s.kind === 'coins') return matched > 0 ? mult4Coins(s.coins as number, s.n, matched) : 0n;
  return matched >= targetOf(s) ? mult4Target(s.n, targetOf(s)) : 0n;
}

export const multiplier8 = (m4: bigint): bigint => m4 * 10000n;
/** payout = floor(stake × multiplier) at 1e-8 (stake in 1e-8 units, multiplier in 1e-4 units). */
export const payout8 = (stake8: bigint, m4: bigint): bigint => (stake8 * m4) / 10000n;

// ── Every legal setting and its exact payout law (the RTP table, the simulation bands and Pass 2 read these) ──────────

/** A payout law: levels mult4 with weights w over 2^bits equally likely draw outcomes (Σ w = 2^bits). */
export interface Law { key: string; mode: 'target' | 'multi' | 'coins'; n: number; t?: number; coins?: number; bits: number; levels: { mult4: bigint; w: bigint }[] }

export function lawTarget(n: number, t: number): Law {
  const st = S(n, t);
  return { key: `target n=${n} t=${t}`, mode: 'target', n, t, bits: n, levels: [{ mult4: mult4Target(n, t), w: st }, { mult4: 0n, w: (1n << BigInt(n)) - st }] };
}
/** h landed of n coins called once each: weight C(n, h) of 2^n. */
export function lawMulti(n: number): Law {
  const levels = []; for (let h = 0; h <= n; h++) levels.push({ mult4: mult4Multi(n, h), w: choose(n, h) });
  return { key: `multi n=${n}`, mode: 'multi', n, bits: n, levels };
}
/** h survivors of C coins, each surviving F flips with probability 2^-F: weight C(C, h) × (2^F − 1)^(C − h) of 2^(F·C). */
export function lawCoins(C: number, F: number): Law {
  const levels = []; const miss = (1n << BigInt(F)) - 1n;
  for (let h = 0; h <= C; h++) levels.push({ mult4: mult4Coins(C, F, h), w: choose(C, h) * miss ** BigInt(C - h) });
  return { key: `coins C=${C} F=${F}`, mode: 'coins', n: F, coins: C, bits: F * C, levels };
}
/** Every legal setting of the published game: 48 target-game (n, t), 9 multi toss n, 90 coins × flips (C, F). */
export function allLaws(): Law[] {
  const out: Law[] = [];
  for (let n = MIN_FLIPS; n <= MAX_FLIPS; n++) for (let t = MIN_TARGETS[n - 1]; t <= n; t++) out.push(lawTarget(n, t));
  for (let n = MIN_COINS; n <= MAX_COINS; n++) out.push(lawMulti(n));
  for (let C = MIN_COINS; C <= MAX_COINS; C++) for (let F = MIN_FLIPS; F <= MAX_FLIPS; F++) out.push(lawCoins(C, F));
  return out;
}
/** The law of a captured setting. */
export const lawOf = (s: Setting): Law => (s.kind === 'coins' ? lawCoins(s.coins as number, s.n) : lawTarget(s.n, targetOf(s)));
/** E[mult4] × 2^bits and E[mult4²] × 2^bits, exact. */
export function moments(l: Law): { m1: bigint; m2: bigint; den: bigint } {
  let m1 = 0n, m2 = 0n; for (const x of l.levels) { m1 += x.mult4 * x.w; m2 += x.mult4 * x.mult4 * x.w; }
  return { m1, m2, den: 1n << BigInt(l.bits) };
}

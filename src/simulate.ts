// HouseBets coin flip — the simulation CENSUS (COINFLIP-20 Pass 1, COINFLIP-21 Pass 2). A pure function of
// src/sim-config.ts and the five shipped bet files (Pass 2 replays every revealed seed): counts and exact sums only (integers
// / BigInt), re-derived into statistics by the verifier, which re-runs this census in full.
//   npm run simulate        rewrite outputs/simulation-results.json (the pinned artifact) and print its sha256
//   npm run simulate:run    write outputs/run/simulation-results.json (a regeneration, compared by scripts/fresh-copy-check.mjs)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { draws, hmacBlock, sideOf, sha256Hex, SIDES } from './rng.ts';
import { allLaws, lawOf, moments, matchedOf, mult4Of, flipsNeeded, type Law } from './rules.ts';
import { DRAWS_PER_BLOCK } from './spec.ts';
import { ROOT, load, PRIMARY_FILE, TAIL_FILE, PHASE_C_FILE, PHASE_C10_FILE, PHASE_D_FILE } from './loader.ts';
import { PASS1_SEEDS, PASS1_NONCES, PASS1_FLIPS_PER_ROUND, SIM_LAG_SHIFT, pass1Seed, BAND_SEEDS, BAND_NONCES, BAND_CALLS,
  bandSeed, SIM_CONVERGENCE_MARKS, SIM_PASS2_NONCES, SIM_PASS2_EARLY, SIM_PASS2_MAX_MULT4, SIM_PASS2_STATISTIC, FRESH_SEED_RULE } from './sim-config.ts';
import type { Dataset } from './types.ts';

/** One Pass 2 window: every played slot, and the SCORED slots (largest multiplier ≤ SIM_PASS2_MAX_MULT4).
 *  ret4 = Σ mult4 paid; mean = Σ E[mult4] × 2^100; var = Σ Var[mult4] × 2^200 (exact, from each setting's law).
 *  slotBets[j] / slotRet4[j]: the slots of the window that replay the epoch's j-th played setting (in nonce order) and the
 *  sum of their mult4 — the per-slot standardised return is re-derived from these in verify. */
export interface Window { bets: number; ret4: string; mean: string; var: string; scoredBets: number; scoredRet4: string; scoredMean: string; scoredVar: string; slotBets: number[]; slotRet4: number[] }

export interface Census {
  design: Record<string, unknown>;
  pass1: { flips: number; tails: number; runs: { n: number; n1: number; runs: number }; lag1: { n: number; sumXY: string; sumX: string; sumX2: string } };
  bands: { key: string; rounds: number; sum4: string; marks: { n: number; sum4: string }[] }[];
  pass2: { epochs: { set: string; epoch: number; seedHash: string; depth: number; early: Window; ref: Window }[] };
}

const fresh = (label: string): string => sha256Hex(label);

/** The Pass 1 band laws, in census order: every legal setting (src/rules.ts allLaws: target game, multi toss, coins × flips). */
export function bandLaws(): Law[] { return allLaws(); }
/** The flips a round of a band draws: n calls (target game), n coins (multi toss), C × F (coins × flips). */
export const bandDraws = (l: Law): number => (l.mode === 'coins' ? (l.coins as number) * l.n : l.n);
const SHIFT = 100n;
/** E[X] × 2^100 and Var[X] × 2^200 of a law (X in 1e-4 units). */
export function scaledMoments(l: Law): { mean: bigint; v: bigint; max4: bigint } {
  const { m1, m2 } = moments(l); const up = SHIFT - BigInt(l.bits);
  const mean = m1 << up, e2 = m2 << up;
  return { mean, v: (e2 << SHIFT) - mean * mean, max4: l.levels.reduce((m, x) => (x.mult4 > m ? x.mult4 : m), 0n) };
}

/** The five shipped bet files Pass 2 replays, in this order (every revealed seed of the package). */
export const PASS2_SETS: readonly (readonly [string, string])[] = [['A', PRIMARY_FILE], ['tail', TAIL_FILE], ['C', PHASE_C_FILE], ['C10', PHASE_C10_FILE], ['D', PHASE_D_FILE]];
export const loadPass2Sets = (): { set: string; ds: Dataset }[] => PASS2_SETS.map(([set, f]) => ({ set, ds: load(f) }));

export function census(sets: readonly { set: string; ds: Dataset }[], onProgress?: (s: string) => void): Census {
  // ── Pass 1a: side balance, runs on the side sequence, lag-1 on u >>> 16 (exact BigInt)
  let flipsN = 0, tails = 0, runs = 0, last = -1, sx = 0n, sx2 = 0n, sxy = 0n, prev = -1;
  for (let i = 0; i < PASS1_SEEDS; i++) {
    const { server, client } = pass1Seed(i); const S = fresh(server);
    for (let nonce = 1; nonce <= PASS1_NONCES; nonce++) {
      for (const u of draws(S, client, nonce, PASS1_FLIPS_PER_ROUND)) {
        const s = sideOf(u); flipsN++; tails += s; if (s !== last) { runs++; last = s; }
        const v = u >>> SIM_LAG_SHIFT, V = BigInt(v); sx += V; sx2 += V * V; if (prev >= 0) sxy += BigInt(prev) * V; prev = v;
      }
    }
  }
  onProgress?.(`pass 1: ${flipsN} flips`);

  // ── Pass 1b: the bands, every legal setting on its own seeds
  const laws = bandLaws();
  const call = [...BAND_CALLS].map((c) => SIDES.indexOf(c));
  // a band pays what its setting's law (src/rules.ts) pays for the matched count: the law is what the band's exact RTP is taken from
  const pay = (l: Law, h: number): bigint => l.mode === 'target' ? (h >= (l.t as number) ? l.levels[0].mult4 : 0n) : l.levels[h].mult4;
  const bandOut: Census['bands'] = [];
  const side = new Array<number>(100);
  for (const l of laws) {
    const need = bandDraws(l), top = l.mode === 'coins' ? (l.coins as number) : l.n;
    const count = new Array<number>(top + 1).fill(0);   // rounds by matched count h; the band's sum is Σ count[h] × pay(h)
    const pays = Array.from({ length: top + 1 }, (_, h) => pay(l, h));
    const total = (): bigint => count.reduce((a, c, h) => a + BigInt(c) * pays[h], 0n);
    const marks: { n: number; sum4: string }[] = []; let k = 0;
    for (let j = 0; j < BAND_SEEDS; j++) {
      const { server, client } = bandSeed(l.key, j); const S = fresh(server);
      for (let nonce = 1; nonce <= BAND_NONCES; nonce++) {
        for (let b = 0, i = 0; i < need; b++) { const d = hmacBlock(S, client, nonce, b); for (let q = 0; q < DRAWS_PER_BLOCK && i < need; q++, i++) side[i] = sideOf(d.readUInt32BE(4 * q)); }
        let h = 0;
        if (l.mode === 'coins') {
          for (let c = 0; c < top; c++) { let ok = true; for (let f = 0; f < l.n; f++) if (side[c * l.n + f] !== call[f]) { ok = false; break; } if (ok) h++; }
        } else { for (let i = 0; i < l.n; i++) if (side[i] === call[i]) h++; }
        count[h]++;
        k++; if (SIM_CONVERGENCE_MARKS.includes(k)) marks.push({ n: k, sum4: String(total()) });
      }
    }
    bandOut.push({ key: l.key, rounds: k, sum4: String(total()), marks });
    onProgress?.(`band ${l.key}: ${k} rounds`);
  }

  // ── Pass 2: every revealed seed of the five bet files × nonces 1..10,000, the epoch's played settings cycled over the window
  const epochs: Census['pass2']['epochs'] = [];
  const mom = new Map<string, ReturnType<typeof scaledMoments>>();
  const M = (s: Dataset['bets'][number]['setting']) => { const l = lawOf(s); let x = mom.get(l.key); if (!x) { x = scaledMoments(l); mom.set(l.key, x); } return x; };
  for (const { set, ds } of sets) for (const sd of ds.seeds) {
    const e = Number(sd.epoch);
    const played = ds.bets.filter((b) => b.epoch === e).sort((a, b) => a.nonce - b.nonce).map((b) => b.setting);
    const depth = SIM_PASS2_EARLY(played.length);
    const z = () => ({ bets: 0, ret: 0n, mean: 0n, v: 0n, sb: 0, sr: 0n, sm: 0n, sv: 0n, jb: new Array(played.length).fill(0) as number[], jr: new Array(played.length).fill(0) as number[] });
    const acc = { early: z(), ref: z() };
    for (let nonce = 1; nonce <= SIM_PASS2_NONCES; nonce++) {
      const j = (nonce - 1) % played.length, st = played[j];
      const fl = draws(sd.revealedServerSeed, sd.clientSeed, nonce, flipsNeeded(st)).map((u) => SIDES[sideOf(u)]).join('');
      const m = mult4Of(st, matchedOf(st, fl)); const mo = M(st);
      const a = nonce <= depth ? acc.early : acc.ref;
      a.bets++; a.ret += m; a.mean += mo.mean; a.v += mo.v; a.jb[j]++; a.jr[j] += Number(m);
      if (mo.max4 <= BigInt(SIM_PASS2_MAX_MULT4)) { a.sb++; a.sr += m; a.sm += mo.mean; a.sv += mo.v; }
    }
    const out = (a: ReturnType<typeof z>): Window => ({ bets: a.bets, ret4: String(a.ret), mean: String(a.mean), var: String(a.v),
      scoredBets: a.sb, scoredRet4: String(a.sr), scoredMean: String(a.sm), scoredVar: String(a.sv), slotBets: a.jb, slotRet4: a.jr });
    epochs.push({ set, epoch: e, seedHash: sd.hashedServerSeed, depth, early: out(acc.early), ref: out(acc.ref) });
  }
  onProgress?.(`pass 2: ${epochs.length} epochs × ${SIM_PASS2_NONCES}`);

  return {
    design: { freshSeedRule: FRESH_SEED_RULE,
      pass1: { seeds: PASS1_SEEDS, nonces: PASS1_NONCES, flipsPerRound: PASS1_FLIPS_PER_ROUND, side: 'floor(u / 2^32 x 2), 1 = T', lagOf: 'u >>> 16', runsOn: 'the side sequence' },
      bands: { seeds: BAND_SEEDS, nonces: BAND_NONCES, drawsPerRound: 'n (target game, multi toss) or C x F (coins x flips)', seedLabels: 'each setting on its own seed labels', calls: BAND_CALLS, marks: SIM_CONVERGENCE_MARKS, laws: laws.map((l) => l.key) },
      pass2: { nonces: SIM_PASS2_NONCES, earlyWindow: 'nonces 1..n, n = the epoch\'s captured depth', scoredMaxMult4: SIM_PASS2_MAX_MULT4, datasets: PASS2_SETS.map(([set, f]) => `${set}: ${f}`),
        statistic: SIM_PASS2_STATISTIC,
        units: 'slotBets[j] / slotRet4[j] = slots replaying the epoch\'s j-th played setting and the sum of their multipliers in 1e-4 units; ret4 = sum of multipliers in 1e-4 units; mean = sum of E[mult4] x 2^100; var = sum of Var[mult4] x 2^200, each from the setting\'s exact law (src/rules.ts)' } },
    pass1: { flips: flipsN, tails, runs: { n: flipsN, n1: tails, runs }, lag1: { n: flipsN, sumXY: String(sxy), sumX: String(sx), sumX2: String(sx2) } },
    bands: bandOut,
    pass2: { epochs },
  };
}

export const censusText = (c: Census): string => JSON.stringify(c, null, 2) + '\n';

if (process.argv[1] && /simulate\.ts$/.test(process.argv[1])) {
  const t0 = Date.now();
  const c = census(loadPass2Sets(), (s) => console.log(`  ${s}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`));
  const text = censusText(c);
  const emit = process.env.PF_EMIT === '1';
  const dir = emit ? join(ROOT, 'outputs') : join(ROOT, 'outputs', 'run'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'simulation-results.json'), text);
  console.log(`wrote ${emit ? 'outputs' : 'outputs/run'}/simulation-results.json sha256 ${createHash('sha256').update(text).digest('hex')}`);
}

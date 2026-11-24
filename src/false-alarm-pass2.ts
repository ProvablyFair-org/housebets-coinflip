// COINFLIP-21 Pass 2 — its false-alarm rates on honest data, DECLARED here and re-checkable with `npm run false-alarm:pass2`.
// Pass 2 rejects when the early-window statistic of the SCORED played slots (largest multiplier ≤ 100×, src/sim-config.ts)
// of every revealed seed (the five bet files, src/simulate.ts PASS2_SETS) has a one-sided normal lower-tail p below 0.01.
// Two forms are replayed on the SAME replicates: the pooled standardised return (Σ return − Σ mean)/√Σ var, scored until
// 14 Oct 2026, and the per-slot standardised return scored since (the roulette/keno form), Σ (return − mean_s)/sd_s ÷ √slots with each slot's exact mean and sd from its setting's law (a
// zero-variance slot carries no information and is skipped). Both are sums of discrete, skewed terms, so their true lower
// tail at the normal 1 % point can differ from 1 %. No closed form exists; this is a plain Monte Carlo over the scored played
// slots (fixed seed, xoshiro128** generator, each slot's payout drawn from its exact law, src/rules.ts), and each rate is the
// share of replicates its rule rejects. The same replicates give the fair-play distribution of the "epochs below expectation"
// count verify prints (epochs whose early-window scored return is below its exact mean): its mean and sd over the replicates.
import { lawOf } from './rules.ts';
import { normalLowerTailP } from './stats.ts';
import { SIM_PASS2_ALPHA, SIM_PASS2_ALPHA_SCORED, SIM_PASS2_MAX_MULT4 } from './sim-config.ts';
import { loadPass2Sets } from './simulate.ts';

export const PASS2_FALSE_ALARM = Object.freeze({
  rate: 0.00657,
  standardError: 0.000181,
  perSlotRate: 0.00907,
  perSlotStandardError: 0.000212,
  perSlotRateNominal: 0.01007,
  perSlotStandardErrorNominal: 0.000223,
  belowMean: 86.18,
  belowSd: 5.9,
  replicates: 200_000,
  seed: 20261013,
  scoredThreshold: 'per-slot rule: one-sided normal lower-tail p < 0.009 (src/sim-config.ts SIM_PASS2_ALPHA_SCORED); perSlotRateNominal is the same rule at p < 0.01; the pooled rule (rate) at p < 0.01',
  method: 'plain Monte Carlo over the scored played slots (largest multiplier <= 100x) of every revealed seed of the five bet files (payout drawn from the setting\'s exact law), both rules applied to each replicate',
});

function xoshiro(seed: number) {
  let a = seed >>> 0, b = 0x9e3779b9, c = 0x243f6a88, d = 0xb7e15162;
  return (): number => {
    const r = (Math.imul(Math.imul(b, 5) << 7 | Math.imul(b, 5) >>> 25, 9)) >>> 0;
    const t = b << 9; c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = (d << 11) | (d >>> 21);
    return r / 4294967296;
  };
}

export function simulatePass2FalseAlarm(replicates: number, seed: number) {
  // the scored slots of every revealed seed, in the census's order: file by file, dataset order
  const slots = loadPass2Sets().flatMap(({ set, ds }) => ds.bets.map((b) => ({ l: lawOf(b.setting), e: `${set}/${b.epoch}` }))).filter(({ l }) => l.levels.every((x) => x.mult4 <= BigInt(SIM_PASS2_MAX_MULT4)));
  const epochs = [...new Set(slots.map((s) => s.e))]; const eIdx = new Map(epochs.map((e, i) => [e, i]));
  // per slot: cumulative probabilities and payouts (multiplier units) of its levels, its exact mean and sd
  const cum: Float64Array[] = [], val: Float64Array[] = [], mu: number[] = [], sdS: number[] = [], ep: number[] = [];
  let mean = 0, v = 0;
  for (const { l, e } of slots) {
    const den = Number(1n << BigInt(l.bits)); let c = 0, m1 = 0, m2 = 0;
    const cp = new Float64Array(l.levels.length), pv = new Float64Array(l.levels.length);
    l.levels.forEach((x, i) => { const p = Number(x.w) / den, m = Number(x.mult4) / 1e4; c += p; cp[i] = c; pv[i] = m; m1 += p * m; m2 += p * m * m; });
    cp[cp.length - 1] = 1; cum.push(cp); val.push(pv); mean += m1; v += m2 - m1 * m1; mu.push(m1); sdS.push(Math.sqrt(Math.max(0, m2 - m1 * m1))); ep.push(eIdx.get(e)!);
  }
  const eMean = new Float64Array(epochs.length); for (let i = 0; i < mu.length; i++) eMean[ep[i]] += mu[i];
  const nz = sdS.filter((s) => s > 0).length, root = Math.sqrt(nz);
  const sd = Math.sqrt(v), rnd = xoshiro(seed);
  let rej = 0, rejSlot = 0, rejSlotNominal = 0, bSum = 0, bSum2 = 0; const per = new Float64Array(epochs.length);
  for (let r = 0; r < replicates; r++) {
    let s = 0, zs = 0; per.fill(0);
    for (let i = 0; i < cum.length; i++) { const u = rnd(), cp = cum[i]; let j = 0; while (u >= cp[j]) j++; const x = val[i][j]; s += x; per[ep[i]] += x; if (sdS[i] > 0) zs += (x - mu[i]) / sdS[i]; }
    if (normalLowerTailP((s - mean) / sd) < SIM_PASS2_ALPHA) rej++;
    const pSlot = normalLowerTailP(zs / root); if (pSlot < SIM_PASS2_ALPHA_SCORED) rejSlot++; if (pSlot < SIM_PASS2_ALPHA) rejSlotNominal++;
    let below = 0; for (let e = 0; e < per.length; e++) if (per[e] < eMean[e]) below++;
    bSum += below; bSum2 += below * below;
  }
  const rate = rej / replicates, slotRate = rejSlot / replicates, slotRateNominal = rejSlotNominal / replicates;
  const bMean = bSum / replicates, bSd = Math.sqrt(Math.max(0, bSum2 / replicates - bMean * bMean));
  return { rate: Number(rate.toFixed(5)), standardError: Number(Math.sqrt(rate * (1 - rate) / replicates).toPrecision(3)),
    perSlotRate: Number(slotRate.toFixed(5)), perSlotStandardError: Number(Math.sqrt(slotRate * (1 - slotRate) / replicates).toPrecision(3)),
    perSlotRateNominal: Number(slotRateNominal.toFixed(5)), perSlotStandardErrorNominal: Number(Math.sqrt(slotRateNominal * (1 - slotRateNominal) / replicates).toPrecision(3)),
    belowMean: Number(bMean.toFixed(2)), belowSd: Number(bSd.toFixed(2)), replicates, seed, slots: cum.length, zeroVarianceSlots: cum.length - nz, epochs: epochs.length };
}

if (process.argv[1] && /false-alarm-pass2\.ts$/.test(process.argv[1])) {
  const r = simulatePass2FalseAlarm(PASS2_FALSE_ALARM.replicates, PASS2_FALSE_ALARM.seed);
  const same = r.rate === PASS2_FALSE_ALARM.rate && r.standardError === PASS2_FALSE_ALARM.standardError && r.perSlotRate === PASS2_FALSE_ALARM.perSlotRate
    && r.perSlotStandardError === PASS2_FALSE_ALARM.perSlotStandardError && r.perSlotRateNominal === PASS2_FALSE_ALARM.perSlotRateNominal
    && r.perSlotStandardErrorNominal === PASS2_FALSE_ALARM.perSlotStandardErrorNominal && r.belowMean === PASS2_FALSE_ALARM.belowMean && r.belowSd === PASS2_FALSE_ALARM.belowSd;
  console.log(JSON.stringify(r), same ? '== the declaration' : '!= the declaration: update PASS2_FALSE_ALARM');
  process.exitCode = same ? 0 : 1;
}

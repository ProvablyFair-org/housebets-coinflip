#!/usr/bin/env node
// REFERENCE COPY, not a runnable tool: the coin flip capture rig of the ProvablyFair.org audit of HouseBets,
// with comments edited (names, internal paths) and the code unchanged. Reference copy; the as-run file
// (sha256 66ea9c382b7880e5ee2579c747487866e3ccddfaab363a3682300c7a72cf0775,
// recorded in data/supplementary/housebets-coinflip-phaseC-safe-10usd-200bets.json meta) is held privately.
// The rig files Phase A ran (sha256 60e26a36ee4b4438435936633b4259548f975e75f0cff525fa895fd8a831f3df) and Phases C and D ran
// (sha256 f7429628f358d9481d32a9fb9a5f3b583be658ad1d1510a3588c2f26bb23d804) were not kept.
/* ============================================================================
 *  HouseBets House Games (new engine) — COIN FLIP capture  ·  ProvablyFair.org
 *  Written 2026-10-10.
 *  Endpoints and fields: quoted from the coin flip game page bundle of 10 Oct 2026 (sha256 2817660d…7454).
 *
 *   POST /housegames/coinflip/bet {calls, amount, currency, mode?:"multi", coins?, target?, generation}
 *
 *  CELLS (every combination the request format admits, per the bundle's answer check Sp() and helpers):
 *   streak       calls of n = 1..10 flips, all must match (no mode, no target)            10 cells  [UI sends this]
 *   coins x flips mode "multi", coins c = 2..10, calls of n = 1..10 flips per coin          90 cells  [UI sends this]
 *   target       calls of n flips, target t with minTarget(n) <= t < n (bundle Wo/Ki)       38 cells  [API only: the 10 Oct UI
 *                state forces target = n, so the UI never sends `target`; the spec's target table covers it]
 *   multi toss   mode "multi", n = 2..10 coins each called once, coins:1                     9 cells  [API only: the UI state
 *                forces coins > 1 whenever mode is "multi"; the bundle's answer check and rules text ("Multi") cover it]
 *  PLAN: 4 rounds per cell, calls drawn H/T by crypto.randomInt → 147 cells × 4 = 588 rounds at the minimum stake.
 *  --ui-only drops the two API-only families (100 cells × 4 = 400 rounds).
 *  SETUP / OPTIONS: as capture-hb-dice.mjs
 *  PHASES (12 Oct, hb-sp-core; no --phase = Phase A, unchanged): --phase=C 250 single flips (streak n = 1, call drawn per
 *   bet by crypto.randomInt) at 100 × the minimum · --phase=D --client-seeds=s1,s2,s3,s4 [--empty-seed-control] 4 × 50 at
 *   the minimum, Phase A cells without the 1-coin multi toss (the server refuses it, 12 Oct: 36/36)
 * ==========================================================================*/
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { runCapture, rint, shuffle, parseArgs } from '../common/hb-sp-core.mjs';

const comb = (n, k) => { let a = 1; for (let i = 1; i <= k; i++) a = a * (n - k + i) / i; return Math.round(a); };
const winCount = (n, t) => { let a = 0; for (let i = t; i <= n; i++) a += comb(n, i); return a; };
const minTarget = (n) => { for (let t = 1; t <= n; t++) if (100 * winCount(n, t) <= 98 * 2 ** n) return t; return n; };   // bundle Wo (98% cap)
const calls = (n) => Array.from({ length: n }, () => (rint(0, 2) ? 'T' : 'H')).join('');

function cells(uiOnly) {
  const c = [];
  for (let n = 1; n <= 10; n++) c.push({ cls: `streak-n${n}`, kind: 'streak', n });
  for (let k = 2; k <= 10; k++) for (let n = 1; n <= 10; n++) c.push({ cls: `coins-c${k}-n${n}`, kind: 'coins', n, coins: k });
  if (!uiOnly) {
    for (let n = 2; n <= 10; n++) for (let t = minTarget(n); t < n; t++) c.push({ cls: `target-n${n}-t${t}`, kind: 'target', n, t, apiOnly: true });
    // --no-multi: the server refuses a 1-coin multi (12 Oct live: 36/36, code 6 "multi toss takes 2 to 10 coins")
    if (!flag('no-multi', false)) for (let n = 2; n <= 10; n++) c.push({ cls: `multi-n${n}`, kind: 'multi', n, apiOnly: true });
  }
  return c;
}
const { flag } = parseArgs();
const adapter = {
  game: 'coinflip', gameType: 'coinflip', betPath: '/coinflip/bet', limitsSlug: 'coinflip', fairnessSlug: 'coinflip', seedPrefix: 'pfcoin', extraGets: [],
  scriptFile: fileURLToPath(import.meta.url),
  planDoc: flag('ui-only', false) ? '400 = 100 UI cells (streak n1..10, coins 2..10 × n1..10) × 4' : '588 = 147 cells (streak 10, coins×flips 90, target t<n 38, multi toss 9) × 4; calls CSPRNG',
  buildPlan() {
    const plan = [];
    for (const c of cells(!!flag('ui-only', false))) for (let i = 0; i < 4; i++) plan.push({ ...c, calls: calls(c.n) });
    return shuffle(plan);
  },
  probePlan: () => [{ cls: 'streak-n3', kind: 'streak', n: 3, calls: calls(3) }, { cls: 'coins-c3-n2', kind: 'coins', n: 2, coins: 3, calls: calls(2) },
    { cls: 'target-n4-t2', kind: 'target', n: 4, t: 2, calls: calls(4), apiOnly: true }, { cls: 'multi-n5', kind: 'multi', n: 5, calls: calls(5), apiOnly: true }],
  // supplementary phases (used only with --phase)
  phases: {
    C: { count: 250, setting: { kind: 'streak', n: 1 }, entry: () => ({ cls: 'C-streak-n1', kind: 'streak', n: 1, calls: calls(1) }),
      doc: 'Phase C: 250 single flips = 5 epochs × 50 (streak n = 1, the call drawn per bet by crypto.randomInt; win chance 50 %, pays 1.98×), stake 100 × the minimum',
      variants: { safe: { count: 200, setting: { kind: 'target', n: 3, t: 1 }, entry: () => ({ cls: 'C-target-n3-t1', kind: 'target', n: 3, t: 1, calls: calls(3) }),
        doc: 'Phase C (safe, 13 Oct $10 set): 200 bets = 4 epochs × 50, 3 calls with target 1 (at least 1 of 3 right: win chance 7/8 = 87.5 %, pays floor(99 × 8 × 100 / 7) / 10^4 = 1.1314×), calls drawn per bet by crypto.randomInt, stake --stake' } } },
    D: { keep: (e) => e.kind !== 'multi',
      doc: 'Phase D: one epoch of 50 bets per player-set client seed (--client-seeds, in order) at the minimum stake; cells drawn from a fresh Phase A plan (CSPRNG) without the 1-coin multi toss the server refuses' },
  },
  stakeOf: (_e, base) => base,
  // bundle placeBet: r={calls, amount, currency}; mode "multi" → r.mode="multi", r.coins=e.coins; else 1 <= target < calls.length → r.target
  body(e, base, currency) {
    const r = { calls: e.calls, amount: base, currency };
    if (e.kind === 'coins') { r.mode = 'multi'; r.coins = e.coins; }
    else if (e.kind === 'multi') { r.mode = 'multi'; r.coins = 1; }
    else if (e.kind === 'target') r.target = e.t;
    r.generation = randomUUID();
    return r;
  },
  // bundle answer check Sp(): game.{calls, flips, flipCount, matched, target, mode, coins, fairnessVersion},
  // game.game.{nonce, payoutMultiplier, amount, roundId, clientSeed, hashedSeed}, round.{payout, stake, roundId}, balance
  extract(o, e) {
    const d = (o && o.game) || {}, u = d.game || {}, r = (o && o.round) || {};
    return {
      outcome: d.flips ?? null, echoedCalls: d.calls ?? null, mode: d.mode ?? null, coins: d.coins ?? null, matched: d.matched ?? null,
      echoedTarget: d.target ?? null, flipCount: d.flipCount ?? null,
      nonce: u.nonce ?? null, respClientSeed: u.clientSeed ?? null, respHashedSeed: u.hashedSeed ?? null,
      payoutMultiplier: u.payoutMultiplier ?? null, payout: r.payout ?? null, roundStake: r.stake ?? null, roundId: u.roundId ?? null,
      fairnessVersion: d.fairnessVersion ?? null, balance: o ? o.balance ?? null : null,
      sameSetting: d.calls != null ? String(d.calls).toUpperCase() === e.calls : null,
    };
  },
};
runCapture(adapter, dirname(fileURLToPath(import.meta.url))).catch((e) => { console.error('FATAL:', e.message); process.exit(1); });

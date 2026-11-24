// HouseBets House Games coin flip (new engine, fairness version "canonical") — verification suite: the 30 checks of the
// COINFLIP profile (src/profile-map.ts, generated from the framework's games/coinflip/profile.public.json, 1.0.2-public, Framework 1.1; bound at
// run time to the vendored byte copy profile/profile.json).
// Run: npm run verify (Node 22, no install).
// Status by policy: HARD_FAIL → PASS | FAIL; FLAG → PASS | FLAG (origin operator or capture); INFORMATIONAL → INFO;
// GRADED / RELEASE_GATE (package checks) → PASS | GAP, reported, not in the verdict — except a release-gate record
// (outputs/fresh-copy.json, outputs/mutation-results.json) that is missing or not the bytes RELEASE-MANIFEST.json pins: FAIL,
// and the verdict is NOT PROVABLY FAIR. A step that throws is scored FAIL, never skipped (step(), below).
// Verdict, ranked as RTP-CLAIM 1.2.0's rtpClaimVerdict: any FAIL → NOT PROVABLY FAIR (exit 1) > a scored check with no status
// from this run → INCOMPLETE (exit 3; never a pass) > COINFLIP-19 OVERSTATED → RTP FIGURE OVERSTATED (exit 5, Methodology
// v1.1) > an operator-origin FLAG → Conditional Pass (exit 2) > Full Pass (exit 0). A stale verify.js → exit 4, no verdict.
// A capture-origin FLAG is disclosed with a limitation row and is verdict-neutral (policy decided 2026-09-17).
// verify writes only outputs/run/ and never rewrites a pinned artifact.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, load, sha256File, sha256Bytes, readJson, PRIMARY_FILE, PRIMARY_SHA256, TAIL_FILE, TAIL_SHA256, AS_CAPTURED_FILE,
  AS_CAPTURED_SHA256, PHASE_C_FILE, PHASE_C_SHA256, PHASE_C10_FILE, PHASE_C10_SHA256, PHASE_D_FILE, PHASE_D_SHA256, EVIDENCE_PINS,
  EXPECTED_BETS, EXPECTED_SEEDS, EXPECTED_EPOCHS, EXPECTED_EPOCH_SIZE, EXPECTED_TAIL_BETS, EXPECTED_PHASE_C_BETS, EXPECTED_PHASE_C10_BETS,
  EXPECTED_PHASE_D_BETS, PHASE_C_STAKE, PHASE_C10_STAKE, PHASE_D_SEEDS, E05_ROWS, NONCE_BASE, planClasses, PLAN_CLASS_COUNT, PLAN_CLASS_FLOOR } from '../src/loader.ts';
import { draws, flips, sideOf, sha256Hex } from '../src/rng.ts';
import * as RNG from '../src/rng.ts';
import { units8, u8, onGrid8, units4, choose, S, mult4Target, mult4Multi, mult4Coins, targetOf, flipsNeeded, legal, matchedOf, mult4Of, multiplier8, payout8,
  lawOf, lawCoins, allLaws, moments } from '../src/rules.ts';
import { TWO32, SIDE_RULE_TEXT, MIN_TARGETS, MAX_WIN_CHANCE_PCT, MULTIPLIER_TABLE, WIN_CHANCE_TABLE, MULTI_TABLE, MULTI_PROFIT_CHANCE,
  MIN_STAKE, MAX_WIN, SPEC_VECTORS, MIN_FLIPS, MAX_FLIPS, MIN_COINS, MAX_COINS } from '../src/spec.ts';
import { publishedClaim, publishedLimits, exhibitBinding } from '../src/exhibits.ts';
import { bindProfile } from '../src/profile-bind.ts';
import { PROFILE, PROFILE_SHA256, PROFILE_VERSION, type Policy } from '../src/profile-map.ts';
import { splitWholeEpochs } from '../src/split.ts';
import { census, censusText, bandLaws, scaledMoments, type Census } from '../src/simulate.ts';
import { SIM_UNIFORMITY_FLIPS, SIM_BAND_ROUNDS, EDGE_SIGMAS, EDGE_BUFFER, ALPHA_SCREEN, FLOOR_BANDS, bandSeed, SIM_PASS2_NONCES,
  SIM_PASS2_ALPHA, SIM_PASS2_ALPHA_SCORED, SIM_PASS2_MAX_MULT4, FLOOR_UNIFORMITY_FLIPS, FLOOR_BAND_ROUNDS, FLOOR_PASS2_NONCES } from '../src/sim-config.ts';
import { chiSquaredPValue, runsStatisticFromCounts, twoSidedNormalP, normalLowerTailP, normalQuantile } from '../src/stats.ts';
import { edgeBandFalseAlarm, binomialOutside, FAIL_FALSE_ALARM_CAP, fmtRate } from '../src/false-alarm.ts';
import { bernsteinBandFalseAlarm } from '../src/false-alarm-bands.ts';
import { PASS2_FALSE_ALARM } from '../src/false-alarm-pass2.ts';
import { computeRtpClaim, runRtpClaimGate } from '../src/rtp-settings.ts';
import { RTP_CLAIM_RULE_ENFORCED, rtpClaimVerdict } from '../src/rtp-claim';
import { ARTIFACT_PINS, AUDIT_ID, SITE_VERIFIER_PIN } from '../src/artifact-pins.ts';
import { loadSiteModule, replay, exportNames, type Probe } from '../src/site-verifier.ts';
import { fieldDiff, beyondTolerance } from '../src/diff.ts';
import type { Dataset, Bet } from '../src/types.ts';

type Status = 'PASS' | 'FAIL' | 'FLAG' | 'INFO' | 'GAP' | 'NOT_RUN' | 'OVERSTATED';
interface Row { id: string; name: string; policy: Policy; status: Status; origin?: 'operator' | 'capture'; detail: string }
const rows: Row[] = [];
// ═══ A step that throws is scored, never skipped ═══
// Every check below runs inside step(). An exception in a step (a file missing, a dataset field null or absent) marks the
// check(s) that step scores FAIL, with the error in the detail, and the next step still runs. A shared input that cannot be
// computed (input()) becomes a value that throws on first use and names itself, so every step that reads it fails on its own
// row. Any such error makes the verdict NOT PROVABLY FAIR (exit 1). An exception outside every step still prints every row,
// each check it left unscored as FAIL, and exits 1.
const RUN_ERRORS: string[] = [];
const TAINT = new Map<string, string>();
const errText = (e: unknown): string => { const x = e as { code?: string; name?: string; message?: string } | null; return `${x?.code ?? x?.name ?? 'Error'}: ${String(x?.message ?? e).split('\n')[0]}`; };
function step(ids: string[], fn: () => void): void {
  try { fn(); } catch (e) {
    const why = errText(e); RUN_ERRORS.push(`${ids.join(', ') || 'a shared computation'}: ${why}`);
    for (const id of ids) if (!TAINT.has(id)) TAINT.set(id, why);
  }
}
function input<T>(name: string, fn: () => T, ...fallback: [T?]): T {
  try { return fn(); } catch (e) {
    const why = errText(e); RUN_ERRORS.push(`input ${name}: ${why}`);
    // a boolean condition that cannot be computed is false (it fails the check it feeds); any other input is poisoned
    if (fallback.length) return fallback[0] as T;
    const poison = (): never => { throw new Error(`input ${name} could not be computed (${why})`); };
    return new Proxy(function () {}, { get: poison, apply: poison, construct: poison, has: poison, ownKeys: poison, getOwnPropertyDescriptor: poison }) as unknown as T;
  }
}
function failRow(id: string, detail: string): void {
  const r = rows.find((x) => x.id === id);
  if (r) { const was = `${r.status}: ${r.detail}`; r.status = 'FAIL'; delete r.origin; r.detail = `${detail} (recorded before the error: ${was})`; }
  else { const p = prof(id); rows.push({ id, name: p.name, policy: p.policy, status: 'FAIL', detail }); }
}
/** Called first in finish(): every check whose step threw becomes FAIL. */
function applyTaint(): void {
  for (const [id, why] of TAINT) failRow(id, `NOT SCORED, the step threw ${why} (an input it reads is missing or malformed); scored FAIL, never skipped`);
  TAINT.clear();
}
/** A release-gate record (outputs/fresh-copy.json, outputs/mutation-results.json) that is missing, not pinned, or not the
 *  bytes RELEASE-MANIFEST.json pins for it: its check is FAIL, and the verdict fails (extraFails). A record that matches its
 *  pin but reports a shortfall stays a GAP. */
function pinFail(id: string, why: string): void {
  const d = `FAIL: the release-gate record is not the one RELEASE-MANIFEST.json pins (${why}); a deleted or edited record fails the verdict`;
  const r = rows.find((x) => x.id === id);
  if (r) { r.status = 'FAIL'; delete r.origin; r.detail = `${d}; ${r.detail}`; }
  else { const p = prof(id); rows.push({ id, name: p.name, policy: p.policy, status: 'FAIL', detail: d }); }
}
/** Verdict-bearing failures outside the scored HARD_FAIL / FLAG rows: a FAIL on a package check (a release-gate record that
 *  is missing or differs from its RELEASE-MANIFEST.json pin) and any run error. */
const extraFails = (): number => rows.filter((r) => r.status === 'FAIL' && r.policy !== 'HARD_FAIL' && r.policy !== 'FLAG').length + RUN_ERRORS.length;
process.on('uncaughtException', (e) => {
  try {
    const why = errText(e); RUN_ERRORS.push(`the run stopped outside any step: ${why}`);
    for (const c of PROFILE) if (!rows.some((r) => r.id === c.id) && !TAINT.has(c.id)) TAINT.set(c.id, `${why}; the run stopped before this check`);
    finish();
  } catch (e2) { console.log(`VERDICT: NOT PROVABLY FAIR — the verifier stopped: ${errText(e)}; ${errText(e2)}`); }
  process.exit(1);
});
/** the profile binding. EXPECTED_STEPS comes from the vendored framework profile (profile/profile.json, sha256 ==
 *  PROFILE_SHA256), not from src/profile-map.ts; a missing, relabelled or altered row withholds the verdict (INCOMPLETE). */
const BIND = bindProfile();
const prof = (id: string) => { const p = PROFILE.find((c) => c.id === id) ?? BIND.checks.find((c) => c.id === id); if (!p) throw new Error(`no profile check ${id}`); return p; };
/** Record a check by its profile policy. `ok` false → FAIL / FLAG / GAP; INFORMATIONAL is always INFO. */
function record(id: string, ok: boolean, detail: string, origin: 'operator' | 'capture' = 'operator') {
  const p = prof(id); let status: Status;
  if (p.policy === 'INFORMATIONAL') status = 'INFO';
  else if (p.policy === 'HARD_FAIL') status = ok ? 'PASS' : 'FAIL';
  else if (p.policy === 'FLAG') status = ok ? 'PASS' : 'FLAG';
  else status = ok ? 'PASS' : 'GAP';
  rows.push({ id, name: p.name, policy: p.policy, status, ...(status === 'FLAG' ? { origin } : {}), detail });
}
/** RTP-CLAIM 1.2.0 (Methodology v1.1; src/rtp-claim-switch.ts ON): the -19 status. `ok` carries the step's own
 *  conditions besides the rule (the exact derivation, the claim read from the exhibits): if one fails, the profile's policy
 *  applies as before. With those clean the rule decides: PASS, or OVERSTATED for a house-side miss of the published figure
 *  (verdict RTP FIGURE OVERSTATED, exit 5 — never NOT PROVABLY FAIR, the draws are checked by the other steps). A committed
 *  RTP table that does not equal this run's is a reproduction failure: FAIL, whatever the rule says. */
function recordRtpClaim(id: string, ok: boolean, gate: { status: 'INFO' | 'PASS' | 'OVERSTATED' | 'FAIL'; tableMatches: boolean }, detail: string) {
  const p = prof(id);
  if (!gate.tableMatches || gate.status === 'FAIL') { rows.push({ id, name: p.name, policy: p.policy, status: 'FAIL', detail }); return; }
  if (!ok) { record(id, false, detail); return; }
  rows.push({ id, name: p.name, policy: p.policy, status: gate.status, detail });
}
/** A HARD_FAIL / FLAG check whose only shortfall is an auditor-side capture gap: a capture-origin FLAG (verdict-neutral). */
const captureFlag = (id: string, detail: string) => { const p = prof(id); rows.push({ id, name: p.name, policy: p.policy, status: 'FLAG', origin: 'capture', detail }); };
const pct = (a: number, b: number) => `${a}/${b}`;
/** the scored checks of the profile (HARD_FAIL + FLAG). finish() compares the checks that have a status from THIS run
 *  with this list; any one missing (deleted or skipped) withholds the verdict: INCOMPLETE, exit 3. */
const EXPECTED_STEPS: readonly string[] = BIND.scored;
const t0 = Date.now();

// ═══ COINFLIP-26 dataset & config pins — before anything reads the data ═══
const dataPins: [string, string][] = [[PRIMARY_FILE, PRIMARY_SHA256], [TAIL_FILE, TAIL_SHA256], [AS_CAPTURED_FILE, AS_CAPTURED_SHA256],
  [PHASE_C_FILE, PHASE_C_SHA256], [PHASE_C10_FILE, PHASE_C10_SHA256], [PHASE_D_FILE, PHASE_D_SHA256]];
const pinBad = [...dataPins, ...EVIDENCE_PINS].filter(([f, h]) => sha256File(f) !== h);
if (pinBad.length) { record('COINFLIP-26', false, `mismatch: ${pinBad.map(([f]) => f).join(', ')} — abort before any step`); finish(); process.exit(1); }

const ds = input('ds', () => (load(PRIMARY_FILE))), tail = input('tail', () => (load(TAIL_FILE))), pC = input('pC', () => (load(PHASE_C_FILE))), pC10 = input('pC10', () => (load(PHASE_C10_FILE))), pD = input('pD', () => (load(PHASE_D_FILE)));
const ALL = input('ALL', () => ([ds, tail, pC, pC10, pD]));
const asText = input('asText', () => (readFileSync(join(ROOT, 'data', AS_CAPTURED_FILE), 'utf8')));
const asCaptured = input('asCaptured', () => (JSON.parse(asText) as Dataset & { meta: any }));
// the audit account's user id is redacted in every shipped dataset (data/REDACTION.txt, scripts/redact-user-id.mjs)
step(['COINFLIP-26'], () => {
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';
  const uid = { redacted: 0, nil: 0, other: 0 };
  const walkUid = (o: any): void => {
    if (Array.isArray(o)) { for (const v of o) walkUid(v); return; }
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) { if (k === 'userId') { if (v === 'redacted') uid.redacted++; else if (v === NIL_UUID) uid.nil++; else uid.other++; } walkUid(v); }
  };
  const shipped: any[] = [ds, tail, pC, pC10, pD, asCaptured];
  for (const d of shipped) walkUid(d);
  const perBet = shipped.every((d) => d.bets.every((b: any) => b._raw?.game?.userId === 'redacted'));
  // every src/ constant that stands for an exhibit figure equals the value parsed from the pinned exhibit
  const bind = exhibitBinding(asCaptured.meta?.preflight);
  const bad = bind.filter((r) => !r.ok);
  const per = (e: string) => `${e} ${bind.filter((r) => r.exhibit === e && r.ok).length}/${bind.filter((r) => r.exhibit === e).length}`;
  record('COINFLIP-26', uid.other === 0 && perBet && bad.length === 0, `${dataPins.length} datasets + ${EVIDENCE_PINS.length} evidence exhibits match their sha256 pinned in src/loader.ts; the audit account's user id is redacted in the shipped datasets (data/REDACTION.txt): userId values "redacted" ${uid.redacted}, nil UUID ${uid.nil}, any other value ${uid.other}; every bet's _raw.game.userId == "redacted": ${perBet}; config pins: the src/ constants that stand for exhibit figures == the values parsed from the pinned exhibits ${bind.length - bad.length}/${bind.length} (${per('E01')}: derivation fields, side and draw rules, flip / target / coin ranges, the four tables, vectors, house edge, the coefficient of each formula string, == the captured preflight answer; ${per('E02')}: bundle constants; ${per('E03')}: minimum stake, maximum win, wallet decimals, == the captured preflight answer)${bad.length ? ' — DIFFER: ' + bad.map((r) => `${r.exhibit} ${r.what}: exhibit ${r.exhibitValue.slice(0, 80)} code ${r.codeValue.slice(0, 80)}`).join('; ') : ''}`);
});
const seedOf = (d: Dataset, e: number) => d.seeds.find((s) => Number(s.epoch) === e);
const e1 = input('e1', () => (readJson('evidence/E01-coinflip-fairness-spec-2026-10-12.json').answer.body));

/** The per-round recompute core: flips, match count, win rule, multiplier (formula and published table), payout, echoes. */
function recompute(d: Dataset) {
  const c = { n: 0, flips: 0, matched: 0, servedMatched: 0, legal: 0, echo: 0, win: 0, mult: 0, table: 0, tableN: 0, winners: 0, loserZero: 0, losers: 0, pay: 0, copies: 0, seedLink: 0,
    answerDraw: 0, answerPay: 0, offGrid: 0, bad: [] as string[] };
  for (const b of d.bets) {
    c.n++;
    const s = seedOf(d, b.epoch);
    if (!s) { c.bad.push(`bet ${b.idx}: no seed for epoch ${b.epoch}`); continue; }
    const st = b.setting;
    if (b.respClientSeed === s.clientSeed && b.respHashedSeed === s.hashedServerSeed) c.seedLink++; else c.bad.push(`bet ${b.idx}: answer seeds differ from epoch ${b.epoch}`);
    // the server's raw answer (_raw.game, _raw.game.game) against every copied field the recompute uses
    const ga: any = (b as any)._raw?.game, gga: any = ga?.game;
    if (ga && gga && ga.flips === b.outcome && ga.matched === b.matched && ga.calls === b.echoedCalls && ga.flipCount === b.flipCount && ga.mode === b.mode && ga.coins === b.coins && ga.target === b.echoedTarget
      && gga.nonce === b.nonce && gga.clientSeed === b.respClientSeed && gga.hashedSeed === b.respHashedSeed && String(ga.seedId) === String(s.seedId) && gga.seedId === ga.seedId) c.answerDraw++;
    else c.bad.push(`bet ${b.idx}: the server's answer (flips, matched, calls, mode, coins, target, nonce, seeds) != the copy`);
    const ra: any = b._raw?.round;
    const grid = [b.stake, b.payout, b.payoutMultiplier, b.roundStake, ra?.stake, ra?.payout, gga?.amount, gga?.payout, gga?.payoutMultiplier].every(onGrid8);
    if (!grid) { c.offGrid++; c.bad.push(`bet ${b.idx}: a money value off the 1e-8 grid`); }
    if (gga && grid && u8(gga.amount) === u8(b.stake) && u8(gga.payout) === u8(b.payout) && u8(gga.payoutMultiplier) === u8(b.payoutMultiplier) && gga.roundId === b.roundId && ga.gameId === b.roundId) c.answerPay++;
    else c.bad.push(`bet ${b.idx}: the server's answer (stake, payout, multiplier, round id) != the copy`);
    const fl = flips(s.revealedServerSeed, s.clientSeed, b.nonce, flipsNeeded(st));
    if (fl === b.outcome) c.flips++; else c.bad.push(`bet ${b.idx} ${st.cls}: flips ${fl} served ${b.outcome}`);
    if (legal(st)) c.legal++; else c.bad.push(`bet ${b.idx}: illegal setting ${st.cls}`);
    // the request as sent and the answer's echo of it
    const q = b.request;
    const echoMode = st.kind === 'coins' ? q.mode === 'multi' && q.coins === st.coins && b.mode === 'multi' && b.coins === st.coins && q.target === undefined
      : st.kind === 'target' ? q.target === st.t && b.echoedTarget === st.t && q.mode === undefined && q.coins === undefined
      : q.target === undefined && q.mode === undefined && q.coins === undefined && b.echoedTarget === st.n;
    if (q.calls === st.calls && String(b.echoedCalls).toUpperCase() === st.calls && echoMode) c.echo++; else c.bad.push(`bet ${b.idx}: request/echo differs from setting ${st.cls}`);
    const m = matchedOf(st, fl);
    c.matched++;
    if (b.matched === m) c.servedMatched++; else c.bad.push(`bet ${b.idx}: served matched ${b.matched}, recomputed ${m}`);
    const m4 = mult4Of(st, m);
    if ((m4 > 0n) === (b.payoutMultiplier > 0)) c.win++; else c.bad.push(`bet ${b.idx}: win ${m4 > 0n} served multiplier ${b.payoutMultiplier}`);
    if (m4 > 0n) { c.winners++; if (multiplier8(m4) === u8(b.payoutMultiplier)) c.mult++; else c.bad.push(`bet ${b.idx}: multiplier ${b.payoutMultiplier} want ${m4}e-4`); }
    else { c.losers++; if (u8(b.payoutMultiplier) === 0n) c.loserZero++; }
    // the published table cell for the setting (target game: multiplierTable; coins × flips at F = 1: multiTable)
    if (st.kind !== 'coins') { c.tableN++; if (units4(MULTIPLIER_TABLE[st.n - 1][targetOf(st) - 1]) === mult4Target(st.n, targetOf(st))) c.table++; }
    else if (st.n === 1) { c.tableN++; if (units4(MULTI_TABLE[(st.coins as number) - 2][m]) === m4) c.table++; }
    const st8 = u8(b.stake), py8 = u8(b.payout);
    if (grid && st8 !== null && py8 !== null && py8 === payout8(st8, m4)) c.pay++; else c.bad.push(`bet ${b.idx}: payout ${b.payout} want ${st8 === null ? '?' : payout8(st8, m4)}e-8`);
    const r = b._raw?.round, g = b._raw?.game;
    if (r && grid && u8(r.stake) === u8(b.roundStake) && u8(r.stake) === st8 && u8(r.payout) === py8 && r.roundId === b.roundId && g?.flips === b.outcome && g?.matched === b.matched) c.copies++;
    else c.bad.push(`bet ${b.idx}: copy != server answer`);
  }
  return c;
}

// ═══ COINFLIP-05 population & epoch size (G-BIND) + the split re-run from the captured file (as-captured, user id redacted) ═══
step(['COINFLIP-05'], () => {
  const perEpoch = new Map<number, number>();
  for (const b of ds.bets) perEpoch.set(b.epoch, (perEpoch.get(b.epoch) || 0) + 1);
  const sizesOk = [...perEpoch.values()].every((n) => n === EXPECTED_EPOCH_SIZE);
  let splitOk = false, splitDetail = '';
  try {
    const r = splitWholeEpochs(asText, AS_CAPTURED_FILE.split('/').pop()!, 'coinflip');
    splitOk = r.primaryText === readFileSync(join(ROOT, 'data', PRIMARY_FILE), 'utf8') && r.tailText === readFileSync(join(ROOT, 'data', TAIL_FILE), 'utf8');
    splitDetail = splitOk ? 'the split re-run from the captured file (the as-captured file with the user id redacted, data/REDACTION.txt) reproduces both files byte for byte' : 'the split re-run does NOT reproduce the files';
  } catch (e: any) { splitDetail = `split re-run failed: ${e.message}`; }
  const counts = { C: pC.bets.length, C10: pC10.bets.length, D: pD.bets.length };
  const ok = ds.bets.length === EXPECTED_BETS && ds.seeds.length === EXPECTED_SEEDS && perEpoch.size === EXPECTED_EPOCHS && sizesOk
    && tail.bets.length === EXPECTED_TAIL_BETS && counts.C === EXPECTED_PHASE_C_BETS && counts.C10 === EXPECTED_PHASE_C10_BETS && counts.D === EXPECTED_PHASE_D_BETS && splitOk;
  // the capture's own clock (each bet's `at`), printed for the record, never used by a verdict step
  const span = (d: Dataset) => { const at = d.bets.map((b: any) => String(b.at)).sort(); return `${at[0]} … ${at[at.length - 1]}`; };
  record('COINFLIP-05', ok, `Phase A ${ds.bets.length} bets / ${ds.seeds.length} seeds / ${perEpoch.size} epochs, every epoch ${EXPECTED_EPOCH_SIZE}: ${sizesOk}; tail ${tail.bets.length} (own file, disclosed DL-1); the captured file ${asCaptured.bets.length} bets / ${asCaptured.seeds.length} seeds; supplementary C ${counts.C}, C $10 ${counts.C10}, D ${counts.D} — against src/loader.ts constants, never meta; ${splitDetail}; bets placed (the capture's clock, printed, not checked): Phase A ${span(ds)}, tail ${span(tail)}, C ${span(pC)}, C $10 ${span(pC10)}, D ${span(pD)}`);
});

// ═══ COINFLIP-01 seed hash integrity (every revealed seed of every dataset) ═══
step(['COINFLIP-01'], () => {
  const all = ALL.flatMap((d) => d.seeds);
  const ok = all.filter((s) => sha256Hex(s.revealedServerSeed) === s.hashedServerSeed).length;
  const primOk = ds.seeds.filter((s) => sha256Hex(s.revealedServerSeed) === s.hashedServerSeed).length;
  record('COINFLIP-01', ok === all.length && primOk === EXPECTED_SEEDS, `sha256(utf8(revealed)) == committed: ${pct(primOk, EXPECTED_SEEDS)} Phase A seeds, ${pct(ok, all.length)} across Phase A, tail, C, C $10 and D; 0 unverifiable bets`);
});

// ═══ COINFLIP-02 forward commitment chain, anchored before epoch 0 ═══
step(['COINFLIP-02'], () => {
  const chainOf = (d: Dataset) => { let n = 0; for (let i = 0; i + 1 < d.seeds.length; i++) if (d.seeds[i].hashedNextServerSeed === d.seeds[i + 1].hashedServerSeed) n++; return n; };
  const anchor = (d: any) => d.preCapture && d.preCapture.hashedNextServerSeed === d.seeds[0].hashedServerSeed;
  const prim = chainOf(ds), link = ds.seeds[ds.seeds.length - 1].hashedNextServerSeed === tail.seeds[0].hashedServerSeed;
  const post = asCaptured.meta.postCapture?.activePair;
  const end = !!post && tail.seeds[tail.seeds.length - 1].hashedNextServerSeed === (post.seed?.hashedServerSeed ?? post.hashedServerSeed);
  const sup = [pC, pC10, pD].map((d) => ({ n: chainOf(d), of: d.seeds.length - 1, anchor: anchor(d) }));
  const ok = prim === EXPECTED_SEEDS - 1 && anchor(ds) && link && end && sup.every((s) => s.n === s.of && s.anchor);
  record('COINFLIP-02', ok, `Phase A ${pct(prim, EXPECTED_SEEDS - 1)} links, pre-capture anchor ${anchor(ds)}, Phase A → tail link ${link}, tail → pair active after the capture ${end}; C ${sup[0].n}/${sup[0].of} anchor ${sup[0].anchor}, C $10 ${sup[1].n}/${sup[1].of} anchor ${sup[1].anchor}, D ${sup[2].n}/${sup[2].of} anchor ${sup[2].anchor}`);
});

// ═══ COINFLIP-03 hash consistency within epoch ═══
step(['COINFLIP-03'], () => {
  let ok = 0;
  for (const s of ds.seeds) { const bs = ds.bets.filter((b) => b.epoch === Number(s.epoch)); if (bs.every((b) => b.respHashedSeed === s.hashedServerSeed && b.respClientSeed === s.clientSeed)) ok++; }
  record('COINFLIP-03', ok === EXPECTED_EPOCHS, `${pct(ok, EXPECTED_EPOCHS)} epochs: every bet carries its epoch's server-seed hash and client seed in the server's answer`);
});

// ═══ COINFLIP-04 nonce continuity ═══
step(['COINFLIP-04'], () => {
  let ok = 0, ordered = 0; const bad: string[] = [];
  for (const s of ds.seeds) {
    const e = Number(s.epoch); const inEpoch = ds.bets.filter((b) => b.epoch === e);
    const ns = inEpoch.map((b) => b.nonce).sort((a, b) => a - b);
    // the nonces must also rise in the order the bets were placed (idx)
    const byIdx = [...inEpoch].sort((a, b) => a.idx - b.idx).map((b) => b.nonce);
    const inOrder = byIdx.every((n, i) => i === 0 || n > byIdx[i - 1]); if (inOrder) ordered++;
    if (ns.length === EXPECTED_EPOCH_SIZE && ns.every((n, i) => n === NONCE_BASE + i) && ns.length === Number(s.serverNonceAtRotation) && inOrder) ok++; else bad.push(String(e));
  }
  record('COINFLIP-04', ok === EXPECTED_EPOCHS, `${pct(ok, EXPECTED_EPOCHS)} epochs: nonces exactly ${NONCE_BASE}..${EXPECTED_EPOCH_SIZE}, once each (no gap or repeat), rising in the capture's placement order (idx) in ${pct(ordered, EXPECTED_EPOCHS)} epochs (no reorder), and N == the server's nonce read at rotation${bad.length ? `; bad epochs ${bad.join(',')}` : ''}`);
});

// ═══ COINFLIP-07 / 10 / 11 / 13 on Phase A (+ every supplementary set) ═══
const p = input('p', () => (recompute(ds)));
const supRec = input('supRec', () => ([tail, pC, pC10, pD].map(recompute)));
const sum = (k: keyof ReturnType<typeof recompute>) => supRec.reduce((a, c) => a + (c[k] as number), 0);
const kinds = (d: Dataset) => { const k: Record<string, number> = {}; for (const b of d.bets) k[b.setting.kind] = (k[b.setting.kind] || 0) + 1; return k; };
const kA = input('kA', () => (kinds(ds)));
step(['COINFLIP-07'], () => { record('COINFLIP-07', p.flips === p.n && p.seedLink === p.n && p.n === EXPECTED_BETS && sum('flips') === sum('n') && p.answerDraw === p.n && sum('answerDraw') === sum('n'),
  `flip sequence == the published derivation (E01: flip i = draw i of HMAC-SHA256(serverSeed, clientSeed:nonce:block), block floor(i/8), side = floor(u / 2^32 × 2), 0 = H; coins × flips coin j reads draws j·F … j·F+F−1), compared as strings: ${pct(p.flips, p.n)} Phase A (streak ${kA.streak}, target ${kA.target}, coins × flips ${kA.coins}), ${pct(sum('flips'), sum('n'))} tail + C + C $10 + D; answer seeds == epoch seeds ${pct(p.seedLink, p.n)}; the server's raw answer (flips, matched, calls, flip count, mode, coins, target, nonce, client seed, hashed seed, seed pair) == the copy the recompute uses: ${pct(p.answerDraw, p.n)} Phase A, ${pct(sum('answerDraw'), sum('n'))} tail + C + C $10 + D; coverage ${p.n} == expectedBets${p.bad.length ? ' — ' + p.bad.slice(0, 3).join('; ') : ''}`); });
step(['COINFLIP-10'], () => { record('COINFLIP-10', p.matched === p.n && p.servedMatched === p.n && p.win === p.n && p.legal === p.n && p.echo === p.n && sum('servedMatched') === sum('n') && sum('win') === sum('n') && sum('legal') === sum('n'),
  `calls landed (target game) / coins surviving all F flips (coins × flips) counted from the flips: the server's matched field equals the count on ${pct(p.servedMatched, p.n)} Phase A bets and ${pct(sum('servedMatched'), sum('n'))} supplementary (compared, never read); win rule per mode (target game: matched ≥ target; coins × flips: pays per survivor) == the served win/loss ${pct(p.win, p.n)} and ${pct(sum('win'), sum('n'))}; every setting legal (1 ≤ n ≤ 10, target ≥ minTargets[n], coins 2…10): ${pct(p.legal + sum('legal'), p.n + sum('n'))}; request as sent and answer echo (calls, target, mode, coins) == setting ${pct(p.echo, p.n)}`); });
step(['COINFLIP-13'], () => {
  // the published tables against the formulas, cell by cell (multiplierTable 48 legal cells + zeros below minTargets; multiTable 54 cells)
  let cells = 0, cellOk = 0;
  for (let n = MIN_FLIPS; n <= MAX_FLIPS; n++) for (let t = 1; t <= n; t++) { cells++; const want = t >= MIN_TARGETS[n - 1] ? mult4Target(n, t) : 0n; if (units4(MULTIPLIER_TABLE[n - 1][t - 1]) === want && units4(e1.multiplierTable[n - 1][t - 1]) === want) cellOk++; }
  let mcells = 0, mOk = 0;
  for (let n = MIN_COINS; n <= MAX_COINS; n++) for (let h = 0; h <= n; h++) { mcells++; if (units4(MULTI_TABLE[n - 2][h]) === mult4Multi(n, h) && units4(e1.multiTable[n - 2][h]) === mult4Multi(n, h) && mult4Multi(n, h) === mult4Coins(n, 1, h)) mOk++; }
  // the operator's winChance field: the probability that the round pays more than the stake, from the setting's exact law
  // (target game: every win pays more than 1×, so it is S(n,t)/2^n; coins × flips: the profit chance, E01 multiProfitChance's
  // meaning — a round with too few survivors pays back only part of the stake, E02 rulesCxf5), compared, never used
  let wc = 0, wn = 0;
  for (const d of ALL) for (const b of d.bets) { wn++; const l = lawOf(b.setting), w = b._raw?.game?.winChance;
    const exact = Number(l.levels.filter((x) => x.mult4 > 10000n).reduce((a, x) => a + x.w, 0n)) / Number(1n << BigInt(l.bits));
    if (typeof w === 'number' && Math.abs(w - exact) <= 1e-12) wc++; }
  const ok = p.mult === p.winners && sum('mult') === sum('winners') && p.loserZero === p.losers && p.table === p.tableN && sum('table') === sum('tableN') && cellOk === cells && mOk === mcells && wc === wn;
  record('COINFLIP-13', ok, `multiplier paid == the published formula (E01: target game floor4(0.99·2^n/S(n,t)); coins × flips floor4(0.99·2^F·h/C); multi toss floor4(1.98·h/n)), compared at 1e-4: ${pct(p.mult, p.winners)} Phase A winners, ${pct(sum('mult'), sum('winners'))} supplementary winners; losers served 0 ${pct(p.loserZero, p.losers)}; each bet's published table cell (multiplierTable, or multiTable for coins at F = 1) == formula ${pct(p.table + sum('table'), p.tableN + sum('tableN'))}; the E01 tables themselves: multiplierTable ${pct(cellOk, cells)} cells (zeros below minTargets), multiTable ${pct(mOk, mcells)} cells, and multi toss == coins × flips at F = 1 on every cell; the edge is ${(1 - e1.houseEdge).toFixed(2)} × fair odds floored to 4 decimals (E01 houseEdge ${e1.houseEdge}, read from the exhibit; E01's three formula coefficients == the code's, COINFLIP-26); the operator's winChance field equals the exact probability that the round pays more than the stake on ${pct(wc, wn)} bets (compared, never used)`);
});
step(['COINFLIP-11'], () => { record('COINFLIP-11', p.pay === p.n && p.copies === p.n && sum('pay') === sum('n') && sum('copies') === sum('n') && p.answerPay === p.n && sum('answerPay') === sum('n'),
  `payout == floor(stake × multiplier) at 1e-8, 0 on a loss, every money value on the 1e-8 grid as served: ${pct(p.pay, p.n)} Phase A, ${pct(sum('pay'), sum('n'))} tail/C/D; capture copy == the server's own round record (round id, stake, payout, flips, matched) ${pct(p.copies, p.n)} Phase A, ${pct(sum('copies'), sum('n'))} tail/C/D; the server's raw answer (stake, payout, multiplier, round id) == the copy ${pct(p.answerPay, p.n)} Phase A, ${pct(sum('answerPay'), sum('n'))} tail/C/D; money values off the grid ${p.offGrid + sum('offGrid')}${p.bad.length ? ' — ' + p.bad.slice(0, 3).join('; ') : ''}`); });

// ═══ COINFLIP-08 draw bias bound: the side rule over the whole 32-bit draw domain ═══
step(['COINFLIP-08'], () => {
  // the first draw that gives T, by bisection (the declared rule is a step in u); then the step is confirmed at both edges of
  // every 2^16-wide stratum of the domain and at every draw within 2^15 of the step
  let lo = 0, hi = TWO32; while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (sideOf(mid) === 1) hi = mid; else lo = mid + 1; }
  const b = lo; let strata = 0, strataOk = 0;
  for (let k = 0; k < 65536; k++) { const u0 = k * 65536, u1 = u0 + 65535; strata++; if (sideOf(u0) === (u0 >= b ? 1 : 0) && sideOf(u1) === (u1 >= b ? 1 : 0)) strataOk++; }
  let near = 0; for (let u = b - 32768; u < b + 32768; u++) if (u >= 0 && u < TWO32 && sideOf(u) === (u >= b ? 1 : 0)) near++;
  const heads = b, tails = TWO32 - b, bias = Math.abs(heads - TWO32 / 2) / TWO32;
  const specOk = e1.drawBits === 32 && e1.sideRule === SIDE_RULE_TEXT;
  record('COINFLIP-08', specOk && bias === 0 && strataOk === strata && near === 65536,
    `the draw u is a full 32-bit value (E01 drawBits ${e1.drawBits}, no range reduction); the side rule "${e1.sideRule}" is a single step at u = ${b} (= 2^31: ${b === 2 ** 31}), confirmed at both edges of all ${strata} strata of 2^16 draws (${pct(strataOk, strata)}) and at every draw within 2^15 of the step (${near}/65536); H on ${heads.toLocaleString('en')} draws, T on ${tails.toLocaleString('en')}: bias ${bias} — exactly 1/2 by construction (the top bit of a uniform 32-bit draw)`);
});

// ═══ COINFLIP-09 RNG reference vectors (E01 published examples: draws and flips) ═══
step(['COINFLIP-09'], () => {
  const v = SPEC_VECTORS.filter((x) => draws(x.serverSeed, x.clientSeed, x.nonce, 10).every((u, i) => u === x.draws[i]) && flips(x.serverSeed, x.clientSeed, x.nonce, 10) === x.flips).length;
  const specSame = JSON.stringify(e1.vectors) === JSON.stringify(SPEC_VECTORS);
  const b = ds.bets.find((x) => x.setting.kind === 'coins' && x.payoutMultiplier > 0)!; const s = seedOf(ds, b.epoch)!;
  const fl = flips(s.revealedServerSeed, s.clientSeed, b.nonce, flipsNeeded(b.setting));
  const capOk = fl === b.outcome && u8(b.payout) === payout8(units8(b.stake), mult4Of(b.setting, matchedOf(b.setting, fl)));
  record('COINFLIP-09', v === SPEC_VECTORS.length && specSame && capOk, `the ${SPEC_VECTORS.length} worked examples of HouseBets' published spec (E01: ten draws and ten flips each) ${pct(v, SPEC_VECTORS.length)}, src/spec.ts == E01 vectors ${specSame}; the first captured coins × flips winner (bet idx ${b.idx}, ${b.setting.cls}, ${b.outcome.length} flips, matched ${b.matched}, payout ${b.payout}) recomputes: ${capOk}; also tests/rng.test.ts`);
});

// ═══ COINFLIP-06 client-seed influence, Phase D recomputation, empty-seed control, client-seed generator ═══
step(['COINFLIP-06'], () => {
  // a wrong client seed: each flip should change with probability 1/2, independently
  const flipRate = (d: Dataset, other: (b: Bet) => string | undefined) => { let diff = 0, tot = 0;
    for (const b of d.bets) { const s = seedOf(d, b.epoch)!; const c = other(b); if (c === undefined) continue; const k = flipsNeeded(b.setting); const f2 = flips(s.revealedServerSeed, c, b.nonce, k);
      for (let i = 0; i < k; i++) { tot++; if (f2[i] !== b.outcome[i]) diff++; } }
    return { diff, tot, z: (diff - tot / 2) / Math.sqrt(tot / 4) }; };
  const w = flipRate(ds, (b) => seedOf(ds, b.epoch)!.clientSeed + '#wrong');
  const d = recompute(pD);
  const seedsInOrder = pD.seeds.map((s) => s.clientSeed);
  const playerSet = PHASE_D_SEEDS.every((x, i) => seedsInOrder[i] === x) && new Set(seedsInOrder).size >= 2;
  const prevSeed = (b: Bet) => (b.epoch === 0 ? (pD as any).preCapture?.clientSeed : seedOf(pD, b.epoch - 1)!.clientSeed);
  const dw = flipRate(pD, prevSeed);   // rule 23b: under the previous epoch's client seed the same nonces give other flips
  const gen = [ds, tail, pC, pC10].flatMap((x) => x.seeds).map((s) => s.clientSeedSource);
  const csprng = gen.every((g) => g === 'node:crypto randomBytes(16) hex');
  const esc = readJson('evidence/E06-coinflip-empty-seed-control-2026-10-13.json').record;
  const ok = w.diff > 0 && Math.abs(w.z) <= 5 && d.flips === d.n && d.pay === d.n && d.answerDraw === d.n && d.answerPay === d.n && playerSet && dw.diff > 0 && Math.abs(dw.z) <= 5 && csprng && esc.status === 400;
  record('COINFLIP-06', ok, `a wrong client seed changes ${pct(w.diff, w.tot)} Phase A flips (${(100 * w.diff / w.tot).toFixed(2)} %, model 50 %, z ${w.z.toFixed(2)}, |z| ≤ 5); Phase D: player-set seeds ${JSON.stringify(seedsInOrder)} (predictable, disclosed DL-2, all 4 epochs exposed), ${pct(d.flips, d.n)} flip sequences and ${pct(d.pay, d.n)} payouts recompute, server answer == copy ${pct(Math.min(d.answerDraw, d.answerPay), d.n)}, ${pct(dw.diff, dw.tot)} flips change vs the previous client seed (z ${dw.z.toFixed(2)}); phases A–C: the capture rig's client-seed source label reads "node:crypto randomBytes(16) hex" (a CSPRNG) on ${pct(gen.filter((g) => g === 'node:crypto randomBytes(16) hex').length, gen.length)} seeds (a label check: the code that ran is not re-executed here); empty-seed control: one request, answered HTTP ${esc.status} with a generic error (E06), nothing read afterwards`);
});

// ═══ COINFLIP-12 bet-size invariance (Phase C at 100 × minimum, and the $10 set) ═══
step(['COINFLIP-12'], () => {
  const chk = (d: Dataset, stake: string, setOk: (b: Bet) => boolean) => {
    const c = recompute(d); const stakeOk = d.bets.every((b) => u8(b.stake) === units8(stake) && u8(b._raw?.round?.stake) === units8(stake));
    const settingOk = d.bets.every(setOk);
    return { c, stakeOk, settingOk, ok: c.flips === c.n && c.win === c.n && c.mult === c.winners && c.pay === c.n && c.copies === c.n && c.answerDraw === c.n && c.answerPay === c.n && stakeOk && settingOk && c.winners >= 100 };
  };
  const a = chk(pC, PHASE_C_STAKE, (b) => b.setting.kind === 'streak' && b.setting.n === 1 && /^[HT]$/.test(b.request.calls) && b.request.target === undefined && b.request.mode === undefined && b.request.coins === undefined);
  const c = chk(pC10, PHASE_C10_STAKE, (b) => b.setting.kind === 'target' && b.setting.n === 3 && b.setting.t === 1 && /^[HT]{3}$/.test(b.request.calls) && b.request.target === 1 && b.request.mode === undefined && b.request.coins === undefined);
  const e3Min = publishedLimits().minBet;   // read from E03, not src/spec.ts
  const minOk = u8(e3Min) !== null && units8(PHASE_C_STAKE) === 100n * u8(e3Min)!;
  record('COINFLIP-12', a.ok && c.ok && minOk, `Phase C ${pC.bets.length} single flips (streak n = 1, win chance 1/2) at ${PHASE_C_STAKE} (= 100 × the E03 minimum ${e3Min}, read from the exhibit: ${minOk}): flips ${pct(a.c.flips, a.c.n)}, multipliers ${pct(a.c.mult, a.c.winners)}, payouts ${pct(a.c.pay, a.c.n)}, stake as sent and settled ${a.stakeOk}, setting as sent ${a.settingOk}, server answer == copy ${pct(Math.min(a.c.answerDraw, a.c.answerPay), a.c.n)}, ${a.c.winners} elevated wins (≥ 100); $10 set ${pC10.bets.length} bets of 3 calls with target 1 (win chance 7/8) at ${PHASE_C10_STAKE}: flips ${pct(c.c.flips, c.c.n)}, multipliers ${pct(c.c.mult, c.c.winners)}, payouts ${pct(c.c.pay, c.c.n)}, stake ${c.stakeOk}, setting ${c.settingOk}, server answer == copy ${pct(Math.min(c.c.answerDraw, c.c.answerPay), c.c.n)}, ${c.c.winners} wins (≥ 100); same flips, win rule and payout rule as base stake`);
});

// ═══ COINFLIP-14 multiplier monotonicity & bounds ═══
step(['COINFLIP-14'], () => {
  let mono = 0, monoN = 0, minT = 0;
  for (let n = MIN_FLIPS; n <= MAX_FLIPS; n++) {
    for (let t = MIN_TARGETS[n - 1] + 1; t <= n; t++) { monoN++; if (mult4Target(n, t) > mult4Target(n, t - 1)) mono++; }
    const m = MIN_TARGETS[n - 1];
    const capOk = 100n * S(n, m) <= BigInt(MAX_WIN_CHANCE_PCT) * (1n << BigInt(n)) && (m === 1 || 100n * S(n, m - 1) > BigInt(MAX_WIN_CHANCE_PCT) * (1n << BigInt(n)));
    if (capOk && e1.minTargets[n - 1] === m) minT++;
  }
  const maxM4 = allLaws().reduce((mx, l) => l.levels.reduce((a, x) => (x.mult4 > a ? x.mult4 : a), mx), 0n);
  const lim = publishedLimits();   // E03's wallet limits, read from the exhibit
  const maxWin8 = u8(lim.maxWin) ?? -1n, minBet8 = u8(lim.minBet) ?? -1n;
  const atMin = payout8(minBet8, maxM4), capOk = maxWin8 > 0n && atMin <= maxWin8;
  // the cap is on the win above the stake (E08 rulesMaxWinCap, quoted in the detail): the smallest stake (1e-8 units) whose
  // payout at the largest multiplier, less the stake, is above the max win
  let capStake8 = maxM4 > 10000n && maxWin8 > 0n ? (maxWin8 * 10000n) / (maxM4 - 10000n) : 0n;
  while (capStake8 > 0n && payout8(capStake8, maxM4) - capStake8 <= maxWin8) capStake8 += 1n;
  const capStake = Number(capStake8) / 1e8;
  const e8cap = String(readJson('evidence/E08-coinflip-rules-panel-live-2026-10-19.json').rulesPanelEnglish?.rulesMaxWinCap ?? 'NOT IN E08');
  const e2 = readJson('evidence/E02-coinflip-rules-panel-2026-10-10.json');
  // the max-win refusal is a branch the published rules declare; reachable within the bet limits when max bet × the
  // largest multiplier exceeds the max win; never produced by this capture. The profile's rule for COINFLIP-14 asks for the
  // multipliers to lie within the declared cap, not for the refusal to be witnessed, so the branch is declared, not flagged
  const reach8 = ((u8(lim.maxBet) ?? 0n) * maxM4) / 10000n, reachNet8 = reach8 - (u8(lim.maxBet) ?? 0n), reachable = reachNet8 > maxWin8;
  let maxPaid = 0n; for (const d of ALL) for (const b of d.bets) { const v = u8(b.payout); if (v !== null && v > maxPaid) maxPaid = v; }
  // a captured payout above the published maximum win is an operator-side finding (FLAG), never a pass
  const bounded = mono === monoN && minT === 10 && capOk && e1.maxWinChance * 100 === MAX_WIN_CHANCE_PCT && maxPaid <= maxWin8;
  (!bounded ? (id: string, d: string) => record(id, false, d + (maxPaid > maxWin8 ? ` — a captured payout (${(Number(maxPaid) / 1e8).toLocaleString('en', { maximumFractionDigits: 8 })} USDT) above the published maximum win: operator-origin FLAG` : '')) : reachable && maxPaid < maxWin8 ? (id: string, d: string) => record(id, true, d + `; declared unwitnessed (DL-3): max bet ${(Number(u8(lim.maxBet) ?? 0n) / 1e8).toLocaleString('en', { maximumFractionDigits: 8 })} USDT (E03 wallet) × ${Number(maxM4) / 1e4}× = ${(Number(reach8) / 1e8).toLocaleString('en', { maximumFractionDigits: 8 })}, ${(Number(reachNet8) / 1e8).toLocaleString('en', { maximumFractionDigits: 8 })} above the stake > the max win, so the refusal is reachable within the bet limits; the largest captured payout is ${(Number(maxPaid) / 1e8).toLocaleString('en', { maximumFractionDigits: 8 })} USDT, so the refusal branch was never produced`) : (id: string, d: string) => record(id, true, d))('COINFLIP-14',
    `within every n the target-game multiplier rises strictly as the target rises (win chance falls): ${pct(mono, monoN)} steps; the smallest legal target (E01 minTargets ${JSON.stringify(e1.minTargets)}) is the smallest t with S(n,t)/2^n ≤ ${MAX_WIN_CHANCE_PCT} % (E01 maxWinChance ${e1.maxWinChance}): ${pct(minT, 10)} n; the largest multiplier of any legal setting is ${Number(maxM4) / 1e4}× and pays ${Number(atMin) / 1e8} at the minimum stake, within the ${lim.maxWin} USDT maximum win (E03, read from the exhibit): ${capOk}; the largest captured payout is within it: ${maxPaid <= maxWin8}; the cap is on the win above the stake (E08 rulesMaxWinCap "${e8cap}"), and a stake of ${capStake.toFixed(8)} USDT or more at that multiplier would win more than the cap above the stake: the page's code blocks such a bet ("${e2.betSlipMessagesEnglish.blockOverMaxWin}") and has a message for the server refusing one ("${e2.betSlipMessagesEnglish.apiMaxWin}"), E02; no such bet was placed, so the server's answer was not witnessed (DL-3)`);
});

// ═══ COINFLIP-15 mode & setting coverage, against the capture plan in code ═══
step(['COINFLIP-15'], () => {
  const per: Record<string, number> = {}; for (const b of ds.bets) per[b.setting.cls] = (per[b.setting.cls] || 0) + 1;
  const plan = planClasses();
  const missing = plan.filter((c) => !per[c]), extra = Object.keys(per).filter((c) => !plan.includes(c));
  const under = plan.filter((c) => (per[c] || 0) < PLAN_CLASS_FLOOR);
  const counts = plan.map((c) => per[c] || 0);
  const multiF1 = plan.filter((c) => /^coins-c\d+-n1$/.test(c)).reduce((a, c) => a + (per[c] || 0), 0);
  const e7 = readJson('evidence/E07-coinflip-refused-settings-2026-10-12.json');
  const multiRefused = e7.multiTossOneCoin.rejected.length, multiRefusedAll = e7.multiTossOneCoin.rejected.every((r: any) => r.status === 400 && /multi toss takes 2 to 10 coins/.test(r.body?.error));
  const detail = `${plan.length} plan classes (src/loader.ts: every-flip streak n = 1…10, target game t < n at every legal t, coins × flips C = 2…10 × F = 1…10 — the whole declared grid): present ${pct(plan.length - missing.length, PLAN_CLASS_COUNT)}, unplanned ${extra.length}; modes: streak ${kA.streak}, target ${kA.target}, coins × flips ${kA.coins} bets, of which the multi toss law (coins at F = 1, one side, E02 rulesMulti1 "Pick a side and how many coins to toss, 2 to 10") ${multiF1}; Phase A bets per class ${Math.min(...counts)}–${Math.max(...counts)}, ${under.length} of ${plan.length} classes under the ${PLAN_CLASS_FLOOR} floor; the 1-coin multi toss request (one call per coin, coins 1) was refused by the server ${multiRefused}/${multiRefused} with "multi toss takes 2 to 10 coins" (${multiRefusedAll}) and is recorded as refused (E07)`;
  // coverage is the capture plan's (the auditor's): a missing, unplanned or short class is a capture-origin FLAG;
  // the one operator-side branch is a planned (declared-legal) setting the server refused with anything but the transient
  // "Transaction temporarily unavailable" (the capture's meta.rejected; the transient ones are DL-1)
  const rej: any[] = asCaptured.meta.rejected ?? [];
  const transient = rej.filter((r) => r.status === 400 && r.body?.error === 'Transaction temporarily unavailable').length;
  const refused = rej.length - transient;
  const sized = asCaptured.meta.planTruncated?.from;
  // the target game (t < n) is placed through the API; the rig labels a setting the game page's UI does not send
  // `apiOnly` (a label check of the capture's record, not of the page)
  const api = (d: Dataset) => { const tg = d.bets.filter((b) => b.setting.kind === 'target' && (b.setting.t as number) < b.setting.n); return `${tg.filter((b) => (b.setting as any).apiOnly === true).length}/${tg.length}`; };
  const refusal = `; target-game bets (t < n) the rig labels apiOnly (not sent by the game page's UI): Phase A ${api(ds)}, tail ${api(tail)}, D ${api(pD)}, $10 set ${api(pC10)} (the $10 set carries no such label); requests the server refused during Phase A: ${rej.length} (${transient} transient "Transaction temporarily unavailable", DL-1; ${refused} other); the plan was sized at ${sized} slots = ${plan.length} classes × ${sized / plan.length} before any trim (meta.planTruncated), i.e. under the ${PLAN_CLASS_FLOOR} floor by design, then trimmed to ${asCaptured.meta.planTruncated?.to} to fill whole epochs`;
  if (refused > 0) record('COINFLIP-15', false, detail + refusal + ' — the server refused a planned setting: operator-origin FLAG');
  else if (missing.length || extra.length || plan.length !== PLAN_CLASS_COUNT || !multiRefusedAll || under.length) captureFlag('COINFLIP-15', detail + refusal + ' — an auditor-side coverage shortfall (the capture plan, not the operator): capture-origin FLAG, disclosed DL-4, verdict-neutral');
  else record('COINFLIP-15', true, detail + refusal);
});

// ═══ COINFLIP-16 wallet / balance reconciliation (the platform's bet history, E04; the account reconciliation, E05 = the full
//      output of the workshop's reconcile-full.py). E05 is checked by its numbers, not by the shape of its lines. ═══
step(['COINFLIP-16'], () => {
  const e4 = readJson('evidence/E04-coinflip-bet-history-2026-10-13.json'); const led = new Map<string, any>(e4.rows.map((r: any) => [r.id, r]));
  let n = 0, ok = 0;
  for (const d of ALL) for (const b of d.bets) {
    n++; const x = led.get(b.roundId);
    if (x && u8(b.stake) !== null && u8(b.payout) !== null && u8(x.stake) === u8(b.stake) && u8(x.payout) === u8(b.payout) && x.game === 'housegames-coinflip' && x.status === (u8(b.payout)! > 0n ? 'won' : 'lost')) ok++;
  }
  const e5 = readFileSync(join(ROOT, 'evidence', 'E05-account-reconcile-2026-10-13.txt'), 'utf8');
  const D = '(-?\\d+(?:\\.\\d+)?)', S = '([+-]\\d+(?:\\.\\d+)?)';
  const rowRe = new RegExp(`^(\\S+\\.json)\\s+(\\d+)\\s+${D}\\s+${D}\\s+${S}$`, 'gm');
  const e5rows = [...e5.matchAll(rowRe)].map((m) => ({ f: m[1], k: Number(m[2]), st: u8(m[3]), pd: u8(m[4]), net: u8(m[5].replace(/^\+/, '')) }));
  const tot = new RegExp(`^TOTAL\\s+(\\d+)\\s+${D}\\s+${D}\\s+${S}$`, 'm').exec(e5);
  const totNet = tot ? tot[4].replace(/^\+/, '') : '0';
  const L = /^ledger: (\d+) entries = (\d+) captured rounds matched exactly \+ (\d+) open \+ (\d+) from 10 Oct; unexplained (\d+)$/m.exec(e5);
  const A = /^wallet cash balance after \(server, 8 dp\): (\d+\.\d{8})\s/m.exec(e5);
  const B = /^balance before = after - net (-?\d+\.\d+) \+ open stakes (\d+(?:\.\d+)?) = (\d+\.\d{8})$/m.exec(e5);
  const H = /--before (\d+\.\d{8})/.exec(e5.split('\n')[0] || '');
  const F = /^first answer of the day \S+: balance (\d+\.\d{4}) \(4 dp\) · last answer \S+: balance (\d+\.\d{4}) \(4 dp\)$/m.exec(e5);
  const rowsArith = e5rows.length > 0 && e5rows.every((r) => r.st !== null && r.pd !== null && r.net !== null && r.net === r.pd! - r.st!);
  const sum = (k: 'k' | 'st' | 'pd' | 'net') => e5rows.reduce((a, r) => a + BigInt(k === 'k' ? r.k : (r[k] as bigint) ?? 0n), 0n);
  const totOk = !!tot && BigInt(tot[1]) === sum('k') && u8(tot[2]) === sum('st') && u8(tot[3]) === sum('pd') && u8(totNet) === sum('net');
  const ledOk = !!L && !!tot && Number(L[2]) === Number(tot[1]) && Number(L[1]) === Number(L[2]) + Number(L[3]) + Number(L[4]) && Number(L[5]) === 0;
  const before8 = A && B && tot ? units8(A[1]) - units8(totNet) + units8(B[2]) : null;
  const balOk = !!A && !!B && !!H && !!tot && units8(B[1]) === units8(totNet) && before8 === units8(B[3]) && units8(B[3]) === units8(H[1]);
  const lastOk = !!F && !!A && Math.abs(Number(F[2]) - Number(A[1])) < 0.0001;
  const verdictLine = /^RECONCILED$/m.test(e5) && !/NOT RECONCILED/.test(e5);
  const asc = asCaptured as any as Dataset;
  const mine: [string, Dataset[]][] = [[E05_ROWS[0][0], [asc]], [E05_ROWS[1][0], [pC]], [E05_ROWS[2][0], [pD]], [E05_ROWS[3][0], [pC10]]];
  const mineN = mine.filter(([f, sets]) => {
    const r = e5rows.find((x) => x.f === f); let k = 0, st = 0n, pd = 0n, offGrid = 0;
    for (const d of sets) for (const b of d.bets) { k++; const s8 = u8(b._raw?.round?.stake), p8 = u8(b._raw?.round?.payout); if (s8 === null || p8 === null) offGrid++; else { st += s8; pd += p8; } }
    return !!r && offGrid === 0 && r.k === k && r.st === st && r.pd === pd && E05_ROWS.some(([ff, kk]) => ff === f && kk === k);
  }).length;
  const mineRounds = E05_ROWS.reduce((a, [, k]) => a + k, 0);
  const games = new Set(e5rows.map((r) => (r.f.match(/housebets-([a-z]+)/) || r.f.match(/\/(dice)-probe/) || [])[1]).filter(Boolean));
  const rec = rowsArith && totOk && ledOk && balOk && lastOk && verdictLine;
  record('COINFLIP-16', ok === n && e4.rows.length === n && rec && mineN === E05_ROWS.length && games.size === 11, `every coin flip round of the package is in the platform's bet history with the same stake, payout and won/lost status: ${pct(ok, n)} (E04, ${e4.rows.length} rows); E05 (the full reconcile-full.py output, ${e5rows.length} capture-file rows over ${games.size} games) checked by its numbers: every row's net == paid − staked ${rowsArith}; TOTAL == the sum of the rows (${tot ? tot[1] : '?'} rounds) ${totOk}; ledger entries ${L ? L[1] : '?'} == ${L ? L[2] : '?'} captured + ${L ? L[3] : '?'} open + ${L ? L[4] : '?'} from 10 Oct, captured == TOTAL rounds, 0 unexplained: ${ledOk}; this package's ${E05_ROWS.length} capture files (${mineRounds} rounds): rounds, staked and paid == the sums of the server's round records in the package's own datasets ${pct(mineN, E05_ROWS.length)}; balance before == wallet balance after ${A ? A[1] : '?'} − net ${tot ? tot[4] : '?'} + open stakes ${B ? B[2] : '?'} = ${before8 === null ? '?' : (Number(before8) / 1e8).toFixed(8)}, == the reconcile run's --before argument ${H ? H[1] : '?'}: ${balOk} (that argument is the figure the run was given; the page-header read it came from was not kept, disclosed DL-10); the last answer's 4-dp balance ${F ? F[2] : '?'} == the balance after to 4 dp: ${lastOk}; the exhibit ends RECONCILED: ${verdictLine}; the per-bet balance field is not used: 8 games were captured concurrently`);
});

// ═══ COINFLIP-17 call independence & declared modes ═══
step(['COINFLIP-17'], () => {
  const msgOk = e1.message === 'clientSeed:nonce:block' && e1.key === 'serverSeed';
  // witnessed on data: the flips recompute from (serverSeed, clientSeed, nonce) with the calls, target, mode and coins
  // excluded, for every bet of every mode; and two different call patterns in one epoch never share a flip prefix by design
  const byKind: Record<string, [number, number]> = {};
  for (const d of ALL) for (const b of d.bets) { const s = seedOf(d, b.epoch)!; const k = b.setting.kind; byKind[k] ??= [0, 0]; byKind[k][1]++;
    if (flips(s.revealedServerSeed, s.clientSeed, b.nonce, flipsNeeded(b.setting)) === b.outcome) byKind[k][0]++; }
  const full = Object.values(byKind).every(([a, n]) => a === n) && ['streak', 'target', 'coins'].every((k) => byKind[k]?.[1] > 0);
  record('COINFLIP-17', msgOk && full, `the declared RNG message is "${e1.message}" keyed with the ${e1.key} (E01): no call, target, mode or coin count enters it; witnessed on data — every bet recomputes with the calls excluded from the derivation: streak ${pct(...byKind.streak)}, target ${pct(...byKind.target)}, coins × flips ${pct(...byKind.coins)} (the multi toss law is coins × flips at F = 1, COINFLIP-15); the calls only decide which flips count as landed (COINFLIP-10)`);
});

// ═══ COINFLIP-18 anti-circularity: the win probability of every setting from exhaustive enumeration ═══
step(['COINFLIP-18'], () => {
  // target game: enumerate all 2^n landed / missed patterns of the n calls, count those with ≥ t landed
  let tOk = 0, tN = 0, wtOk = 0, wtN = 0;
  for (let n = MIN_FLIPS; n <= MAX_FLIPS; n++) {
    const byLanded = new Array(n + 1).fill(0); for (let mask = 0; mask < 2 ** n; mask++) { let c = 0, x = mask; while (x) { c += x & 1; x >>= 1; } byLanded[c]++; }
    for (let t = 1; t <= n; t++) { let w = 0; for (let i = t; i <= n; i++) w += byLanded[i];
      if (t >= MIN_TARGETS[n - 1]) { tN++; if (BigInt(w) === S(n, t)) tOk++; }
      wtN++; const want = t >= MIN_TARGETS[n - 1] ? w / 2 ** n : 0; if (WIN_CHANCE_TABLE[n - 1][t - 1] === want && e1.winChanceTable[n - 1][t - 1] === want) wtOk++; }
  }
  // multi toss: h landed of n coins by enumeration; the published multiProfitChance compared
  let mOk = 0, mpOk = 0;
  for (let n = MIN_COINS; n <= MAX_COINS; n++) {
    const byH = new Array(n + 1).fill(0); for (let mask = 0; mask < 2 ** n; mask++) { let c = 0, x = mask; while (x) { c += x & 1; x >>= 1; } byH[c]++; }
    if (byH.every((w, h) => BigInt(w) === choose(n, h))) mOk++;
    let prof = 0; for (let h = 0; h <= n; h++) if (mult4Multi(n, h) > 10000n) prof += byH[h];
    if (MULTI_PROFIT_CHANCE[n - 2] === prof / 2 ** n && e1.multiProfitChance[n - 2] === prof / 2 ** n) mpOk++;
  }
  // coins × flips: one coin survives on exactly 1 of its 2^F patterns (enumerated); h survivors of C by enumerating the 2^C
  // survive / miss patterns with weights 1 and 2^F − 1 — against the law the package uses (src/rules.ts lawCoins)
  let cOk = 0, cN = 0;
  for (let C = MIN_COINS; C <= MAX_COINS; C++) for (let F = MIN_FLIPS; F <= MAX_FLIPS; F++) {
    cN++; let surv = 0; const call = 0; for (let pat = 0; pat < 2 ** F; pat++) if (pat === call) surv++;
    const miss = BigInt(2 ** F - surv), byH = new Array<bigint>(C + 1).fill(0n);
    for (let mask = 0; mask < 2 ** C; mask++) { let h = 0, x = mask; while (x) { h += x & 1; x >>= 1; } byH[h] += BigInt(surv) ** BigInt(h) * miss ** BigInt(C - h); }
    const law = lawCoins(C, F); if (law.levels.every((x, h) => x.w === byH[h]) && byH.reduce((a, b) => a + b, 0n) === 1n << BigInt(F * C)) cOk++;
  }
  // negative controls: a corrupted flip is rejected by the recompute; a corrupted published win-chance cell is caught
  const copy = JSON.parse(JSON.stringify(ds)) as Dataset; const bb = copy.bets[0]; bb.outcome = (bb.outcome[0] === 'H' ? 'T' : 'H') + bb.outcome.slice(1);
  // the control must add exactly one mismatch to the unmodified recompute (p), whatever Phase A holds
  const neg = recompute(copy); const negFlip = neg.flips === p.flips - 1;
  const badTable = WIN_CHANCE_TABLE.map((r) => [...r]); badTable[4][2] = 0.5001; const negTable = badTable[4][2] !== Number(S(5, 3)) / 32;
  record('COINFLIP-18', tOk === tN && wtOk === wtN && mOk === 9 && mpOk === 9 && cOk === cN && negFlip && negTable,
    `target game: S(n,t) == the count of ≥ t landed among all 2^n call outcomes, enumerated, for every legal (n,t): ${pct(tOk, tN)}; E01 winChanceTable == enumeration ${pct(wtOk, wtN)} cells (compared, never used); multi toss: h landed of n == C(n,h) by enumeration ${pct(mOk, 9)}, E01 multiProfitChance == enumeration ${pct(mpOk, 9)}; coins × flips: survivor law by enumeration of each coin's 2^F patterns and the 2^C survive / miss patterns == the law the package uses ${pct(cOk, cN)}; no operator win-chance field is read; negative controls: one flipped side is rejected (${p.flips - neg.flips} mismatch added to the unmodified recompute), a corrupted win-chance cell is caught (${negTable})`);
});

// ═══ COINFLIP-19 effective RTP per setting vs claim (RTP-CLAIM 1.2.0, exact; enforced) ═══
// the claim is read from the exhibits at run time (src/exhibits.ts publishedClaim: every place
// it is published), never typed into src/. the verdict for any miss comes from the rule alone — COINFLIP-19
// has no other condition, so a miss on one setting or on all is OVERSTATED (exit 5), never an operator FLAG (exit 2); E01's
// secondary statements ("at most 99%", "exactly 99% where the multiplier is a short number") and the panel's per-setting figure
// are compared and printed beside it, never in place of the rule.
const claim = input('claim', () => (publishedClaim()));
let rtp: ReturnType<typeof computeRtpClaim> | null = null;
let gate: ReturnType<typeof runRtpClaimGate> = { status: 'FAIL', tableMatches: false, lines: [], result: null as any };
let rtpError = '';
step(['COINFLIP-19'], () => { try { rtp = computeRtpClaim(); gate = runRtpClaimGate(rtp); } catch (e: any) { rtpError = e.message; } });
step(['COINFLIP-19'], () => { if (!rtp) recordRtpClaim('COINFLIP-19', true, gate, `no claim could be read from the exhibits (${rtpError}): the table cannot be held to a published figure — FAIL`);
else {
  const toF = (s: string) => { const [n, d] = s.split('/').map(BigInt); return Number(n * 10n ** 15n / d) / 1e15; };
  const lo = toF(rtp.trueMin.rtpExact), hi = toF(rtp.trueMax.rtpExact);
  // E01: "exactly 99% where the multiplier is a short number": RTP == 0.99 exactly iff no payout level is floored
  let exact = 0, short = 0, agree = 0; const laws = allLaws();
  for (const l of laws) { const { m1, den } = moments(l); const is99 = m1 * 100n === 99n * den * 10000n;
    const noFloor = l.mode === 'target' ? (9900n * (1n << BigInt(l.n))) % S(l.n, l.t as number) === 0n : l.mode === 'multi' ? l.levels.every((_, h) => (19800n * BigInt(h)) % BigInt(l.n) === 0n) : l.levels.every((_, h) => (9900n * (1n << BigInt(l.n)) * BigInt(h)) % BigInt(l.coins as number) === 0n);
    if (is99) exact++; if (noFloor) short++; if (is99 === noFloor) agree++; }
  const multi7 = rtp.rows.find((r) => r.setting === 'multi n=7');
  // the panel's per-setting figure, read from E02 rulesMultiEdge and compared with the exact RTP at the 3 decimals it is quoted to
  const m7exact = multi7 ? Number(multi7.rtpPct) : NaN, m7pub = claim.multi7Pct === null ? NaN : Number(claim.multi7Pct);
  const m7same = Number.isFinite(m7pub) && Math.abs(m7pub - m7exact) < 0.0005;
  const ok = true;   // COINFLIP-19 has no condition besides the rule: its outcome and the committed table decide (recordRtpClaim)
  recordRtpClaim('COINFLIP-19', ok, gate, `${rtp.settings} legal settings (target game 48, multi toss 9, coins × flips 90): derived RTP ${lo.toFixed(9)} (${rtp.trueMin.setting}) … ${hi.toFixed(9)} (${rtp.trueMax.setting}) vs the flat ${claim.rtp} claim read from the exhibits (${claim.places.map((x) => `${x.place} ${x.figurePct === null ? 'no figure' : x.figurePct + '%'}`).join(', ')}; the places agree: ${claim.agree}${claim.agree ? '' : ', so the claim held is the highest figure stated'}); ${rtp.houseSideFailures} house-side beyond the 0.1 pp band, ${rtp.playerFavourable} player-favourable → RTP-CLAIM ${rtp.outcome} (rule ${rtp.rule} ${rtp.ruleVersion.split(' ')[0]}, enforced ${RTP_CLAIM_RULE_ENFORCED}: ${gate.status}); committed table matches: ${gate.tableMatches}; compared and printed, not in place of the rule: "at most ${claim.rtpNumber * 100}%" holds on every setting: ${hi <= claim.rtpNumber}; exactly ${claim.rtpNumber * 100} % on ${exact} settings, which are exactly the ${short} whose multipliers need no rounding (${pct(agree, laws.length)} agree, E01 "exactly 99% where the multiplier is a short number"); the panel's "${claim.multi7Pct ?? '?'}% at 7 coins" (E02 rulesMultiEdge, read from the exhibit) == multi n=7 ${multi7?.rtpPct} % to 3 decimals: ${m7same}`);
} });

// ═══ COINFLIP-20 / COINFLIP-21 the simulation, re-run in full and compared with the pinned census ═══
/** '' when the pinned census ships; else the words the census checks print (and censusSame is false: FAIL). */
function censusMissing(): string { return existsSync(join(ROOT, 'outputs', 'simulation-results.json')) ? '' : ' (outputs/simulation-results.json is MISSING: the re-run has nothing to equal, FAIL)'; }
let cen: Census; let censusSame = false;
const p2sets = [{ set: 'A', ds }, { set: 'tail', ds: tail }, { set: 'C', ds: pC }, { set: 'C10', ds: pC10 }, { set: 'D', ds: pD }];   // an array of names: it cannot throw (not wrapped, so mutation M21c finds it)
step(['COINFLIP-20'], () => {
  cen = census(p2sets);
  const committed = (existsSync(join(ROOT, 'outputs', 'simulation-results.json')) ? readFileSync(join(ROOT, 'outputs', 'simulation-results.json'), 'utf8') : null);
  censusSame = censusText(cen) === committed;
  mkdirSync(join(ROOT, 'outputs', 'run'), { recursive: true });
  writeFileSync(join(ROOT, 'outputs', 'run', 'simulation-results.json'), censusText(cen));
});
step(['COINFLIP-20'], () => {
  const p1 = cen.pass1; const N = p1.flips;
  const chi2 = ((p1.tails - N / 2) ** 2) / (N / 2) + ((N - p1.tails - N / 2) ** 2) / (N / 2), pChi = chiSquaredPValue(chi2, 1);
  const n = p1.lag1.n, sx = Number(BigInt(p1.lag1.sumX)), sx2 = Number(BigInt(p1.lag1.sumX2)), sxy = Number(BigInt(p1.lag1.sumXY));
  const mean = sx / n, varr = sx2 / n - mean * mean, r1 = (sxy / (n - 1) - mean * mean) / varr, z1 = r1 * Math.sqrt(n), pLag = twoSidedNormalP(z1);
  const runs = runsStatisticFromCounts(p1.runs.runs, p1.runs.n1, p1.runs.n), pRuns = twoSidedNormalP(runs.z);
  const screens = pChi >= ALPHA_SCREEN && pLag >= ALPHA_SCREEN && pRuns >= ALPHA_SCREEN;
  // the side-balance screen's exact false-alarm rate: the binomial mass outside the accepted tail counts
  let a = Math.round(N / 2), bnd = a; const accept = (t: number) => chiSquaredPValue(((t - N / 2) ** 2) / (N / 2) * 2, 1) >= ALPHA_SCREEN;
  while (a > 0 && accept(a - 1)) a--; while (bnd < N && accept(bnd + 1)) bnd++;
  const sideFa = binomialOutside(N, 0.5, a, bnd);
  const laws = bandLaws();
  const bandRows = cen.bands.map((b, i) => {
    const l = laws[i], { m1, m2, den } = moments(l); const mu = Number(m1) / Number(den) / 1e4, e2 = Number(m2) / Number(den) / 1e8, s2 = e2 - mu * mu;
    const rtpS = Number(BigInt(b.sum4)) / 1e4 / b.rounds, se = Math.sqrt(s2) / Math.sqrt(b.rounds), tol = EDGE_SIGMAS * se + EDGE_BUFFER;
    const max = Number(l.levels.reduce((m, x) => (x.mult4 > m ? x.mult4 : m), 0n)) / 1e4;
    const fa = l.mode === 'target' ? edgeBandFalseAlarm(b.rounds, Number(l.levels[0].w) / Number(den), max, mu).rate : bernsteinBandFalseAlarm(b.rounds, s2, max, tol);
    return { key: b.key, mode: l.mode, rtpS, mu, se, width: tol, ok: b.key === l.key && Math.abs(rtpS - mu) <= tol && b.rounds >= SIM_BAND_ROUNDS, fa };
  });
  // the bands are every legal setting, once each, and no two of them on one seed label
  const byMode = (m: string) => laws.filter((l) => l.mode === m).length;
  const ownSeeds = new Set(laws.flatMap((l) => [bandSeed(l.key, 0).server, bandSeed(l.key, 0).client])).size === 2 * laws.length;
  const span = laws.length === FLOOR_BANDS && new Set(laws.map((l) => l.key)).size === laws.length && ownSeeds
    && Array.from({ length: 10 }, (_, k) => k + 1).every((nn) => Array.from({ length: nn - MIN_TARGETS[nn - 1] + 1 }, (_, k) => MIN_TARGETS[nn - 1] + k).every((t) => laws.some((l) => l.mode === 'target' && l.n === nn && l.t === t)))
    && Array.from({ length: 9 }, (_, k) => k + 2).every((C) => laws.some((l) => l.mode === 'multi' && l.n === C) && Array.from({ length: 10 }, (_, k) => k + 1).every((F) => laws.some((l) => l.mode === 'coins' && l.coins === C && l.n === F)));
  const depth = N === SIM_UNIFORMITY_FLIPS && N >= FLOOR_UNIFORMITY_FLIPS && cen.bands.every((b) => b.rounds >= FLOOR_BAND_ROUNDS) && cen.bands.length === laws.length && cen.bands.length >= FLOOR_BANDS;
  const ok = censusSame && screens && bandRows.every((b) => b.ok) && span && depth;
  const worst = bandRows.reduce((w, b) => (Math.abs(b.rtpS - b.mu) / b.se > Math.abs(w.rtpS - w.mu) / w.se ? b : w));
  record('COINFLIP-20', ok, `census re-run in full == the pinned outputs/simulation-results.json byte for byte: ${censusSame}${censusMissing()}; ${N.toLocaleString('en')} fresh flips: ${p1.tails.toLocaleString('en')} T (side balance chi² ${chi2.toFixed(3)}, df 1, p ${pChi.toFixed(4)}), runs z ${runs.z.toFixed(3)} p ${pRuns.toFixed(4)}, lag-1 of the draws r ${r1.toExponential(2)} z ${z1.toFixed(3)} p ${pLag.toFixed(4)} (each ≥ α/3 = ${ALPHA_SCREEN.toFixed(4)}: ${screens}); ${bandRows.filter((b) => b.ok).length}/${bandRows.length} bands of ${SIM_BAND_ROUNDS.toLocaleString('en')} rounds (${(bandRows.length * SIM_BAND_ROUNDS).toLocaleString('en')} rounds in all) within 5·SE + 1e-4 of their exact RTP — every legal setting, each on its own seeds: the target game at every legal target of every n (${byMode('target')}), the multi toss at 2…10 coins (${byMode('multi')}), coins × flips at C = 2…10, F = 1…10 (${byMode('coins')}): ${span}; worst |Δ|/SE ${(Math.abs(worst.rtpS - worst.mu) / worst.se).toFixed(2)} (${worst.key}); band tolerance |RTP_sim − RTP_exact| ≤ ${EDGE_SIGMAS}·SE + ${EDGE_BUFFER}, SE = σ/√n, per band |Δ| vs width: ${bandRows.map((b) => `${b.key} ${Math.abs(b.rtpS - b.mu).toFixed(5)} ≤ ${b.width.toFixed(5)}`).join('; ')}; bands whose width exceeds the ${(claim.houseEdgeNumber * 100).toLocaleString('en', { maximumFractionDigits: 4 })} % house edge (1 − the claim), so that band cannot detect an edge of that size from ${SIM_BAND_ROUNDS.toLocaleString('en')} rounds (${bandRows.filter((b) => b.width > claim.houseEdgeNumber).length} of ${bandRows.length}): ${bandRows.filter((b) => b.width > claim.houseEdgeNumber).map((b) => b.key).join(', ') || 'none'}; false-alarm rates: side balance ${fmtRate(sideFa)} (exact binomial), runs and lag-1 ${ALPHA_SCREEN.toFixed(4)} each (nominal), worst target band ${fmtRate(Math.max(...bandRows.filter((b) => b.mode === 'target').map((b) => b.fa)))} (exact binomial), worst multi toss or coins band ≤ ${fmtRate(Math.max(...bandRows.filter((b) => b.mode !== 'target').map((b) => b.fa)))} (Bernstein bound), every band summed ≤ ${fmtRate(bandRows.reduce((a, b) => a + b.fa, 0))}`);
});
step(['COINFLIP-21'], () => {
  const ep = cen.pass2.epochs; const D = 2 ** 100;
  const agg = (win: 'early' | 'ref', k: 'scored' | 'all') => { let R = 0n, M = 0n, V = 0n, n = 0;
    for (const e of ep) { const w = e[win]; if (k === 'scored') { R += BigInt(w.scoredRet4); M += BigInt(w.scoredMean); V += BigInt(w.scoredVar); n += w.scoredBets; } else { R += BigInt(w.ret4); M += BigInt(w.mean); V += BigInt(w.var); n += w.bets; } }
    const mean = Number(M) / D, sd = Math.sqrt(Number(V)) / D, z = (Number(R) - mean) / sd; return { z, p: normalLowerTailP(z), n, sd4: sd }; };
  const early = agg('early', 'scored'), all = agg('early', 'all'), ref = agg('ref', 'scored');
  const below = ep.filter((e) => Number(BigInt(e.early.scoredRet4)) < Number(BigInt(e.early.scoredMean)) / D).length;
  // the SCORED statistic is the per-slot standardised return (the roulette/keno form, since 14 Oct 2026), re-derived from the
  // census's per-setting sums and each played setting's exact law; the pooled form scored until 14 Oct is printed with its p-value
  const momOf = new Map<string, { mu: number; sd: number; max4: bigint }>();
  const mom = (st: Bet['setting']) => { const l = lawOf(st); let x = momOf.get(l.key); if (!x) { const { m1, m2, den } = moments(l); const mu = Number(m1) / Number(den) / 1e4; x = { mu, sd: Math.sqrt(Math.max(0, Number(m2) / Number(den) / 1e8 - mu * mu)), max4: l.levels.reduce((m, y) => (y.mult4 > m ? y.mult4 : m), 0n) }; momOf.set(l.key, x); } return x; };
  const playedOf = new Map<string, Bet['setting'][]>(); const capturedOf = new Map<string, number[]>();
  for (const { set, ds: d } of p2sets) for (const sd of d.seeds) { const e = Number(sd.epoch); const inE = d.bets.filter((b) => b.epoch === e).sort((a, b) => a.nonce - b.nonce); playedOf.set(`${set}/${e}`, inE.map((b) => b.setting)); capturedOf.set(`${set}/${e}`, inE.map((b) => b.nonce)); }
  let slotSums = true, zeroSd = 0;
  const perSlot = (win: 'early' | 'ref', scoredOnly: boolean, only?: (e: typeof ep[number]) => boolean) => {
    let zs = 0, n = 0, inv = 0;
    for (const x of ep) {
      if (only && !only(x)) continue;
      const sts = playedOf.get(`${x.set}/${x.epoch}`), w = x[win] as any; if (!sts || !w.slotBets || w.slotBets.length !== sts.length) { slotSums = false; continue; }
      let r4 = 0n, nb = 0;
      for (let j = 0; j < sts.length; j++) {
        r4 += BigInt(w.slotRet4[j]); nb += w.slotBets[j];
        const m = mom(sts[j]); if (scoredOnly && m.max4 > BigInt(SIM_PASS2_MAX_MULT4)) continue;
        if (m.sd === 0) { zeroSd += w.slotBets[j]; continue; }
        zs += (w.slotRet4[j] / 1e4 - w.slotBets[j] * m.mu) / m.sd; n += w.slotBets[j]; inv += w.slotBets[j] / m.sd;
      }
      if (r4 !== BigInt(w.ret4) || nb !== w.bets) slotSums = false;
    }
    const z = zs / Math.sqrt(n); return { z, p: normalLowerTailP(z), n, inv };
  };
  const sEarly = perSlot('early', true), sAll = perSlot('early', false), sRef = perSlot('ref', true);
  // the early window is the capture itself: its all-slot return must equal the sum of the served multipliers of every bet
  let served = 0n; for (const { ds: d } of p2sets) for (const b of d.bets) { const v = u8(b.payoutMultiplier); served += v === null ? -1n : v / 10000n; }
  const earlyAll = ep.reduce((s, e) => s + BigInt(e.early.ret4), 0n);
  const zPow = -normalQuantile(SIM_PASS2_ALPHA) + normalQuantile(0.8), zPowS = -normalQuantile(SIM_PASS2_ALPHA_SCORED) + normalQuantile(0.8);
  const deficitPp = (zPow * early.sd4 / 1e4) / early.n * 100, deficitAllPp = (zPow * all.sd4 / 1e4) / all.n * 100;
  // a uniform per-bet RTP deficit d shifts every slot's return by d, so the per-slot z moves by d × Σ(1/sd)/√slots
  const deficitSlotPp = zPowS * Math.sqrt(sEarly.n) / sEarly.inv * 100, deficitSlotAllPp = zPowS * Math.sqrt(sAll.n) / sAll.inv * 100;
  // every revealed seed of the five files, each epoch's early window == its captured nonces 1..n
  const seedsExpected = EXPECTED_SEEDS + tail.seeds.length + EXPECTED_PHASE_C_BETS / EXPECTED_EPOCH_SIZE + EXPECTED_PHASE_C10_BETS / EXPECTED_EPOCH_SIZE + EXPECTED_PHASE_D_BETS / EXPECTED_EPOCH_SIZE;
  const revealed = p2sets.reduce((a, { ds: d }) => a + d.seeds.filter((s) => typeof s.revealedServerSeed === 'string' && s.revealedServerSeed.length === 64).length, 0);
  const windowsOk = ep.every((e) => { const ns = capturedOf.get(`${e.set}/${e.epoch}`); return !!ns && ns.length === e.depth && ns.every((x, i) => x === NONCE_BASE + i) && e.early.bets === e.depth && e.early.bets + e.ref.bets === SIM_PASS2_NONCES; });
  const depthOk = ep.length === seedsExpected && ep.length === revealed && SIM_PASS2_NONCES >= FLOOR_PASS2_NONCES && windowsOk;
  const sA = perSlot('early', true, (e) => e.set === 'A'), sRest = perSlot('early', true, (e) => e.set !== 'A');
  const bySet = ['A', 'tail', 'C', 'C10', 'D'].map((s) => `${s === 'C10' ? 'C $10' : s} ${ep.filter((e) => e.set === s).length}`).join(', ');
  const FA = PASS2_FALSE_ALARM;
  const ok = censusSame && depthOk && served === earlyAll && slotSums && sEarly.p >= SIM_PASS2_ALPHA_SCORED && FA.perSlotRate <= FAIL_FALSE_ALARM_CAP;
  record('COINFLIP-21', ok, `${censusMissing() ? `census${censusMissing()}; ` : ''}${ep.length} revealed epochs (every revealed seed of the five bet files: ${bySet}; == the population constants and the revealed seeds: ${ep.length === seedsExpected && ep.length === revealed}) × ${SIM_PASS2_NONCES.toLocaleString('en')} nonces (early = 1..n, n = the epoch's captured depth, 50, the tail 34; reference = n+1..${SIM_PASS2_NONCES}; every early window == the epoch's captured nonces: ${windowsOk}), each epoch's played settings cycled with their own calls; scored statistic (since 14 Oct 2026, the roulette/keno form): the per-slot standardised early-window return of the ${sEarly.n} scored played slots (largest multiplier ≤ ${SIM_PASS2_MAX_MULT4 / 1e4}×, src/sim-config.ts; each slot against its setting's exact mean and sd${zeroSd ? `, ${zeroSd} zero-variance slots skipped` : ''}) z ${sEarly.z.toFixed(3)}, one-sided p ${sEarly.p.toFixed(4)} (≥ ${SIM_PASS2_ALPHA_SCORED}, the calibrated threshold of src/sim-config.ts: ${sEarly.p >= SIM_PASS2_ALPHA_SCORED}); printed, not scored: the Phase A epochs alone z ${sA.z.toFixed(3)} (${sA.n} slots), the other ${ep.filter((e) => e.set !== 'A').length} z ${sRest.z.toFixed(3)} (${sRest.n} slots); reference window z ${sRef.z.toFixed(3)}; all ${sAll.n} slots z ${sAll.z.toFixed(3)} p ${sAll.p.toFixed(4)} (printed, not scored; ${sAll.n - sEarly.n} played slots above ${SIM_PASS2_MAX_MULT4 / 1e4}× are unscored); the switch from the pooled form was made after the pooled result was known: pooled (scored until 14 Oct, printed) z ${early.z.toFixed(3)}, p ${early.p.toFixed(4)}, reference z ${ref.z.toFixed(3)}, all slots z ${all.z.toFixed(3)}; per-setting census sums == the window totals: ${slotSums}; ${below} epochs below expectation, ${ep.length - below} at or above (descriptive, not a test: under fair play ${FA.belowMean} ± ${FA.belowSd} of ${ep.length} are below, because the return is right-skewed; src/false-alarm-pass2.ts); early window == the captured served multipliers: ${served === earlyAll}; detection power of the scored statistic: a ${deficitSlotPp.toFixed(2)} pp per-bet RTP deficit at 80 % (on all slots ${deficitSlotAllPp.toFixed(2)} pp; pooled form ${deficitPp.toFixed(2)} pp, all slots ${deficitAllPp.toFixed(1)} pp); false-alarm rate of the scored rule ${FA.perSlotRate} ± ${FA.perSlotStandardError} at p < ${SIM_PASS2_ALPHA_SCORED} (at the nominal ${SIM_PASS2_ALPHA}: ${FA.perSlotRateNominal} ± ${FA.perSlotStandardErrorNominal}, not within the cap, hence the calibrated threshold; pooled rule at ${SIM_PASS2_ALPHA}: ${FA.rate} ± ${FA.standardError}; declared in src/false-alarm-pass2.ts from ${FA.replicates.toLocaleString('en')} honest replicates and re-derived by npm run false-alarm:pass2, not re-run by verify; ≤ ${FAIL_FALSE_ALARM_CAP})`);
});

// ═══ COINFLIP-22 live-sample fit (INFORMATIONAL) ═══
step(['COINFLIP-22'], () => {
  let N = 0, T = 0; for (const b of ds.bets) for (const ch of b.outcome) { N++; if (ch === 'T') T++; }
  const zSide = (T - N / 2) / Math.sqrt(N / 4);
  // matched counts of the target game per n against Binomial(n, 1/2), cells pooled until the expected count is ≥ 5
  let chi2 = 0, df = 0;
  for (let n = MIN_FLIPS; n <= MAX_FLIPS; n++) {
    const bs = ds.bets.filter((b) => b.setting.kind !== 'coins' && b.setting.n === n); if (!bs.length) continue;
    const obs = new Array(n + 1).fill(0); for (const b of bs) obs[b.matched]++;
    let eAcc = 0, oAcc = 0; const cells: [number, number][] = [];
    for (let h = 0; h <= n; h++) { eAcc += bs.length * Number(choose(n, h)) / 2 ** n; oAcc += obs[h]; if (eAcc >= 5) { cells.push([oAcc, eAcc]); eAcc = 0; oAcc = 0; } }
    if (eAcc > 0 && cells.length) { cells[cells.length - 1][0] += oAcc; cells[cells.length - 1][1] += eAcc; }
    for (const [o, e] of cells) chi2 += (o - e) ** 2 / e; df += Math.max(0, cells.length - 1);
  }
  record('COINFLIP-22', true, `${N.toLocaleString('en')} captured Phase A flips: ${T.toLocaleString('en')} T (z ${zSide.toFixed(2)}); target-game matched counts per n against Binomial(n, 1/2): chi² ${chi2.toFixed(2)} on ${df} df, p ${chiSquaredPValue(chi2, df).toFixed(4)} — informational (a few-thousand-round sample has little power and never bears the verdict)`);
});

// ═══ Package checks: COINFLIP-23, 24, 25, 27, 28, 29, 30 ═══
const manifest = input('manifest', () => (existsSync(join(ROOT, 'MANIFEST.md')) ? readFileSync(join(ROOT, 'MANIFEST.md'), 'utf8') : ''));
const readme = input('readme', () => (existsSync(join(ROOT, 'README.md')) ? readFileSync(join(ROOT, 'README.md'), 'utf8') : ''));
step(['COINFLIP-23'], () => {
  // the framework's standardized S5 matrix: ids S5-1 … S5-8 AND their names, in order, between the S5-MATRIX markers, each
  // row with a status. The names are the framework's; when the vendored profile's -23
  // rule lists them, that list is used and must equal this one.
  const S5_NAMES = ['Replay protection', 'Input validation', 'Seed integrity under adversarial input', 'Cross-player isolation',
    'Payout field integrity', 'Nonce sequence enforcement', 'Parameter boundary enforcement', 'Game-specific state'];
  let asserts = ''; try { asserts = String(JSON.parse(readFileSync(join(ROOT, 'profile', 'profile.json'), 'utf8')).checks.find((c: any) => c.id === 'COINFLIP-23')?.asserts ?? ''); } catch { asserts = ''; }
  const listed = (/S5-1\s*…\s*S5-8\s*\(([^)]*)\)/.exec(asserts)?.[1] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const profileAgrees = listed.length === 0 || (listed.length === 8 && listed.every((x, i) => x.toLowerCase() === S5_NAMES[i].toLowerCase()));
  const block = /<!-- S5-MATRIX:BEGIN -->([\s\S]*?)<!-- S5-MATRIX:END -->/.exec(manifest)?.[1] ?? '';
  const rowsS5 = block.split('\n').filter((l) => /^\| S5-\d+ \|/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  const header = block.split('\n').find((l) => /^\| Test ID \|/.test(l))?.split('|').slice(1, -1).map((c) => c.trim()) ?? [];
  const resCol = header.indexOf('Result');
  const good = rowsS5.filter((r, i) => r[0] === `S5-${i + 1}` && (r[1] ?? '').toLowerCase() === (S5_NAMES[i] ?? '').toLowerCase() && resCol > 0 && /^(Pass|Flag|Hard Fail|Not tested)\b/.test(r[resCol] ?? ''));
  const ok = rowsS5.length === 8 && good.length === 8 && header[1] === 'Category' && profileAgrees;
  const bad = rowsS5.map((r) => (good.includes(r) ? null : `${r[0]} "${r[1]}"`)).filter(Boolean);
  // the printed tally separates a row that passes on every control it names from one that passes on part of them and from
  // one that is Not tested (a status that starts "Pass on" is a partial pass)
  const s5cov = (st: string[]) => { const full = st.filter((s) => /^Pass\b/.test(s) && !/^Pass on\b/.test(s)).length, part = st.filter((s) => /^Pass on\b/.test(s)).length, nt = st.filter((s) => /^Not tested\b/.test(s)).length, fl = st.filter((s) => /^Flag\b/.test(s)).length, hf = st.filter((s) => /^Hard Fail\b/.test(s)).length;
    return `${full} Pass on every control the row names, ${part} Pass on part of the controls it names, ${nt} Not tested${fl ? `, ${fl} Flag` : ''}${hf ? `, ${hf} Hard Fail` : ''}`; };
  record('COINFLIP-23', ok, `MANIFEST.md S5 fairness-integrity matrix (between the S5-MATRIX markers): ${good.length}/8 rows carry the framework's id and name in order (${S5_NAMES.map((x, i) => `S5-${i + 1} ${x}`).join(', ')}) and a status (${s5cov(rowsS5.map((r) => r[resCol] ?? ''))}); columns ${header.join(' | ') || 'none'}; the profile's -23 rule ${listed.length ? `lists the names, equal: ${profileAgrees}` : 'does not list the names (the framework list above is used)'}${bad.length ? `; rows that differ: ${bad.join(', ')}` : ''}${rowsS5.length !== 8 ? `; ${rowsS5.length} rows` : ''}`);
});
// -24: the site-verifier module (site-verifier/derive.js, generated from src/rng.ts by scripts/build-site-verifier.mjs).
// Two legs, both needed. The pins: the file on disk has the sha256 of SITE_VERIFIER_PIN (src/artifact-pins.ts) and of its
// RELEASE-MANIFEST.json entry, and MANIFEST.md and README.md quote that sha256. The replay: the module is loaded from that
// file (never bundled into verify.js), must export what src/rng.ts exports, and every function is run side by side with
// src/rng.ts on every captured round of the five shipped datasets (each round with its own number of flips: n calls, or
// C coins × F flips); one differing result fails the check. The pins alone would pass a module that derives something else
// and was re-pinned; the replay alone would pass a file nobody pinned.
const SITE = await loadSiteModule(ROOT, SITE_VERIFIER_PIN[0]);
step(['COINFLIP-24'], () => {
  const [file, pin] = SITE_VERIFIER_PIN;
  const relPin: string | null = (() => { try { return readJson('RELEASE-MANIFEST.json').files?.[file] ?? null; } catch { return null; } })();
  const pinOk = SITE.sha256 !== null && SITE.sha256 === pin, relOk = SITE.sha256 !== null && SITE.sha256 === relPin;
  const cited = SITE.sha256 !== null && manifest.includes(SITE.sha256) && readme.includes(SITE.sha256);
  const names = exportNames(RNG), exportsOk = !!SITE.mod && JSON.stringify(exportNames(SITE.mod)) === JSON.stringify(names);
  function* probes(): Generator<Probe> {
    yield ['SIDES', (m) => m.SIDES];
    for (const d of ALL) {
      for (const s of d.seeds) if (s.revealedServerSeed) yield ['sha256Hex', (m) => m.sha256Hex(s.revealedServerSeed)];
      for (const b of d.bets) {
        const s = seedOf(d, b.epoch)!; const k = flipsNeeded(b.setting);
        for (let blk = 0; blk * 8 < k; blk++) yield ['hmacBlock', (m) => m.hmacBlock(s.revealedServerSeed, s.clientSeed, b.nonce, blk)];
        yield ['draws', (m) => m.draws(s.revealedServerSeed, s.clientSeed, b.nonce, k)];
        for (const u of RNG.draws(s.revealedServerSeed, s.clientSeed, b.nonce, k)) yield ['sideOf', (m) => m.sideOf(u)];
        yield ['flips', (m) => m.flips(s.revealedServerSeed, s.clientSeed, b.nonce, k)];
      }
    }
  }
  const rounds = ALL.reduce((n, d) => n + d.bets.length, 0);
  const rp = exportsOk ? replay(RNG, SITE.mod!, probes()) : null;
  const covered = rp ? names.filter((n) => rp.byLabel[n] > 0).length : 0;
  const replayOk = !!rp && rp.differences === 0 && rp.byLabel.flips === rounds && rounds === EXPECTED_BETS + EXPECTED_TAIL_BETS + EXPECTED_PHASE_C_BETS + EXPECTED_PHASE_C10_BETS + EXPECTED_PHASE_D_BETS && covered === names.length;
  record('COINFLIP-24', pinOk && relOk && cited && exportsOk && replayOk, `${file} (generated from src/rng.ts by scripts/build-site-verifier.mjs): ${SITE.sha256 === null ? 'missing' : `sha256 ${SITE.sha256}`}; == SITE_VERIFIER_PIN in src/artifact-pins.ts: ${pinOk}; == its RELEASE-MANIFEST.json pin: ${relOk}; quoted in MANIFEST.md and README.md: ${cited}; ${SITE.mod ? `the module loaded from that file exports what src/rng.ts exports (${names.join(', ')}): ${exportsOk}` : `the module did not load (${SITE.error})`}; ${rp ? `run side by side with src/rng.ts on every captured round of the ${ALL.length} shipped datasets: ${rounds} rounds, ${rp.calls} calls (${Object.entries(rp.byLabel).map(([k, v]) => `${k} ${v}`).join(', ')}; ${covered}/${names.length} exports exercised), ${rp.differences} differing result${rp.differences === 1 ? '' : 's'}${rp.first ? ` (first: ${rp.first})` : ''}` : 'not replayed'}`);
});
step(['COINFLIP-25'], () => {
  const need = ['Verify a bet', 'rotate', 'sha256', 'HMAC-SHA256', 'floor(u / 2^32 × 2)', 'matched', 'floor4', 'UTF-8', 'not the 32 bytes'];
  const has = need.filter((w) => readme.includes(w));
  record('COINFLIP-25', has.length === need.length, `README.md "Verify a bet" carries where the seed is revealed, the fields, the commitment encoding, the HMAC key's encoding (the seed's text as UTF-8, not the 32 bytes it hex-decodes to), the flip rule, the match count per mode and the multiplier: ${has.length}/${need.length} markers`);
});
const artifactBad = input('artifactBad', () => (ARTIFACT_PINS.filter(([f, h]) => !existsSync(join(ROOT, f)) || sha256File(f) !== h)));
/** the digest of the sources the standalone verify.js is built from (tests/verify.ts + src/*.ts, sorted by path:
 *  sha256 of "path\nsha256(bytes)\n" per file). scripts/build-standalone.mjs writes it into verify.js's header. */
function sourcesSha256(): string {
  const files = ['tests/verify.ts', ...readdirSync(join(ROOT, 'src')).filter((f) => f.endsWith('.ts')).map((f) => `src/${f}`)].sort();
  return sha256Bytes(files.map((f) => `${f}\n${sha256Bytes(readFileSync(join(ROOT, f)))}\n`).join(''));
}
const SOURCES_SHA256 = input('SOURCES_SHA256', () => (sourcesSha256()));
const bundleSrc = input('bundleSrc', () => (existsSync(join(ROOT, 'verify.js')) ? (readFileSync(join(ROOT, 'verify.js'), 'utf8').match(/Sources sha256 \(tests\/verify\.ts \+ src\/\*\.ts\): ([0-9a-f]{64})/) || [])[1] ?? null : null));
const bundleFresh = input('bundleFresh', () => (bundleSrc === SOURCES_SHA256), false);
/** a gate record (outputs/mutation-results.json, outputs/fresh-copy.json) is read only when it ships pinned in
 *  RELEASE-MANIFEST.json and was produced from the sources this run uses; anything else is refused. */
const releasePins: Record<string, string> = input('releasePins', () => (existsSync(join(ROOT, 'RELEASE-MANIFEST.json')) ? (readJson('RELEASE-MANIFEST.json').files ?? {}) : {}));
function gateRecord(rel: string): { rec: any; why: string } {
  if (!existsSync(join(ROOT, rel))) return { rec: null, why: `${rel} is not in this copy` };
  if (releasePins[rel] !== sha256Bytes(readFileSync(join(ROOT, rel)))) return { rec: null, why: `${rel} is not the file pinned in RELEASE-MANIFEST.json` };
  const rec = readJson(rel);
  if (rec.sourcesSha256 !== SOURCES_SHA256) return { rec: null, why: `${rel} was produced from other sources (stale)` };
  return { rec, why: '' };
}
step(['COINFLIP-28'], () => {
  const { rec: fc, why } = gateRecord('outputs/fresh-copy.json');
  const clean = !!fc && fc.exit === 0 && fc.rngTestsExit === 0 && fc.standaloneExit === 0 && fc.cleanVerdict === true && fc.reproduced === true && fc.beyondTolerance === 0 && fc.pinnedUnchanged === true && fc.verifyJsSha256 === sha256Bytes(readFileSync(join(ROOT, 'verify.js')));
  record('COINFLIP-28', clean && AUDIT_ID !== null, fc ? `committed fresh-copy record (outputs/fresh-copy.json, pinned in RELEASE-MANIFEST.json, produced by npm run gate:fresh from these sources on Node ${fc.node}): test exit ${fc.exit}, standalone exit ${fc.standaloneExit}, clean verdict ${fc.cleanVerdict}, REPRODUCED ${fc.reproduced}, regeneration vs committed ${fc.beyondTolerance} fields beyond tolerance, pinned artifacts unchanged ${fc.pinnedUnchanged}; audit ID ${AUDIT_ID ?? 'NOT ASSIGNED (pending, assigned by ProvablyFair.org)'}` : `no usable fresh-copy record: ${why}; audit ID ${AUDIT_ID ?? 'not assigned (pending, assigned by ProvablyFair.org)'}`);
  if (!fc && /is not in this copy|is not the file pinned/.test(why)) pinFail('COINFLIP-28', why);   // missing or edited: FAIL, verdict-bearing (a stale record stays a GAP)
});
step(['COINFLIP-29'], () => {
  const { rec: mr, why } = gateRecord('outputs/mutation-results.json');
  let consistent = false, detail = `no usable mutation record: ${why}`;
  if (mr) {
    const reg = readJson('tests/mutations.json').mutations as any[];
    const scoredIds = EXPECTED_STEPS;
    const res = Array.isArray(mr.results) ? mr.results : [];
    const idsMatch = res.length === reg.length && res.every((r: any, i: number) => r.id === reg[i].id && r.kills === reg[i].kills);
    // a mutation with an expected exit (the verdict routing, exit 2 / 3 / 5) is killed only when that exit was produced
    const killedOk = res.every((r: any, i: number) => r.killed === (r.status !== r.baseline && r.status !== 'MISSING' && r.status !== 'ERROR' && (reg[i].expectExit === undefined || [].concat(reg[i].expectExit).includes(r.exit))));
    const nKilled = res.filter((r: any) => r.killed).length;
    const uncovered = scoredIds.filter((id) => !res.some((r: any) => r.kills === id && r.killed));
    consistent = mr.registrySha256 === sha256Bytes(readFileSync(join(ROOT, 'tests', 'mutations.json'))) && idsMatch && killedOk && mr.total === reg.length && mr.killed === nKilled && mr.control?.ok === true
      && JSON.stringify(mr.uncoveredSteps) === JSON.stringify(uncovered);
    detail = `committed mutation record (outputs/mutation-results.json, pinned in RELEASE-MANIFEST.json, produced by npm run mutate from these sources and tests/mutations.json): ${nKilled}/${reg.length} mutations killed by their named step, recounted from its rows; record consistent with the registry and its own rows: ${consistent}; unmutated control copy == the committed statuses: ${mr.control?.ok}; undeclared survivors ${res.filter((r: any) => !r.killed).length}; scored steps with no killing mutation: ${uncovered.join(', ') || 'none'}`;
    consistent = consistent && res.every((r: any) => r.killed) && uncovered.length === 0;
  }
  record('COINFLIP-29', consistent, detail);
  if (!mr && /is not in this copy|is not the file pinned/.test(why)) pinFail('COINFLIP-29', why);   // missing or edited: FAIL, verdict-bearing (a stale record stays a GAP)
});
step(['COINFLIP-30'], () => {
  const dl = (manifest.match(/^\| DL-\d+ \|/gm) || []).length;
  const prem = /Could the data contradict it\?/.test(manifest);
  const ev = EVIDENCE_PINS.every(([f]) => manifest.includes(f.split('/').pop()!));
  record('COINFLIP-30', dl > 0 && prem && ev, `MANIFEST.md: ${dl} declared-limitation rows; load-bearing premises with "Could the data contradict it?": ${prem}; every exhibit E01…E${String(EVIDENCE_PINS.length).padStart(2, '0')} listed by file name: ${ev}`);
});

// COINFLIP-27 runs last, after every check the committed record holds has its row, so its comparison sees the whole record
step(['COINFLIP-27'], () => {
  const gi = existsSync(join(ROOT, '.gitignore')) ? readFileSync(join(ROOT, '.gitignore'), 'utf8') : '';
  const unignored = ARTIFACT_PINS.every(([f]) => gi.includes('!' + f));
  const noMeta = ARTIFACT_PINS.every(([f]) => existsSync(join(ROOT, f)) && !/"(runAt|generatedAt|timestamp|hostname|nodeVersion)"/.test(readFileSync(join(ROOT, f), 'utf8')));
  const cf = join(ROOT, 'outputs', 'verification-results.json');
  const recDiffs = existsSync(cf) ? beyondTolerance(fieldDiff(JSON.parse(readFileSync(cf, 'utf8')), recordOf())).length : -1;
  record('COINFLIP-27', artifactBad.length === 0 && unignored && noMeta && censusSame && gate.tableMatches && recDiffs === 0 && bundleFresh,
    `${ARTIFACT_PINS.length - artifactBad.length}/${ARTIFACT_PINS.length} artifacts match the sha256 pinned in src/artifact-pins.ts${artifactBad.length ? ` (mismatch: ${artifactBad.map(([f]) => f).join(', ')})` : ''}; un-ignored by name in .gitignore: ${unignored}; no run metadata: ${noMeta}; census regenerated == committed: ${censusSame}${censusMissing()}; RTP table regenerated == committed: ${gate.tableMatches}; committed verification record == this run's: ${recDiffs === 0}${recDiffs > 0 ? ` (${recDiffs} fields differ)` : recDiffs < 0 ? ' (not recorded)' : ''}; the standalone verify.js header digest == the digest of tests/verify.ts + src/*.ts (a header check: the bundle body is bound by its own stale guard, exit 4, and by release-manifest --check, which rebuilds and compares it): ${bundleFresh}; verify writes only outputs/run/`);
});

finish();

/** the verdict from the scored rows, bound to the profile's scored list. A scored check with no status from this run
 *  (or recorded twice) withholds it: INCOMPLETE, exit 3. A FAIL still reads NOT PROVABLY FAIR (framework core/verdict.ts).
 *  No path that has a FAIL or a missing step can reach the Full Pass line. */
function verdictOf(scored: Row[], expected: readonly string[], extra = 0) {   // extra: FAILs outside the scored rows and run errors (extraFails())
  const seen = new Map<string, number>(); for (const r of scored) seen.set(r.id, (seen.get(r.id) || 0) + 1);
  const missing = expected.filter((id) => !seen.has(id));
  const duplicated = [...seen.entries()].filter(([, k]) => k > 1).map(([id]) => id);
  const ran = scored.filter((r) => r.status !== 'NOT_RUN');
  const complete = missing.length === 0 && duplicated.length === 0 && ran.length === expected.length && BIND.ok;   // and the step list is the profile's
  const fails = ran.filter((r) => r.status === 'FAIL').length;
  const opFlags = ran.filter((r) => r.status === 'FLAG' && r.origin === 'operator').length;
  const overstated = ran.filter((r) => r.status === 'OVERSTATED').length;
  // RTP-CLAIM 1.2.0 ranking (rtpClaimVerdict): NOT PROVABLY FAIR (1) > INCOMPLETE (3) > RTP FIGURE OVERSTATED (5) > Conditional (2) > Full (0)
  const rv = rtpClaimVerdict({ fails: fails + extra, complete, overstated: overstated > 0, opFlags });
  const verdict = rv.verdict === 'INCOMPLETE' ? (BIND.ok ? 'INCOMPLETE — steps not run' : 'INCOMPLETE — the step list is not bound to the profile') : rv.verdict;
  const exit = rv.exit;
  return { verdict, exit, missing, duplicated, fails, opFlags, overstated };
}
function notRunRow(id: string): Row { const p = prof(id); return { id, name: p.name, policy: p.policy, status: 'NOT_RUN', detail: 'no status from this run: the step did not run (deleted or skipped) — verdict withheld; a step that throws is scored FAIL instead' }; }

/** The verification record: every scored check except COINFLIP-27 (which compares the record) plus the informational ones,
 *  in profile order. finish() writes it and COINFLIP-27 compares it with the committed outputs/verification-results.json. */
function recordOf() {
  const order = (id: string) => Number(id.split('-')[1]);
  // every package check (GRADED / RELEASE_GATE) is recorded too, except COINFLIP-28, COINFLIP-29: they attest this record itself
  // (COINFLIP-28 and COINFLIP-29 read gate records bound to sources that pin it), so verify prints them and does not record them
  const pkgRows = rows.filter((r) => (r.policy === 'GRADED' || r.policy === 'RELEASE_GATE') && !['COINFLIP-28', 'COINFLIP-29'].includes(r.id));
  const expected = EXPECTED_STEPS.filter((id) => id !== 'COINFLIP-27');
  const have = new Set(rows.map((r) => r.id));
  const sorted = [...rows, ...expected.filter((id) => !have.has(id)).map(notRunRow)].sort((a, b) => order(a.id) - order(b.id));
  const scored = sorted.filter((r) => r.policy === 'HARD_FAIL' || r.policy === 'FLAG');
  const recRows = scored.filter((r) => r.id !== 'COINFLIP-27');
  const v = verdictOf(recRows, expected);
  return { suite: 'housebets-coinflip', profileSha256: PROFILE_SHA256, verdict: v.verdict,
    summary: { passes: recRows.filter((r) => r.status === 'PASS').length, fails: v.fails, overstated: v.overstated, operatorFlags: v.opFlags, captureFlags: recRows.filter((r) => r.status === 'FLAG' && r.origin === 'capture').length, packageChecks: pkgRows.length, excluded: ['COINFLIP-27'] },
    steps: [...recRows.concat(sorted.filter((r) => r.policy === 'INFORMATIONAL')), ...pkgRows].sort((a, b) => order(a.id) - order(b.id)).map((r) => ({ id: r.id, status: r.status, origin: r.origin ?? null, detail: r.detail })) };
}

function finish() {
  applyTaint();
  const order = (id: string) => Number(id.split('-')[1]);
  const have = new Set(rows.map((r) => r.id));
  for (const id of EXPECTED_STEPS) if (!have.has(id)) rows.push(notRunRow(id));
  rows.sort((a, b) => order(a.id) - order(b.id));
  const scored = rows.filter((r) => r.policy === 'HARD_FAIL' || r.policy === 'FLAG');
  const v = verdictOf(scored, EXPECTED_STEPS, extraFails());
  // belt and braces: a clean verdict needs exactly the expected number of scored steps to have run
  const ranCount = scored.filter((r) => r.status !== 'NOT_RUN').length;
  if (v.exit === 0 && ranCount !== EXPECTED_STEPS.length) throw new Error(`${ranCount} scored steps ran, ${EXPECTED_STEPS.length} expected — no verdict`);
  const capFlags = scored.filter((r) => r.status === 'FLAG' && r.origin === 'capture').length;
  const passes = scored.filter((r) => r.status === 'PASS').length;
  const pkg = rows.filter((r) => r.policy === 'GRADED' || r.policy === 'RELEASE_GATE');
  console.log(`HouseBets House Games coin flip (new engine) — verification (profile COINFLIP ${PROFILE_VERSION} ${PROFILE_SHA256.slice(0, 12)}…, ${rows.length} checks)`);
  for (const r of rows) console.log(`  ${r.id.padEnd(12)} ${(r.status + (r.origin === 'capture' ? '*' : '')).padEnd(6)} ${r.policy.padEnd(13)} ${r.name.padEnd(46)} ${r.detail}`);
  console.log(`  (* capture-origin FLAG: disclosed, verdict-neutral)`);
  console.log(`scored checks (HARD_FAIL + FLAG): ${passes} PASS, ${v.fails} FAIL, ${v.overstated} OVERSTATED, ${v.opFlags} operator FLAG, ${capFlags} capture FLAG, ${scored.filter((r) => r.status === 'NOT_RUN').length} NOT RUN of ${EXPECTED_STEPS.length} expected (EXPECTED_STEPS: the profile's scored checks; ran ${scored.filter((r) => r.status !== 'NOT_RUN').length}); informational ${rows.filter((r) => r.status === 'INFO').length}; package checks ${pkg.filter((r) => r.status === 'PASS').length}/${pkg.length} PASS (${pkg.filter((r) => r.status === 'GAP').map((r) => r.id).join(', ') || 'no gaps'})`);
  if (v.missing.length || v.duplicated.length) console.log(`scored checks with no status from this run: ${v.missing.join(', ') || 'none'}; recorded more than once: ${v.duplicated.join(', ') || 'none'}`);
  console.log(`profile binding: ${BIND.detail} — ${BIND.ok ? 'bound' : 'NOT BOUND: verdict withheld (INCOMPLETE)'}`);
  const failOutside = rows.filter((r) => r.status === 'FAIL' && r.policy !== 'HARD_FAIL' && r.policy !== 'FLAG').map((r) => r.id);
  if (failOutside.length) console.log(`FAIL outside the scored checks (verdict-bearing): ${failOutside.join(', ')}`);
  if (RUN_ERRORS.length) console.log(`run errors (${RUN_ERRORS.length}; any one fails the verdict): ${RUN_ERRORS.join(' | ')}`);
  console.log(`VERDICT: ${v.verdict}`);
  // the run record (outputs/run/ only) and its comparison with the committed record — verdict-bearing rows only
  const record = recordOf();
  mkdirSync(join(ROOT, 'outputs', 'run'), { recursive: true });
  writeFileSync(join(ROOT, 'outputs', 'run', 'verification-results.json'), JSON.stringify(record, null, 2) + '\n');
  const cf = join(ROOT, 'outputs', 'verification-results.json');
  if (existsSync(cf)) {
    const diffs = beyondTolerance(fieldDiff(JSON.parse(readFileSync(cf, 'utf8')), record));
    console.log(`Reproduction vs the committed outputs/verification-results.json on Node ${process.versions.node}: ${diffs.length === 0 ? 'REPRODUCED' : `DIFFERS (${diffs.length} fields, e.g. ${diffs.slice(0, 2).map((d: any) => d.path).join(', ')})`}`);
  }
  console.log(`runtime ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exitCode = v.exit;
}

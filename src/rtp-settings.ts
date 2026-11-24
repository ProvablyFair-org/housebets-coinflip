// RTP-CLAIM wiring — HouseBets coin flip: the exact RTP of every legal setting and the claim it is held to.
// The rule is src/rtp-claim.ts, a byte-identical copy of the framework's core/rtp-claim.ts (conformance C-13 compares the
// SHA-256), version 1.2.0. The switch src/rtp-claim-switch.ts is ON (Methodology v1.1, 14 Oct 2026): the -19 check is
// scored; a house-side miss is OVERSTATED and the verdict RTP FIGURE OVERSTATED (exit 5), never NOT PROVABLY FAIR. The claim's
// source names the place(s) it is shown, from the rule's six (game page, fairness page, help page, bet panel, rules, game
// settings); the fairness answer (E01) is the game settings the site loads: every live game bundle requests its "/fairness".
//
// SETTINGS. Every legal setting of the published game (src/rules.ts allLaws): the target game at every n = 1 … 10 and every
// target minTargets[n] … n (48), the multi toss at n = 2 … 10 coins (9), coins × flips at C = 2 … 10, F = 1 … 10 (90): 147.
// EXACT RTP. Σ over the payout levels of mult4 × weight, over 1e4 × 2^bits (the law's equally likely draw outcomes),
// integer arithmetic. CLAIM. Read from the exhibits at run time: src/exhibits.ts
// publishedClaim() parses the figure from every place it is published, and the claim is the highest of them (99 % today in all
// four). Places: the rules panel text in the game page's code (E02 rulesEdge1 "Every bet returns at most 99%
// over the long run, a 1% house edge", rulesCxfEdge, rulesMultiEdge) and the fairness answer the site loads (E01 summary "the
// return is at most 99% at every n and target"; the game bundle requests "/fairness"). No rendered page or screenshot of either
// was captured, so the source says "in the game's page code" and "loaded", not "shown".
// Not scored here: the truncation of each payout to the wallet's 1e-8 unit, which depends on the stake.
//   npm run rtp-claim:write    rewrite outputs/rtp-claim-table.json and print its SHA-256 to pin
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RtpClaimAccumulator, rtpClaimTable, rtpClaimGate } from './rtp-claim';
import type { RtpClaim, RtpClaimResult, RtpClaimGate } from './rtp-claim';
import { allLaws, moments } from './rules.ts';
import { publishedClaim } from './exhibits.ts';
import { ROOT } from './loader.ts';

/** The claim, built from the exhibits each time it is asked for. Throws when E02's rules panel sentence gives no figure
 *  (COINFLIP-19 is then a FAIL, never a pass on a figure nobody published). */
export function rtpClaim(): RtpClaim {
  const c = publishedClaim();
  if (!c.ok) throw new Error(`no RTP claim can be read from the exhibits: ${c.why.join('; ')}`);
  const fig = (i: number) => (c.places[i].figurePct === null ? 'no figure' : `${c.places[i].figurePct}%`);
  return {
    kind: 'flat',
    rtp: c.rtp,
    source: `HouseBets coin flip, in the rules: the rules panel text in the game page's code (E02 rulesEdge1 "${c.places[0].text}"; rulesCxfEdge ${fig(1)}; rulesMultiEdge ${fig(2)}), bundle platform-housegames-coinflip-game.js sha256 2817660d…, loaded by the live page 10 Oct 2026; and in the game settings the site loads: the fairness answer (E01 summary "the return is at most ${c.places[3].figurePct ?? '?'}% at every n and target", GET /housegames/coinflip/fairness, 12 Oct 2026, which the game bundle requests); and the same three sentences in the live copy of that bundle (E08, fetched 19 Oct 2026, last-modified 16 Oct 2026: rulesEdge1 ${fig(4)}, rulesCxfEdge ${fig(5)}, rulesMultiEdge ${fig(6)}); read by the verifier from the three exhibits; places agree: ${c.agree}; no rendered page was captured`,
  };
}
export const RTP_CLAIM_TABLE = join(ROOT, 'outputs', 'rtp-claim-table.json');
/** SHA-256 of the committed table — re-pin with the run that rewrote it (npm run rtp-claim:write). */
export const RTP_CLAIM_TABLE_SHA256 = '0fd27045a48b5d8c464286c1f0a29ced3447f23b02a3b84927eedd599fad32e8';

export function computeRtpClaim(): RtpClaimResult {
  const acc = new RtpClaimAccumulator(rtpClaim(), { retainRows: 'all' });
  for (const l of allLaws()) {
    const { m1, den } = moments(l);
    acc.add(l.key, m1, den * 10000n, l.mode === 'target' ? 'target game' : l.mode === 'multi' ? 'multi toss' : 'coins x flips');
  }
  return acc.result();
}

export function rtpClaimTableText(r: RtpClaimResult): string {
  return rtpClaimTable(r, {
    package: 'housebets/coinflip', game: 'coinflip',
    settingSpace: 'every legal setting: target game n = 1-10 at every target minTargets[n]-n (48), multi toss n = 2-10 (9), coins x flips C = 2-10 x F = 1-10 (90); 147 settings, every row retained',
    rtpMethod: 'exact rational: sum over payout levels of floor4 multiplier x binomial weight, over 1e4 x 2^bits (src/rules.ts laws)',
  });
}

export function runRtpClaimGate(r: RtpClaimResult = computeRtpClaim()): RtpClaimGate {
  return rtpClaimGate(r, rtpClaimTableText(r), RTP_CLAIM_TABLE, RTP_CLAIM_TABLE_SHA256);
}

if (process.argv[1] && /rtp-settings\.ts$/.test(process.argv[1])) {
  const text = rtpClaimTableText(computeRtpClaim());
  writeFileSync(RTP_CLAIM_TABLE, text);
  console.log(`wrote outputs/rtp-claim-table.json sha256 ${createHash('sha256').update(text).digest('hex')}`);
}

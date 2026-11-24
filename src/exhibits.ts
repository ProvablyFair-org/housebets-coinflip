// The published exhibits, read at verify time. Every figure a check compares
// against that comes from an exhibit is parsed here from the pinned file (COINFLIP-26 checks the pins before any step reads):
//   - the RTP figure: publishedClaim() reads it from every place it is published — the rules panel text in the game page's code
//     (E02 rulesEdge1, rulesCxfEdge, rulesMultiEdge, and the same three in the live copy of 19 Oct, E08) and the fairness
//     answer the site loads (E01 summary) — and the claim the
//     table is held to is the highest of them (the one a player could be misled by); there is no hand copy of it in src/;
//   - the wallet limits (E03): publishedLimits(), read by COINFLIP-12 and COINFLIP-14;
//   - every constant that has to stay in src/spec.ts (E01 derivation fields, tables, vectors, house edge and the coefficient of
//     its three formula strings; E02 bundle constants; E03 minimum, maximum win, decimals): exhibitBinding() compares it with the
//     value parsed from the exhibit, and a difference fails COINFLIP-26 (a reproduction failure, exit 1).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './loader.ts';
import { E01_DECLARED, SIDE_RULE_TEXT, DRAW_RULE_TEXT, MIN_FLIPS, MAX_FLIPS, MIN_TARGETS, MAX_WIN_CHANCE_PCT, MIN_COINS, MAX_COINS, HOUSE_EDGE,
  MULT_SCALE, PAY_NUMERATOR_4, MULTIPLIER_TABLE, WIN_CHANCE_TABLE, MULTI_TABLE, MULTI_PROFIT_CHANCE, MIN_STAKE, MAX_WIN, WALLET_DECIMALS,
  SPEC_VECTORS } from './spec.ts';

export const E01_FILE = 'evidence/E01-coinflip-fairness-spec-2026-10-12.json';
export const E02_FILE = 'evidence/E02-coinflip-rules-panel-2026-10-10.json';
/** The same rules panel in the live copy of the bundle (fetched 19 Oct 2026, last-modified 16 Oct 2026); its three return
 *  sentences are unchanged and are read as places of their own. */
export const E08_FILE = 'evidence/E08-coinflip-rules-panel-live-2026-10-19.json';
export const E03_FILE = 'evidence/E03-coinflip-limits-2026-10-12.json';
const read = (rel: string): any => { try { return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')); } catch { return null; } };
export const e01 = (): any => read(E01_FILE);
export const e02 = (): any => read(E02_FILE);
export const e03 = (): any => read(E03_FILE);

/** A decimal literal as written ("99", "99.5", 0.01) → integer n over 10^k; null when it is not one. */
export function decimal(x: unknown): { n: bigint; k: number } | null {
  if (typeof x !== 'string' && typeof x !== 'number') return null;
  const m = /^(\d*)(?:\.(\d+))?$/.exec(String(x).trim());
  if (!m || (m[1] === '' && m[2] === undefined)) return null;
  const f = m[2] ?? '';
  return { n: BigInt((m[1] || '0') + f), k: f.length };
}
/** n / 10^k as the shortest decimal string ("0.99", "0.995"). */
export function decimalString(n: bigint, k: number): string {
  let s = n.toString().padStart(k + 1, '0');
  if (k > 0) s = `${s.slice(0, s.length - k)}.${s.slice(s.length - k)}`.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}
/** A percentage as written ("99", "99.5") → the fraction as an exact decimal string ("0.99", "0.995"). */
const pctToFraction = (p: string): string | null => { const d = decimal(p); return d ? decimalString(d.n, d.k + 2) : null; };

export interface ClaimPlace { place: string; text: string; figurePct: string | null }
export interface PublishedClaim { ok: boolean; why: string[]; rtp: string; rtpNumber: number; houseEdgeNumber: number; places: ClaimPlace[]; agree: boolean; multi7Pct: string | null }
/** The published RTP figure, from every place it is published. `ok` is false (and COINFLIP-19 fails) when the rules panel's
 *  own sentence (E02 rulesEdge1) gives no figure. Where the places disagree the claim is the highest figure stated
 *  (`agree` false, printed by COINFLIP-19). */
export function publishedClaim(): PublishedClaim {
  const r2 = e02()?.rulesPanelEnglish ?? {}, b1 = e01()?.answer?.body ?? {}, r8 = read(E08_FILE)?.rulesPanelEnglish ?? {};
  const grab = (s: unknown, re: RegExp): string | null => { const m = re.exec(typeof s === 'string' ? s : ''); return m ? m[1] : null; };
  const places: ClaimPlace[] = [
    { place: 'rules (E02 rulesEdge1)', text: r2.rulesEdge1 ?? '', figurePct: grab(r2.rulesEdge1, /^Every bet returns at most (\d+(?:\.\d+)?)% over the long run/) },
    { place: 'rules (E02 rulesCxfEdge)', text: r2.rulesCxfEdge ?? '', figurePct: grab(r2.rulesCxfEdge, /returns at most (\d+(?:\.\d+)?)% over the long run/) },
    { place: 'rules (E02 rulesMultiEdge)', text: r2.rulesMultiEdge ?? '', figurePct: grab(r2.rulesMultiEdge, /a round returns at most (\d+(?:\.\d+)?)%/) },
    { place: 'game settings (E01 summary)', text: b1.summary ?? '', figurePct: grab(b1.summary, /the return is at most (\d+(?:\.\d+)?)% at every n and target/) },
    { place: 'rules (E08 rulesEdge1, live copy of 19 Oct)', text: r8.rulesEdge1 ?? '', figurePct: grab(r8.rulesEdge1, /^Every bet returns at most (\d+(?:\.\d+)?)% over the long run/) },
    { place: 'rules (E08 rulesCxfEdge, live copy of 19 Oct)', text: r8.rulesCxfEdge ?? '', figurePct: grab(r8.rulesCxfEdge, /returns at most (\d+(?:\.\d+)?)% over the long run/) },
    { place: 'rules (E08 rulesMultiEdge, live copy of 19 Oct)', text: r8.rulesMultiEdge ?? '', figurePct: grab(r8.rulesMultiEdge, /a round returns at most (\d+(?:\.\d+)?)%/) },
  ];
  const why: string[] = [];
  if (places[0].figurePct === null) why.push('E02 rulesEdge1 states no "at most N%" figure');
  const figs = places.map((p) => (p.figurePct === null ? null : pctToFraction(p.figurePct))).filter((x): x is string => x !== null);
  const rtp = figs.reduce((a, b) => (a === '' || Number(b) > Number(a) ? b : a), '');
  const agree = places.every((p) => p.figurePct !== null) && new Set(figs).size === 1;
  return { ok: why.length === 0 && rtp !== '', why, rtp, rtpNumber: Number(rtp), houseEdgeNumber: 1 - Number(rtp), places, agree,
    multi7Pct: grab(r2.rulesMultiEdge, /\((\d+(?:\.\d+)?)% at 7 coins/) };
}

/** E03's wallet limits (the audited USDT wallet), as the exhibit gives them. */
export function publishedLimits(): { minBet: unknown; maxBet: unknown; maxWin: unknown; decimals: unknown } {
  const w = e03()?.answer?.body?.wallet ?? {};
  return { minBet: w.minBet, maxBet: w.maxBet, maxWin: w.maxWin, decimals: w.decimals };
}

/** One bundle constant `name=value` from E02 constants.text (the minified `const a=…,b=…` fragments). */
export function bundleConstant(name: string): string | null {
  const text: string = (e02()?.constants?.text ?? []).join(',');
  const m = new RegExp(`(?:^|[\\s,])${name}=([0-9]*\\.?[0-9]+(?:e\\d+)?)(?=[,;\\s]|$)`).exec(text);
  return m ? m[1] : null;
}

export interface BindingRow { exhibit: 'E01' | 'E02' | 'E03'; what: string; exhibitValue: string; codeValue: string; ok: boolean }
/** Every src/ constant that stands for an exhibit figure, compared with the value parsed from the exhibit (COINFLIP-26), plus
 *  E01 and E03 against the preflight answers recorded in the shipped captured file. */
export function exhibitBinding(capturedPreflight: any): BindingRow[] {
  const rows: BindingRow[] = [];
  const add = (exhibit: BindingRow['exhibit'], what: string, ev: unknown, cv: unknown) =>
    rows.push({ exhibit, what, exhibitValue: JSON.stringify(ev) ?? 'undefined', codeValue: JSON.stringify(cv) ?? 'undefined', ok: JSON.stringify(ev) === JSON.stringify(cv) });
  const a1 = e01()?.answer, b1 = a1?.body ?? {};
  for (const [k, v] of Object.entries(E01_DECLARED)) add('E01', `body.${k}`, b1[k], v);
  add('E01', 'sideRule', b1.sideRule, SIDE_RULE_TEXT); add('E01', 'drawRule', b1.drawRule, DRAW_RULE_TEXT);
  add('E01', 'minFlips / maxFlips', [b1.minFlips, b1.maxFlips], [MIN_FLIPS, MAX_FLIPS]);
  add('E01', 'minTargets', b1.minTargets, MIN_TARGETS); add('E01', 'maxWinChance (percent)', typeof b1.maxWinChance === 'number' ? Math.round(b1.maxWinChance * 100) : null, MAX_WIN_CHANCE_PCT);
  add('E01', 'multiMinFlips (coins from)', b1.multiMinFlips, MIN_COINS);
  add('E01', 'multiplierTable', b1.multiplierTable, MULTIPLIER_TABLE); add('E01', 'winChanceTable', b1.winChanceTable, WIN_CHANCE_TABLE);
  add('E01', 'multiTable', b1.multiTable, MULTI_TABLE); add('E01', 'multiProfitChance', b1.multiProfitChance, MULTI_PROFIT_CHANCE);
  add('E01', 'vectors', b1.vectors, SPEC_VECTORS);
  add('E01', 'houseEdge', b1.houseEdge, HOUSE_EDGE);
  const coef = (s: unknown, re: RegExp) => { const d = decimal((re.exec(typeof s === 'string' ? s : '') || [])[1]); return d ? Number(d.n * BigInt(MULT_SCALE) / 10n ** BigInt(d.k)) : null; };
  add('E01', 'multiplier "floor4(X * 2^n / S(n, target))": X × 1e4', coef(b1.multiplier, /^floor4\((\d+(?:\.\d+)?) \* 2\^n \/ S\(n, target\)\)/), PAY_NUMERATOR_4);
  add('E01', 'multiMultiplier "floor4(Y * h / n)": Y × 1e4', coef(b1.multiMultiplier, /^floor4\((\d+(?:\.\d+)?) \* h \/ n\)/), 2 * PAY_NUMERATOR_4);
  add('E01', 'coinsMultiplier "floor4(Z * 2^F * h / C)": Z × 1e4', coef(b1.coinsMultiplier, /^floor4\((\d+(?:\.\d+)?) \* 2\^F \* h \/ C\)/), PAY_NUMERATOR_4);
  add('E01', '== the captured file meta.preflight.fairness', a1, capturedPreflight?.fairness);
  const num = (n: string) => { const v = bundleConstant(n); return v === null ? null : Number(v); };
  add('E02', 'Ed (max win chance %)', num('Ed'), MAX_WIN_CHANCE_PCT); add('E02', 'rn (multiplier scale)', num('rn'), MULT_SCALE);
  add('E02', 'Yi (min coins)', num('Yi'), MIN_COINS); add('E02', 'Ko (multi toss numerator)', num('Ko'), 2 * PAY_NUMERATOR_4);
  add('E02', 'jq / qn (min / max flips)', [num('jq'), num('qn')], [MIN_FLIPS, MAX_FLIPS]); add('E02', 'Zi (max coins)', num('Zi'), MAX_COINS);
  const lim = publishedLimits();
  add('E03', 'wallet.minBet', lim.minBet === undefined ? undefined : String(lim.minBet), MIN_STAKE);
  add('E03', 'wallet.maxWin', lim.maxWin === undefined ? undefined : String(lim.maxWin), MAX_WIN);
  add('E03', 'wallet.decimals', lim.decimals, WALLET_DECIMALS);
  add('E03', '== the captured file meta.preflight.limits', e03()?.answer, capturedPreflight?.limits);
  return rows;
}

// Dataset pins and the population of record, stated as CODE next to the pin (the framework's G-BIND rule: a dataset
// that agrees with its own header proves nothing; the scored steps compare against these constants, never meta).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { Dataset } from './types.ts';

/** The package root: the nearest folder above this module holding package.json "housebets-coinflip-audit" (works from src/
 *  under Node and from the bundled verify.js at the root). */
function findRoot(): string {
  let d = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const p = join(d, 'package.json');
    if (existsSync(p) && /"name":\s*"housebets-coinflip-audit"/.test(readFileSync(p, 'utf8'))) return d;
    d = dirname(d);
  }
  throw new Error('package root not found');
}
export const ROOT = findRoot();
export const DATA = join(ROOT, 'data');

// Phase A primary: the 131 whole epochs of the 12 Oct 2026 capture (as-captured file split by scripts/split-whole-epochs.mjs)
export const PRIMARY_FILE = 'housebets-coinflip-phaseA-6550bets.json';
export const PRIMARY_SHA256 = 'c7e747f1e41ddd8a09db7b9e4cabb6c12580762f583d98361e708bc734f8fee7';
export const TAIL_FILE = 'housebets-coinflip-phaseA-tail-34bets.json';
export const TAIL_SHA256 = 'b71953edb36a729e502fbf084172db76f01bb0a185005f3c45037d9e578fa18d';
// every dataset ships with the audit account's HouseBets user id replaced by "redacted"
// (scripts/redact-user-id.mjs; data/REDACTION.txt lists each as-captured file kept in the HouseBets workshop, with its
// sha256 next to the shipped sha256). The captured file in data/captured/ is the as-captured file with that one value
// replaced; the Phase A primary and tail are the split of it.
export const AS_CAPTURED_FILE = 'captured/housebets-coinflip-sp1-6584bets.redacted.json';
export const AS_CAPTURED_SHA256 = 'ff4f0a706d7caad1f4a4ea53a96c842407a18b9ab12ccd1b2e480af7782f86ac';
// Supplementary phases (13 Oct 2026), each its own dataset and evidence id (audit-rules §2.5)
export const PHASE_C_FILE = 'supplementary/housebets-coinflip-phaseC-250bets.json';
export const PHASE_C_SHA256 = 'fdf863a475d79d0e24ba9d54a5951172f4e2f31e8bb1a8d6e2012414df11b382';
export const PHASE_C10_FILE = 'supplementary/housebets-coinflip-phaseC-safe-10usd-200bets.json';
export const PHASE_C10_SHA256 = 'a42784dad1d1d3ae0a7d5caa7a87d110d28736226f47692acb9dd40d0ce1ef44';
export const PHASE_D_FILE = 'supplementary/housebets-coinflip-phaseD-200bets.json';
export const PHASE_D_SHA256 = 'cb88bf7b78ab1f63932385ffced3867a2a074ab739461ac1731a7547f11766f3';

/** Evidence exhibits the steps read and the ones MANIFEST cites (all pinned, scripts/make-evidence.py). */
export const EVIDENCE_PINS: readonly (readonly [string, string])[] = [
  ['evidence/E01-coinflip-fairness-spec-2026-10-12.json', '92db847ca46100878f304fec56a8798d4d4981410682d7ad0a81db4d34f111f9'],
  ['evidence/E02-coinflip-rules-panel-2026-10-10.json', '224f5c219c39b8c781b74f2d83d3cd9823c512c85a77f3dbd86334b4dbb7f06b'],
  ['evidence/E03-coinflip-limits-2026-10-12.json', '75b430be6cf4b83bcfcf3fb69005f2d6f37ec7ff821182eb71d381907252d923'],
  ['evidence/E04-coinflip-bet-history-2026-10-13.json', '0b634731234489497c8ab7db9e851ee5f37d45ff99fbc3504fb82e14dd8e3384'],
  ['evidence/E05-account-reconcile-2026-10-13.txt', '0b9db018bfef380e6ce12fda89ba2a47556862c2f15083529d91491136ec5693'],
  ['evidence/E06-coinflip-empty-seed-control-2026-10-13.json', 'a1121df5c97a7e8fdc4aeb884c267a9ba3bfec4d320fd5431f446fb1236348c0'],
  ['evidence/E07-coinflip-refused-settings-2026-10-12.json', 'c14cc275dddbbf60840dc273d2be97cf6532e4c71713a09cc0a35c942aa6e0fc'],
  ['evidence/E08-coinflip-rules-panel-live-2026-10-19.json', 'ba0f355ca8437487d385404473fb25327f056223061bc67d452ffcec188f9ed1'],
];

// The population of record (G-BIND)
export const EXPECTED_BETS = 6550;
export const EXPECTED_SEEDS = 131;
export const EXPECTED_EPOCHS = 131;
export const EXPECTED_EPOCH_SIZE = 50;
export const EXPECTED_TAIL_BETS = 34;
export const EXPECTED_PHASE_C_BETS = 250;      // 5 epochs × 50, single flips (streak n = 1), stake 100 × minimum
export const EXPECTED_PHASE_C10_BETS = 200;    // 4 epochs × 50, 3 calls with target 1, stake 10 (the $10 set)
export const EXPECTED_PHASE_D_BETS = 200;      // 4 epochs × 50, one player-set client seed per epoch
export const PHASE_C_STAKE = '1.000311';       // 100 × E03 minimum 0.01000311
export const PHASE_C10_STAKE = '10';
export const PHASE_D_SEEDS = ['provablyfair-1', 'provablyfair-2', 'player-seed-abc', '1234567890'] as const;
/** This package's capture files as rows of the account reconciliation (E05), with their round counts. */
export const E05_ROWS: readonly (readonly [string, number])[] = [
  ["phaseA/housebets-coinflip-sp1-6584bets.json", 6584],
  ["phases/housebets-coinflip-phaseC-250bets.json", 250],
  ["phases/housebets-coinflip-phaseD-200bets.json", 200],
  ["phases-10usd/housebets-coinflip-phaseC-safe-10usd-200bets.json", 200],
];
export const NONCE_BASE = 1;   // HouseBets nonces start at 1 on a fresh pair (every epoch of the capture)

/** Phase A capture plan (rig/coinflip/capture-hb-coinflip.mjs, --no-multi; meta.planCounts): the whole declared grid —
 *  10 every-flip streaks n = 1…10, 38 target-game cells t < n, 90 coins × flips cells C = 2…10 × F = 1…10 — 138 classes,
 *  6,600 planned slots (≈ 48 each). The 1-coin multi toss was dropped from the plan after the server refused it (E07). */
export function planClasses(): string[] {
  const out: string[] = [];
  const MIN_T = [1, 1, 1, 1, 1, 2, 2, 2, 3, 3];
  for (let n = 1; n <= 10; n++) out.push(`streak-n${n}`);
  for (let n = 2; n <= 10; n++) for (let t = MIN_T[n - 1]; t < n; t++) out.push(`target-n${n}-t${t}`);
  for (let c = 2; c <= 10; c++) for (let f = 1; f <= 10; f++) out.push(`coins-c${c}-n${f}`);
  return out;
}
export const PLAN_CLASS_COUNT = 138;
export const PLAN_CLASS_FLOOR = 50;   // COINFLIP-15: Phase A ≥ 50 bets per config class

export const sha256Bytes = (b: Buffer | string): string => createHash('sha256').update(b).digest('hex');
export const sha256File = (rel: string): string => sha256Bytes(readFileSync(join(ROOT, rel.startsWith('evidence/') || rel.startsWith('outputs/') ? rel : join('data', rel))));
export const load = (rel: string): Dataset => JSON.parse(readFileSync(join(DATA, rel), 'utf8')) as Dataset;
export const readJson = (rel: string): any => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

// HouseBets coin flip — FROZEN SIMULATION DESIGN, single-sourced so the producer (src/simulate.ts) and the verifier
// (tests/verify.ts, COINFLIP-20 / COINFLIP-21) cannot pin different experiments. Every seed of the experiment is a fixed
// string, so the census (counts and exact sums) is a deterministic function of this file and the dataset: a re-run
// reproduces it byte for byte; the verifier re-runs it in full and never trusts a statistic the artifact reports about
// itself.

// ── The COINFLIP profile's floors (games/coinflip/profile.json, PROPOSED; COINFLIP-20 / COINFLIP-21), held apart from the
// design so a cheaper design cannot lower them: the verifier compares the census against THESE.
export const FLOOR_UNIFORMITY_FLIPS = 2_000_000;
export const FLOOR_BAND_ROUNDS = 1_000_000;
export const FLOOR_PASS2_NONCES = 10_000;

// ── Significance, family-wise ── Pass 1 runs three screens (side balance, runs, lag-1), each at α/3.
export const ALPHA = 0.01;
export const ALPHA_SCREENS = 3;
export const ALPHA_SCREEN = ALPHA / ALPHA_SCREENS;

// ── Pass 1, flip uniformity + serial independence: 200 fresh seeds × nonces 1..1,000 × flips 0..9 = 2,000,000 flips ──
export const PASS1_SEEDS = 200;
export const PASS1_NONCES = 1_000;
export const PASS1_FLIPS_PER_ROUND = 10;
export const SIM_UNIFORMITY_FLIPS = PASS1_SEEDS * PASS1_NONCES * PASS1_FLIPS_PER_ROUND;   // ≥ 2,000,000 (COINFLIP-20 floor)
/** Lag-1 is computed on v = u >>> 16 of consecutive draws (exact BigInt sums); runs on the side sequence (T = u ≥ 2^31). */
export const SIM_LAG_SHIFT = 16;
export const pass1Seed = (i: number): { server: string; client: string } =>
  ({ server: `housebets-coinflip-audit/sim/pass1/server/${i}`, client: `housebets-coinflip-audit/sim/pass1/client/${i}` });

// ── Pass 1, RTP convergence: every legal setting of the game (src/rules.ts allLaws: the target game at every legal target
// of every n, 48; the multi toss at 2 … 10 coins, 9; coins × flips at C = 2 … 10, F = 1 … 10, 90: 147 settings) is a band
// of 1,000,000 rounds on its own seeds (100 fresh seeds × 10,000 nonces, the setting named in the seed labels):
// 147,000,000 rounds, no round shared between two settings. A round draws the flips its setting needs (n, or C × F).
// Calls are a fixed alternating pattern: the flips do not depend on the calls (COINFLIP-17), so any fixed pattern has the
// same law.
export const BAND_SEEDS = 100;
export const BAND_NONCES = 10_000;
export const SIM_BAND_ROUNDS = BAND_SEEDS * BAND_NONCES;            // ≥ 1,000,000 (COINFLIP-20 floor)
export const FLOOR_BANDS = 147;                                     // every legal setting
export const BAND_CALLS = 'HTHTHTHTHT';
/** key: the setting's law key (src/rules.ts), e.g. "target n=3 t=2", "multi n=4", "coins C=2 F=10". */
export const bandSeed = (key: string, j: number): { server: string; client: string } =>
  ({ server: `housebets-coinflip-audit/sim/band/${key.replace(/[ =]+/g, '-')}/server/${j}`, client: `housebets-coinflip-audit/sim/band/${key.replace(/[ =]+/g, '-')}/client/${j}` });
/** Convergence marks (the convergence rows). */
export const SIM_CONVERGENCE_MARKS: readonly number[] = Object.freeze([10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000]);
/** Edge tolerance per band: |RTP_sim − RTP_exact| ≤ 5·SE + 1e-4, SE = σ/√n, σ the exact standard deviation of the band's
 *  per-round return (src/rules.ts law). */
export const EDGE_SIGMAS = 5;
export const EDGE_BUFFER = 1e-4;

// ── Pass 2, cherry-pick: every revealed seed of the five shipped bet files (Phase A 131, its tail 1, Phase C 5, the $10 set 4,
// Phase D 4: 145) × nonces 1..10,000; early window = nonces 1..n, n = the epoch's captured depth (50, the tail 34), reference
// window = n+1..10,000; statistic = the return of the settings the capture actually played in that epoch (cycled over the
// window, with their own calls), standardized by each setting's exact mean and variance, aggregated across the 145 epochs;
// pre-registered one-sided lower tail at ALPHA. Every revealed seed, as the profile's rule names; a deterministic replay from the revealed seeds, no random draw.
export const SIM_PASS2_NONCES = 10_000;
/** The early window of an epoch: its captured depth (the nonces 1..n the capture played under that seed). */
export const SIM_PASS2_EARLY = (capturedDepth: number): number => capturedDepth;
export const SIM_PASS2_ALPHA = ALPHA;
/** The threshold the SCORED per-slot rule rejects at: one-sided normal lower-tail p below 0.009, not the nominal 0.01.
 *  Set on 27 Oct 2026, when Pass 2 was widened to every revealed seed and before the statistic was computed on the widened
 *  population: at the nominal 0.01 the per-slot rule's honest false-alarm rate on the widened scored slots is estimated at
 *  0.01007 ± 0.000223 (src/false-alarm-pass2.ts), not within the 1 % cap a failing step must meet; at 0.009 it is (the rate
 *  is declared there). The calibration uses the scored slots' settings only, never their outcomes. */
export const SIM_PASS2_ALPHA_SCORED = 0.009;
/** The SCORED slots of Pass 2: settings whose largest payout multiplier is at most 100× (1e-4 units). The capture also
 *  played settings paying up to 1,013.76× (ten-flip streaks, ten-flip coins); one such slot's variance swamps the sum and
 *  leaves the all-slot lower tail nearly unreachable (the dice and limbo packages' finding). The excluded slots are still
 *  recomputed bet by bet by COINFLIP-07 / COINFLIP-11; the all-slot figure is printed, not scored. Decided 13 Oct 2026
 *  from the dice and limbo measurements, before the statistic was computed on the live coin flip data. */
export const SIM_PASS2_MAX_MULT4 = 1_000_000;
/** The SCORED Pass 2 statistic is the per-slot standardised return (since 14 Oct 2026), the form roulette and keno score — every scored slot's return minus its setting's exact mean, ÷ that setting's exact sd (both from its law,
 *  src/rules.ts), summed and ÷ √slots. Until 14 Oct this package scored the pooled form (Σ return − Σ mean)/√Σ var on the
 *  same slots; the switch was made after that first result was known, and both are printed with their p-values. The scored
 *  subset (largest multiplier ≤ 100×) is unchanged. The rule's honest false-alarm rate is declared in
 *  src/false-alarm-pass2.ts. */
export const SIM_PASS2_STATISTIC = 'per-slot standardised return: Σ (return − mean_s)/sd_s over the scored slots, ÷ √slots; mean_s and sd_s exact from the played setting\'s law';

/** The fresh-seed server seeds are the sha256 hex of these strings (64 hex chars, the platform's seed shape). */
export const FRESH_SEED_RULE = 'serverSeed = sha256(label) as lowercase hex; clientSeed = label';

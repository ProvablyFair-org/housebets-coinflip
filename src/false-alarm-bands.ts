// COINFLIP-20 band false-alarm bounds for bands whose per-round return takes more than two values (coins × flips: h of C
// coins survive). A two-valued band (the target game) uses the exact binomial rate (src/false-alarm.ts edgeBandFalseAlarm).
// Here the rate is BOUNDED, not estimated: Bernstein's inequality for n i.i.d. rounds with |X − μ| ≤ M and variance σ²,
//   P(|X̄ − μ| ≥ t) ≤ 2·exp(−n t² / (2σ² + 2Mt/3)),
// at the band's own tolerance t = 5·σ/√n + 1e-4. M is the band's largest multiplier (X ∈ [0, M], so |X − μ| ≤ M).
export function bernsteinBandFalseAlarm(n: number, sigma2: number, M: number, t: number): number {
  return Math.min(1, 2 * Math.exp((-n * t * t) / (2 * sigma2 + (2 * M * t) / 3)));
}

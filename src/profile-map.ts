// The COINFLIP profile's 30 checks (id, name, layer, kind, policy), generated from the framework's games/coinflip/profile.public.json
// (profileVersion 1.0.2-public, framework 1.1, sha256 97e02fd0303f80b686749ce20a6cc1f5344b5199691bd5074135f8796e767c62). Regenerate rather than edit.
export type Policy = 'HARD_FAIL' | 'FLAG' | 'INFORMATIONAL' | 'GRADED' | 'RELEASE_GATE';
export interface ProfileCheck { id: string; name: string; layer: string; kind: 'verifier-step' | 'package-check'; policy: Policy }
export const PROFILE_SHA256 = '97e02fd0303f80b686749ce20a6cc1f5344b5199691bd5074135f8796e767c62';
export const PROFILE_VERSION = "1.0.2-public";
export const PROFILE: readonly ProfileCheck[] = [
  { id: "COINFLIP-01", name: "Seed hash integrity", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-02", name: "Forward commitment chain", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-03", name: "Hash consistency within epoch", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-04", name: "Nonce continuity", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-05", name: "Population & epoch size (G-BIND)", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-06", name: "Client-seed influence & Phase D recomputation", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-07", name: "Outcome recomputation (flip sequence)", layer: "S2", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-08", name: "Draw bias bound", layer: "S2", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-09", name: "RNG reference vectors", layer: "S2", kind: "package-check", policy: "GRADED" },
  { id: "COINFLIP-10", name: "Match counting & win rule (all modes)", layer: "S2", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-11", name: "Payout arithmetic", layer: "S3", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-12", name: "Bet-size invariance (Phase C)", layer: "S3", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-13", name: "Multiplier formula & table provenance", layer: "S3", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-14", name: "Multiplier monotonicity & bounds", layer: "S3", kind: "verifier-step", policy: "FLAG" },
  { id: "COINFLIP-15", name: "Mode & setting coverage", layer: "S3", kind: "verifier-step", policy: "FLAG" },
  { id: "COINFLIP-16", name: "Wallet / balance reconciliation", layer: "S3", kind: "verifier-step", policy: "FLAG" },
  { id: "COINFLIP-17", name: "Call independence & declared modes", layer: "S3", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-18", name: "Anti-circularity (win probability)", layer: "S4", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-19", name: "Effective RTP per setting vs claim", layer: "S4", kind: "verifier-step", policy: "FLAG" },
  { id: "COINFLIP-20", name: "Simulation Pass 1 (fresh seeds)", layer: "S4", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-21", name: "Simulation Pass 2 (cherry-pick)", layer: "S4", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-22", name: "Live-sample fit", layer: "S4", kind: "verifier-step", policy: "INFORMATIONAL" },
  { id: "COINFLIP-23", name: "S5 fairness-integrity matrix", layer: "S5", kind: "package-check", policy: "GRADED" },
  { id: "COINFLIP-24", name: "Player-verifier parity", layer: "S6", kind: "package-check", policy: "GRADED" },
  { id: "COINFLIP-25", name: "Player check path documented", layer: "S6", kind: "package-check", policy: "GRADED" },
  { id: "COINFLIP-26", name: "Dataset & config pins", layer: "S7", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-27", name: "Artifacts of record", layer: "S7", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "COINFLIP-28", name: "Fresh-clone reproduction", layer: "S7", kind: "package-check", policy: "RELEASE_GATE" },
  { id: "COINFLIP-29", name: "Mutation battery", layer: "S7", kind: "package-check", policy: "GRADED" },
  { id: "COINFLIP-30", name: "Disclosure register & evidence appendix", layer: "S7", kind: "package-check", policy: "GRADED" },
];

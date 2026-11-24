// Shapes of the HouseBets new-engine coin flip capture (schema housebets-coinflip-capture-sp1, rig 12 Oct 2026).
// Only the fields the verifier reads are typed; the dataset carries more (raw answers under `_raw`).

/** A setting as the capture plan drew it. kind 'streak': every one of the n calls must land (target = n, no target field
 *  sent); 'target': at least t of the n calls (t < n, sent as `target`); 'coins': C coins each flip the n-letter calls
 *  pattern (sent as mode "multi", coins C). n is the number of calls (for coins, the flips per coin, F). */
export interface Setting {
  cls: string;
  kind: 'streak' | 'target' | 'coins';
  n: number;
  t?: number;
  coins?: number;
  calls: string;
}

export interface Bet {
  idx: number;
  epoch: number;
  nonce: number;
  setting: Setting;
  request: { calls: string; amount: number; target?: number; mode?: string; coins?: number };
  stake: number;
  outcome: string;            // the flip sequence the server answered (H / T), n flips, or C × F for coins
  echoedCalls: string;
  mode: string;               // "multi" for coins × flips, "" otherwise
  coins: number;              // C for coins × flips, 0 otherwise
  matched: number;            // the server's count: calls landed (target game) or surviving coins (coins × flips)
  echoedTarget: number;       // the server's target (0 in multi)
  flipCount: number;
  payoutMultiplier: number;
  payout: number;
  roundStake: number;
  roundId: string;
  respClientSeed: string;
  respHashedSeed: string;
  fairnessVersion: string;
  _raw: { round?: { roundId: string; stake: string | number; payout: string | number }; game?: { winChance?: number; flips?: string; matched?: number; target?: number } };
}

export interface Seed {
  seedId: string;
  epoch: number | string;
  clientSeed: string;
  clientSeedSource?: string;
  hashedServerSeed: string;
  hashedNextServerSeed: string;
  revealedServerSeed: string;
  nonceStart: number | string;
  nonceEnd: number | string;
  serverNonceAtRotation: number | string;
}

export interface Dataset {
  meta: { epochSize: number; schema: string; split?: { part: string; epochs: [number, number] } };
  seeds: Seed[];
  bets: Bet[];
}

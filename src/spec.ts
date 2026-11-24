// HouseBets House Games coin flip — the published spec, as code. Every constant cites its exhibit:
//   E01 = GET /housegames/coinflip/fairness (12 Oct 2026; the same body at 13:32Z and 17:04Z), fairness version "canonical"
//   E02 = the game page's rules panel and the constants / functions it is filled from (bundle sha256 2817660d…)
//   E03 = GET /housegames/limits/coinflip (12 Oct 2026)

/** E01 drawRule / sideRule: flip i reads draw i (bytes 4i..4i+3 of the stream, block floor(i/8)); side = floor(u / 2^32 × 2),
 *  0 = H, 1 = T. E02 rulesFair1: "the top bit of the draw picks the side". */
export const TWO32 = 4294967296;
export const SIDE_RULE_TEXT = 'side = floor(u / 2^32 * 2): 0 = H, 1 = T';
export const DRAW_RULE_TEXT = 'flip i reads draw i (bytes 4i..4i+3, block floor(i/8))';
export const DRAWS_PER_BLOCK = 8;

/** E01 minFlips / maxFlips; E02 jq = 1, qn = 10. */
export const MIN_FLIPS = 1;
export const MAX_FLIPS = 10;
/** E01 minTargets (index n − 1): the smallest legal target at n calls, keeping the win chance ≤ maxWinChance. */
export const MIN_TARGETS: readonly number[] = [1, 1, 1, 1, 1, 2, 2, 2, 3, 3];
/** E01 maxWinChance 0.98; E02 Ed = 98 (percent). */
export const MAX_WIN_CHANCE_PCT = 98;
/** E01 multiMinFlips 2 and "2 <= n <= 10"; E02 Yi = 2, Zi = 10: coins × flips (and multi toss) take 2 … 10 coins. */
export const MIN_COINS = 2;
export const MAX_COINS = 10;
/** E01 houseEdge 0.01; the multipliers are 0.99 × fair odds floored to 4 decimals (E02 rn = 1e4, Ko = 19800 = 1.98 × 1e4).
 *  PAY_NUMERATOR_4 = (1 − edge) × 1e4 = 9900 is the coefficient src/rules.ts pays with (multi toss: 2 × it); COINFLIP-26 compares
 *  HOUSE_EDGE, the coefficients of E01's three formula strings and E02's Ko with it at verify time. */
export const HOUSE_EDGE = 0.01;
export const MULT_SCALE = 10_000;
export const PAY_NUMERATOR_4 = Math.round((1 - HOUSE_EDGE) * MULT_SCALE);
/** E01's derivation fields as src/rng.ts implements them (COINFLIP-26 compares each with E01 at verify time). */
export const E01_DECLARED = { version: 'canonical', hash: 'HMAC-SHA256', key: 'serverSeed', message: 'clientSeed:nonce:block', bytesPerDigest: 32,
  bytesPerDraw: 4, byteOrder: 'big-endian', drawBits: 32 } as const;

/** E01 multiplierTable[n − 1][t − 1] (0 where t is below the minimum target). */
export const MULTIPLIER_TABLE: readonly (readonly number[])[] = [[1.98], [1.32, 3.96], [1.1314, 1.98, 7.92], [1.056, 1.44, 3.168, 15.84], [1.0219, 1.2184, 1.98, 5.28, 31.68], [0, 1.1115, 1.5085, 2.88, 9.0514, 63.36], [0, 1.056, 1.28, 1.98, 4.3696, 15.84, 126.72], [0, 1.026, 1.1572, 1.5548, 2.7251, 6.8497, 28.16, 253.44], [0, 0, 1.0877, 1.3269, 1.98, 3.899, 11.0191, 50.688, 506.88], [0, 0, 1.0472, 1.1954, 1.5889, 2.6263, 5.76, 18.1028, 92.16, 1013.76]];
/** E01 winChanceTable[n − 1][t − 1]: compared with the binomial law (COINFLIP-18), never used. */
export const WIN_CHANCE_TABLE: readonly (readonly number[])[] = [[0.5], [0.75, 0.25], [0.875, 0.5, 0.125], [0.9375, 0.6875, 0.3125, 0.0625], [0.96875, 0.8125, 0.5, 0.1875, 0.03125], [0, 0.890625, 0.65625, 0.34375, 0.109375, 0.015625], [0, 0.9375, 0.7734375, 0.5, 0.2265625, 0.0625, 0.0078125], [0, 0.96484375, 0.85546875, 0.63671875, 0.36328125, 0.14453125, 0.03515625, 0.00390625], [0, 0, 0.91015625, 0.74609375, 0.5, 0.25390625, 0.08984375, 0.01953125, 0.001953125], [0, 0, 0.9453125, 0.828125, 0.623046875, 0.376953125, 0.171875, 0.0546875, 0.0107421875, 0.0009765625]];
/** E01 multiTable[n − 2][h]: the multi toss payout of h landed coins out of n. */
export const MULTI_TABLE: readonly (readonly number[])[] = [[0, 0.99, 1.98], [0, 0.66, 1.32, 1.98], [0, 0.495, 0.99, 1.485, 1.98], [0, 0.396, 0.792, 1.188, 1.584, 1.98], [0, 0.33, 0.66, 0.99, 1.32, 1.65, 1.98], [0, 0.2828, 0.5657, 0.8485, 1.1314, 1.4142, 1.6971, 1.98], [0, 0.2475, 0.495, 0.7425, 0.99, 1.2375, 1.485, 1.7325, 1.98], [0, 0.22, 0.44, 0.66, 0.88, 1.1, 1.32, 1.54, 1.76, 1.98], [0, 0.198, 0.396, 0.594, 0.792, 0.99, 1.188, 1.386, 1.584, 1.782, 1.98]];
/** E01 multiProfitChance[n − 2]: P(the multi toss pays more than the stake). Compared, never used. */
export const MULTI_PROFIT_CHANCE: readonly number[] = [0.25, 0.5, 0.3125, 0.5, 0.34375, 0.5, 0.36328125, 0.5, 0.376953125];

/** The RTP figure is NOT held here: src/exhibits.ts publishedClaim() reads it at verify time
 *  from every place it is published (E02 rulesEdge1, rulesCxfEdge, rulesMultiEdge; E01 summary), so a different published
 *  figure reaches COINFLIP-19 unchanged. */

/** E03 wallet (USDT): minimum stake, maximum win, decimals. */
export const MIN_STAKE = '0.01000311';
export const MAX_WIN = '1000310.0961298';
export const WALLET_DECIMALS = 8;

/** E01 vectors: the published worked examples with the ten draws each reads and the flips they give. */
export const SPEC_VECTORS = [
  { serverSeed: 'housebets-demo-server-seed-0001', clientSeed: 'demo-client', nonce: 1, draws: [3067352357, 880954808, 1637878786, 1213675087, 2326647103, 481855596, 869634276, 4138718340, 46131377, 3723417200], flips: 'THHHTHHTHT' },
  { serverSeed: 'housebets-demo-server-seed-0001', clientSeed: 'demo-client', nonce: 2, draws: [3513789633, 3704205235, 4082071176, 3974859369, 1834324468, 2966423167, 1756594492, 326666741, 4018305093, 2368563117], flips: 'TTTTHTHHTT' },
  { serverSeed: 'housebets-demo-server-seed-0001', clientSeed: 'demo-client', nonce: 3, draws: [3992373399, 3852400509, 2969170821, 4161949375, 2510937394, 4245317386, 1949181640, 1567307363, 823558778, 3257615408], flips: 'TTTTTTHHHT' },
  { serverSeed: '5a1f7d2c9e4b8a3f6d0c2b5e8f1a4d7c0b3e6f9a2d5c8b1e4f7a0d3c6b9e2f5a', clientSeed: 'housebets', nonce: 1, draws: [2685149531, 1108199734, 1000979962, 1862519711, 2284294031, 2871666960, 2441563412, 3986912474, 2926435096, 4100296077], flips: 'THHHTTTTTT' },
] as const;

/** The commitment encoding: the capture's commitments are sha256 of the server seed's UTF-8 text (COINFLIP-01). */
export const COMMITMENT_ENCODING = 'sha256(utf8(serverSeed)) as lowercase hex';

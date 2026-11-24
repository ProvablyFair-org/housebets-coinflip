// COINFLIP-09 RNG reference vectors: the worked examples of HouseBets' own published coin flip spec
// (GET /housegames/coinflip/fairness, read 12 Oct 2026, evidence E01: each example carries its ten draws and ten flips).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draws, flips, sideOf } from '../src/rng.ts';
import { mult4Target, mult4Multi, mult4Coins, matchedOf, mult4Of, payout8, units8, units4, flipsNeeded } from '../src/rules.ts';
import { SPEC_VECTORS, MULTIPLIER_TABLE, TWO32 } from '../src/spec.ts';
import { load, PRIMARY_FILE } from '../src/loader.ts';

for (const v of SPEC_VECTORS) {
  test(`spec example ${v.clientSeed}:${v.nonce} -> ${v.flips}`, () => {
    assert.deepEqual(draws(v.serverSeed, v.clientSeed, v.nonce, 10), [...v.draws]);
    assert.equal(flips(v.serverSeed, v.clientSeed, v.nonce, 10), v.flips);
  });
}
test('side is the top bit of the draw', () => {
  assert.equal(sideOf(0), 0); assert.equal(sideOf(2 ** 31 - 1), 0); assert.equal(sideOf(2 ** 31), 1); assert.equal(sideOf(TWO32 - 1), 1);
});
test('multipliers: 1.98 for one flip, 1013.76 for ten, the published table at n = 6', () => {
  assert.equal(mult4Target(1, 1), 19800n);
  assert.equal(mult4Target(10, 10), 10137600n);
  for (let t = 2; t <= 6; t++) assert.equal(mult4Target(6, t), units4(MULTIPLIER_TABLE[5][t - 1]));
});
test('E02 example: 5 coins x 3 flips, 3 survive pays 4.752x; 7 of 10 multi coins pays 1.386x', () => {
  assert.equal(mult4Coins(5, 3, 3), 47520n);
  assert.equal(mult4Multi(10, 7), 13860n);
});
// a real coins × flips winner from the primary dataset: the first one (idx 2, coins-c4-n3, 12 flips, 1 survivor)
test('captured bet idx 2 recomputes from its revealed seed', () => {
  const ds = load(PRIMARY_FILE);
  const b = ds.bets.find((x) => x.idx === 2)!;
  const s = ds.seeds.find((x) => Number(x.epoch) === b.epoch)!;
  const fl = flips(s.revealedServerSeed, s.clientSeed, b.nonce, flipsNeeded(b.setting));
  assert.equal(fl, b.outcome);
  assert.equal(matchedOf(b.setting, fl), b.matched);
  assert.equal(units8(b.payout), payout8(units8(b.stake), mult4Of(b.setting, b.matched)));
});

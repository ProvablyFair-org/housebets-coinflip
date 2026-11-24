# HouseBets Coin Flip — Provably Fair Audit (new engine, October 2026)

**Auditor:** [ProvablyFair.org](https://www.provablyfair.org) · **Audit ID:** PF-2026-HB10 · **Release:** `v1.0.0` (the first public release) · **Capture:** 12–13 October 2026

**Result: PROVABLY FAIR — Full Pass.** Of the 22 scored checks of the framework's COINFLIP profile, 21 PASS and 1 is a
capture-origin FLAG, with 0 FAIL: COINFLIP-15 (the capture plan placed 45–48 bets per setting class, under the profile's
floor of 50), disclosed and verdict-neutral. COINFLIP-14 passes with the max-win refusal declared unwitnessed, as its rule
text allows (no bet came near the cap, so the refusal was never produced). Every one of the 7,234 shipped bets recomputes exactly from its revealed server seed: every
flip, the calls landed or coins surviving, the multiplier and the payout.
COINFLIP-16 (wallet reconciliation) passes on the platform's bet history and the account reconciliation; the comparison of consecutive balances the profile describes was not possible in this capture, because other games were captured on the same account at the same time (MANIFEST.md DL-8).

**Theoretical RTP is at most 99 % (house edge at least 1 %) on every setting**: the exact RTP of the 147 settings of the
published spec (each flip an exact fair bit: the top bit of a draw, COINFLIP-08) runs from 98.9929687 % (target game, 2 of 6) to 99.0000000 % before the payout is truncated to 0.00000001, exactly 99 % on the 115 settings whose
multipliers need no rounding to 4 decimals. Observed return over the 6,550 Phase A bets: 95.4523 % (62.54067626 paid on
65.52037050 staked), variance, not RTP evidence.

**Scope:** HouseBets House Games **Coin Flip** on the engine served since October 2026 (fairness version `canonical`), the
USDT wallet, every mode the published spec describes: flips in a row (1 to 10), the target game (at least t of n calls) and
coins × flips (2 to 10 coins, 1 to 10 flips each; one flip per coin is the Multi tab). One audit account, in a logged-in
browser session, captured through the game's own API calls: 6,550 Phase A bets at the minimum stake plus a 34-bet tail,
250 single flips at 100 × the minimum, 200 bets at $10 and 200 bets under four client seeds typed by the auditor. Not
covered: a second account, server-side code, the security of the platform and the other House Games (their own packages).
Limitations: [MANIFEST.md, Limitations and trust](MANIFEST.md#limitations-and-trust).

[Audit report](https://audit.provablyfair.org/casino/housebets/games/coinflip/overview) · [Public repository](https://github.com/ProvablyFair-org/housebets-coinflip) · [MIT license](LICENSE)

## What was verified

| Check | Captured evidence |
|---|---|
| Flips | 7,234 / 7,234 flip sequences recomputed from the revealed server seed (6,550 Phase A, 34 tail, 250 Phase C, 200 at $10, 200 Phase D), against HouseBets' published algorithm (E01) and compared with the server's own raw answer |
| Match count, multiplier, payout | 7,234 / 7,234 settle by the published rules (E01, E02): calls landed or coins surviving, multiplier the fair odds × 0.99 rounded down to 4 decimals, payout truncated to 0.00000001 |
| Seeds and nonces | 145 / 145 revealed seeds hash to their commitments; the next-seed chain links from a pre-capture anchor; nonces 1..50 in every Phase A seed pair |
| Platform records | every bet in the platform's own bet history with the same stake and payout (E04); the account's full reconciliation (E05) |
| Draw bias | each flip is the top bit of a 32-bit draw: heads and tails each take exactly 2^31 of the 2^32 draws |
| RTP claim | the 99 % in the rules (E02, E08) and the fairness answer (E01) holds on all 147 settings (RTP-CLAIM 1.2.0, COINFLIP-19) |
| Simulation | 2,000,000 flips for balance and independence; 147 bands of 1,000,000 rounds, one for every legal setting and each on its own seeds (147,000,000 rounds); Pass 2 replays every one of the 145 revealed seeds over 10,000 nonces: no seed cherry-picking detected (z −1.063, p 0.1439) |

## Run the audit

Nothing to install: `node verify.js` runs on Node 22, `npm test` (the TypeScript sources) on Node 22.6 or later:

```
node verify.js          # the standalone verifier (generated from tests/verify.ts by npm run build:standalone)
npm test                # the same suite from the TypeScript sources, plus the RNG reference vectors
```

Expected, at the end of `node verify.js` (exit code 0):

```
scored checks (HARD_FAIL + FLAG): 21 PASS, 0 FAIL, 0 OVERSTATED, 0 operator FLAG, 1 capture FLAG, 0 NOT RUN of 22 expected (EXPECTED_STEPS: the profile's scored checks; ran 22); informational 1; package checks 7/7 PASS (no gaps)
VERDICT: PROVABLY FAIR — Full Pass
Reproduction vs the committed outputs/verification-results.json on Node 22.23.1: REPRODUCED
```

`verify` re-runs the whole simulation rather than trusting the stored results: 750 s measured on an Apple M2 Max
(12 cores, Node 22.23.1) at load average 9 (`runtime` is the last line it prints). `npm run mutate` runs the falsifiability battery (each mutation must be caught by
the check it names, measured against an unmutated control copy); `npm run gate:fresh` (run it in a disposable copy of the package: a passing run rewrites the pinned record
`outputs/fresh-copy.json`, which names the Node version, so on another Node 22 patch the rewritten record no longer equals its pin) re-runs the package from a fresh copy and compares the regenerated artifacts with the committed ones. Both write committed records
(`outputs/mutation-results.json`, `outputs/fresh-copy.json`) that `npm run release-manifest` pins. The verdict is withheld
(INCOMPLETE, exit 3) if any of the profile's 22 scored checks has no status (a step deleted or skipped), or if
`src/profile-map.ts` no longer matches the byte copy of the framework profile in `profile/profile.json` (a row deleted or
relabelled). `node scripts/release-manifest.mjs --check` confirms every pinned file (every file of the package except
`RELEASE-MANIFEST.json` itself) and rebuilds `verify.js` and `site-verifier/derive.js` with bun, comparing each byte for
byte: both were built with bun 1.3.9, and a different bun version can produce different bytes from the same sources, so
the release manifest records the bun version that built `verify.js` (`toolchain.bun`).

## Verdict and exit codes

`node verify.js` (and `npm run verify`) ends with one `VERDICT:` line and its exit code. Framework 1.1; RTP-CLAIM 1.2.0 is
switched on (Methodology v1.1). The codes and their order are the same in all 11 HouseBets new-engine packages:

| exit | verdict | when |
|---|---|---|
| 0 | PROVABLY FAIR — Full Pass | every scored check passes (a capture-origin FLAG is disclosed and does not move the verdict) |
| 2 | PROVABLY FAIR — Conditional Pass | an operator-origin FLAG, nothing worse |
| 5 | RTP FIGURE OVERSTATED | COINFLIP-19: the published RTP figure is missed on the house side by more than 0.1 pp; the draws pass, and so do the committed RTP table and record (a stale one is exit 1) |
| 3 | INCOMPLETE | a scored check of the profile has no status from this run |
| 1 | NOT PROVABLY FAIR | a scored check fails; or a step throws (a file missing, a dataset field null or absent: the checks it scores print FAIL with the error, the other steps still run); or a release-gate record (`outputs/fresh-copy.json`, `outputs/mutation-results.json`) is missing or is not the bytes RELEASE-MANIFEST.json pins (its check prints FAIL) |
| 4 | (no verdict) | `verify.js` was not built from the sources beside it; rebuild with `npm run build:standalone` |

When more than one applies: NOT PROVABLY FAIR > INCOMPLETE > RTP FIGURE OVERSTATED > Conditional Pass > Full Pass.

A deleted or relabelled step reaches exit 3, an operator FLAG exit 2, and an RTP miss exit 5 only once the committed record
has been regenerated (`npm run record`; for exit 5 also the RTP table, `npm run rtp-claim:write`): before that, COINFLIP-27
finds the record no longer matches and the run ends exit 1. The mutation battery takes these routes: M16x ends exit 2, M07d,
M07x and M07r exit 3, M19e and M19s exit 5 (MANIFEST.md, Reproduce the audit). An RTP miss on one setting or on all ends
exit 5, never Conditional Pass.

## Verify a bet

1. **Save the commitment before you bet.** Copy the hashed server seed of your active seed pair and keep it with the time
   you saw it. It is the `hashedServerSeed` the game's API returns for the pair (`GET /housegames/seeds?gameType=coinflip`);
   where the game's screen shows it was not captured for this audit. Your saved copy is what shows the seed was fixed
   before your bet: a hash read only afterwards can show consistency, not timing.
2. **Reveal the seed.** A bet can only be checked once its server seed is revealed, which happens when you rotate the seed
   pair: the server's answer to the rotation carries the previous server seed, and the game's verify tab fetches a
   rotated-away seed by its hash (`GET /housegames/unhash?hs=<hash>`; it refuses the active and the next seed). That is
   what the API and the game's code show; the rendered verify screen itself was not captured (MANIFEST.md DL-6).
3. **Collect the fields:** the revealed server seed, your client seed, the bet's nonce (HouseBets nonces start at 1 on a
   fresh seed pair), your calls, your target or number of coins, and your stake.
4. **Check the commitment:** `sha256` of the server seed's text (UTF-8), as lowercase hex, must equal the hashed server seed
   you saved before betting.
5. **Recompute the flips:** take `HMAC-SHA256(key = the server seed's 64-character text as UTF-8, message =
   "clientSeed:nonce:block")` for block 0, 1, …; each 32-byte block holds eight big-endian 32-bit draws `u`, and flip i
   reads draw i. The side is `floor(u / 2^32 × 2)`: 0 = heads, 1 = tails (the top bit of `u`). A bet of n calls reads n
   flips; C coins × F flips read C × F flips, coin j taking flips j·F … j·F + F − 1. The key is the text, not the 32
   bytes it hex-decodes to: HouseBets does not hex-decode the seed. Measured on this
   package's data: with a hex-decoded key 270 of the 7,234 shipped flip sequences match (274.1 expected by chance, since
   short sequences coincide often) and 81,740 of 163,322 single flips (50.05 %), with the text key 7,234 / 7,234; a
   hex-decoded commitment matches 0 of the 145 revealed seeds, the text 145 / 145.
6. **Count and pay** (E01, E02): count `matched` — the calls that landed (flips in a row and the target game) or the coins
   whose F flips all landed (coins × flips). The target game wins when matched ≥ target (every flip for flips in a row) and
   pays `floor4(0.99 × 2^n / S)`, S the number of the 2^n outcomes with at least the target landed; coins × flips pays
   `floor4(0.99 × 2^F × matched / C)`. `floor4` rounds down to 4 decimals. The payout is stake × multiplier, truncated to
   0.00000001.

The same six steps in code (`node` 22, nothing to install; save it as a `.cjs` file and run it with `node`), written from [docs/ALGORITHM.md](docs/ALGORITHM.md):

```javascript
const crypto = require('crypto');

// docs/ALGORITHM.md §1.2, §2, §3. kind: 'streak' (every flip, t = n), 'target' (at least t of n) or 'coins' (C coins × n
// flips each; one flip per coin is the Multi tab). calls: n letters H / T. Multipliers in 1e-4 units, payouts in 1e-8 units.
function verifyCoinflipBet({ serverSeed, clientSeed, nonce, kind, n, t, coins, calls, stake }) {
  const key = Buffer.from(serverSeed, 'utf8');                  // the 64-character TEXT, not the 32 bytes it hex-decodes to
  const need = kind === 'coins' ? coins * n : n;                // flips the bet reads
  let flips = '';
  for (let block = 0; flips.length < need; block++) {           // each 32-byte block holds eight big-endian 32-bit draws
    const d = crypto.createHmac('sha256', key).update(`${clientSeed}:${nonce}:${block}`, 'utf8').digest();
    for (let i = 0; i < 32 && flips.length < need; i += 4) flips += Math.floor(d.readUInt32BE(i) / 2 ** 32 * 2) === 0 ? 'H' : 'T';
  }
  const choose = (a, b) => { let r = 1n; for (let i = 1; i <= b; i++) r = r * BigInt(a - b + i) / BigInt(i); return r; };
  let matched = 0, m4 = 0n;
  if (kind === 'coins') {                                       // coin j reads flips j·n … j·n + n − 1 and survives if all land
    for (let j = 0; j < coins; j++) if (flips.slice(j * n, (j + 1) * n) === calls) matched++;
    if (matched > 0) m4 = (9900n * (1n << BigInt(n)) * BigInt(matched)) / BigInt(coins);    // floor4(0.99 × 2^n × h / C)
  } else {
    for (let i = 0; i < n; i++) if (flips[i] === calls[i]) matched++;
    const target = kind === 'streak' ? n : t;
    let S = 0n; for (let i = target; i <= n; i++) S += choose(n, i);                       // outcomes with ≥ target landed
    if (matched >= target) m4 = (9900n * (1n << BigInt(n))) / S;                            // floor4(0.99 × 2^n / S)
  }
  const stake8 = BigInt(Math.round(Number(stake) * 1e8)), pay8 = (stake8 * m4) / 10000n;    // payout truncated to 1e-8
  const f = (v, k) => (v / 10n ** BigInt(k)) + '.' + String(v % 10n ** BigInt(k)).padStart(k, '0');
  return { commitment: crypto.createHash('sha256').update(serverSeed, 'utf8').digest('hex'),
    flips, matched, multiplier: f(m4, 4), payout: f(pay8, 8) };
}

// worked example: docs/ALGORITHM.md §5 V7, roundId 9be02461-b0b5-4215-b4cd-1cc07d8e2c5e (Phase A, target game)
console.log(verifyCoinflipBet({
  serverSeed: 'b47b1f16a2814e7a54c1110480bf933478fc93494a54f9961c99f132e2f5bd8f',
  clientSeed: 'pfcoinstart3d83f16dbe8d573df91771f8e9cc0361', nonce: 4, kind: 'target', n: 4, t: 1, calls: 'THTH', stake: 0.01000311,
}));
```

It prints `commitment: '522c162f97c45b8e2461b8e1ae1aaeb2345f1973c014f3a79665025b03480ac8'`, `flips: 'TTHH'`, `matched: 2`,
`multiplier: '1.0560'`, `payout: '0.01056328'`: the served commitment, flips, match count, multiplier and payout of that
bet. Run on the 7,234 shipped bets, the function returns the served flips, match count, multiplier, payout and commitment
on all 7,234.

**ProvablyFair.org verifier:** check your bet at [provablyfair.org/verify-bets/housebets](https://www.provablyfair.org/verify-bets/housebets); the
page runs `site-verifier/derive.js` from this release (sha256 `86b887b626aaa35b0ee2c646af29c98927183604c0033e3dc0109711441aa05a`).
COINFLIP-24 runs that file side by side with `src/rng.ts` on every captured bet
([MANIFEST.md, Player verifiers](MANIFEST.md#player-verifiers)). The steps and the function above check a bet by hand,
without the page; `src/rng.ts` and `src/rules.ts` are the same steps in the package's own code.

## Files and evidence

There are two documentation files: this README and [MANIFEST.md](MANIFEST.md), the consolidated audit overview (dataset,
algorithm, payouts and RTP, results, the S5 matrix, reproduction, evidence, limitations and release history). The algorithm
specification is [docs/ALGORITHM.md](docs/ALGORITHM.md); the module interface [docs/INTERFACE.md](docs/INTERFACE.md).

| Dataset | SHA-256 |
|---|---|
| [data/housebets-coinflip-phaseA-6550bets.json](data/housebets-coinflip-phaseA-6550bets.json) (Phase A, primary) | `c7e747f1e41ddd8a09db7b9e4cabb6c12580762f583d98361e708bc734f8fee7` |
| [data/housebets-coinflip-phaseA-tail-34bets.json](data/housebets-coinflip-phaseA-tail-34bets.json) | `b71953edb36a729e502fbf084172db76f01bb0a185005f3c45037d9e578fa18d` |
| [data/captured/housebets-coinflip-sp1-6584bets.redacted.json](data/captured/housebets-coinflip-sp1-6584bets.redacted.json) (the capture both files above are split from) | `ff4f0a706d7caad1f4a4ea53a96c842407a18b9ab12ccd1b2e480af7782f86ac` |
| [data/supplementary/housebets-coinflip-phaseC-250bets.json](data/supplementary/housebets-coinflip-phaseC-250bets.json) | `fdf863a475d79d0e24ba9d54a5951172f4e2f31e8bb1a8d6e2012414df11b382` |
| [data/supplementary/housebets-coinflip-phaseC-safe-10usd-200bets.json](data/supplementary/housebets-coinflip-phaseC-safe-10usd-200bets.json) | `a42784dad1d1d3ae0a7d5caa7a87d110d28736226f47692acb9dd40d0ce1ef44` |
| [data/supplementary/housebets-coinflip-phaseD-200bets.json](data/supplementary/housebets-coinflip-phaseD-200bets.json) | `cb88bf7b78ab1f63932385ffced3867a2a074ab739461ac1731a7547f11766f3` |

`data/SHA256SUMS` lists the same (`shasum -a 256 -c SHA256SUMS` in `data/`). `evidence/` holds E01–E08, `capture/` the
reference copies of the capture code (MANIFEST.md#dataset-and-capture), `profile/` the framework's public COINFLIP
profile 1.0.2-public (byte copy, sha256 checked by verify), `outputs/` the pinned simulation census, RTP table and verification record and the
committed mutation and fresh-copy records, `src/` the derivation, `tests/verify.ts` the 30 checks of the COINFLIP profile,
`scripts/` the split, mutation battery, fresh-copy gate, standalone build, site-verifier build, release manifest, the
recompute of excluded captures, the user-id redaction and the evidence builders, `site-verifier/derive.js` the
ProvablyFair.org verifier module for this game, generated from `src/rng.ts`.

The release commit and tag are signed with the ProvablyFair.org release key (SSH,
`SHA256:gEujiJm2pRyq7lQsfYQfQ1r97H/J7GdaKHbOW8GtikY`), which the release manifest records.

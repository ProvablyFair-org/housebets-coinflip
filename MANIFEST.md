# HouseBets Coin Flip — Consolidated Audit Overview (new engine)

**Release:** `v1.0.0` (the first public release) · **Audit ID:** PF-2026-HB10 · **Auditor:** ProvablyFair.org · **Framework:** 1.1

Audit report: https://audit.provablyfair.org/casino/housebets/games/coinflip/overview · Public repository:
https://github.com/ProvablyFair-org/housebets-coinflip. The machine-readable release identity is
[RELEASE-MANIFEST.json](RELEASE-MANIFEST.json).

The COINFLIP profile this package runs is the framework's public profile `games/coinflip/profile.public.json`
1.0.2-public, the public form of profile 1.0.2 (the same checks with the same ids, names, layers, kinds, policies,
parameters and floors; internal references are removed from the text).
Verdict of record: the one `node verify.js` prints, **PROVABLY FAIR — Full Pass**, with one capture-origin FLAG
(COINFLIP-15, DL-4), verdict-neutral; COINFLIP-14 passes with the max-win refusal declared unwitnessed (DL-3).
Framework 1.1 (Methodology v1.1, 14 Oct 2026): RTP-CLAIM 1.2.0 is switched on, so an RTP figure overstated on the
house side is reported as **RTP FIGURE OVERSTATED** (exit 5), never NOT PROVABLY FAIR; exit codes under
[Reproduce the audit](#reproduce-the-audit).

## Contents

[Conclusion and scope](#conclusion-and-scope) · [Dataset and capture](#dataset-and-capture) ·
[Game and algorithm](#game-and-algorithm) · [Payouts and RTP](#payouts-and-rtp) ·
[Verification results](#verification-results) · [S5 fairness-integrity matrix](#s5-fairness-integrity-matrix) ·
[Player verifiers](#player-verifiers) · [Reproduce the audit](#reproduce-the-audit) · [Evidence](#evidence) ·
[Limitations and trust](#limitations-and-trust) · [Release history](#release-history)

## Conclusion and scope

**PROVABLY FAIR — Full Pass.** Of the profile's 22 scored checks, 21 PASS and 1 is a capture-origin FLAG (COINFLIP-15:
45–48 bets per plan class, under the profile's 50 floor), 0 FAIL. COINFLIP-14 passes with a branch the capture never
produced, declared unwitnessed as its rule text allows (the max-win refusal is reachable within the bet limits and was
never produced). Every bet in the five shipped bet files (Phase A 6,550, its 34-bet tail, Phase C 250, the
$10 set 200, Phase D 200; 7,234 in all) recomputes exactly from its revealed server seed under the algorithm HouseBets publishes — every flip, the count of
calls landed or coins surviving, the multiplier and the payout — matches the server's own raw answer kept beside it, and
appears in the platform's own bet history with the same stake and payout (COINFLIP-06, 07, 10, 11, 12, 13, 16). Each flip
is the top bit of a 32-bit draw, so heads and tails each take exactly 2^31 of the 2^32 draws (COINFLIP-08). The published
claim that every bet returns at most 99 % (the rules panel text in the game page's code, E02, and the fairness answer the
site loads, E01; both read by the verifier at run time) holds for all 147 settings of the published spec (0.989929687 … 0.990000000,
COINFLIP-19). Observed return over the 6,550 Phase A bets: 95.4523 % (62.54067626 paid on 65.52037050 staked), variance,
not RTP evidence. Replaying every one of the 145 revealed seeds over 10,000 nonces finds no early-window deficit on the
5,267 scored slots (per-slot z −1.063, p 0.1439 against the rule's threshold 0.009, COINFLIP-21; DL-14); at this sample
that test detects a per-bet RTP deficit of 3.55 pp with 80 % power, not a smaller one.

Scope: HouseBets House Games **coin flip** on the October 2026 engine (fairness version `canonical`), the USDT wallet, every
mode the published spec (E01) and the rules panel (E02) describe: flips in a row, the target game (at least t of n calls),
coins × flips (one flip per coin is the Multi tab). All of them were placed through the game's own API calls. The target
game was placed in a shape the capture rig labels `apiOnly`, its label for a setting the game page's UI does not send: 1,808
of 1,808 Phase A target-game bets, 5 of 5 in the tail and 54 of 54 in Phase D (COINFLIP-15); the $10 set's 200 target bets
carry no label. Whether the page itself can place a target-game bet was not established: the rendered page was not checked.
The server accepts and settles these bets by the published rule (every one recomputes). One audit account in a logged-in
browser session. Not in scope: other House Games (their own packages), the security of the platform, a second account, and
anything a client-side capture cannot reach (server-side code, concurrency inside the server).
This package's capture sent no adversarial request to the API apart from one empty client seed (E06) (DL-12); the
fairness-integrity tests, run separately on HouseBets' running service by ProvablyFair.org, are in the ProvablyFair.org
report for this game, Section 5 (Fairness Integrity Testing), and the [S5 matrix](#s5-fairness-integrity-matrix) names them
row by row.

## Dataset and capture

| file | what | bets | seeds |
|---|---|---|---|
| `data/housebets-coinflip-phaseA-6550bets.json` | **Phase A, primary**: 131 whole seed pairs of exactly 50 bets, platform minimum stake 0.01000311 USDT, 12 Oct 2026 17:04–19:49 UTC | 6,550 | 131 |
| `data/housebets-coinflip-phaseA-tail-34bets.json` | the capture's short last seed pair, own file (DL-1) | 34 | 1 |
| `data/captured/housebets-coinflip-sp1-6584bets.redacted.json` | the capture as written, with the audit account's user id replaced by "redacted" (DL-9, `data/REDACTION.txt`); the two files above are split from it unchanged (`src/split.ts`, re-run by COINFLIP-05) | 6,584 | 132 |
| `data/supplementary/housebets-coinflip-phaseC-250bets.json` | **Phase C**: single flips at 1.000311 (100 × minimum), 13 Oct 2026 | 250 | 5 |
| `data/supplementary/housebets-coinflip-phaseC-safe-10usd-200bets.json` | **Phase C, $10 set**: 3 calls with target 1 at 10.00, 13 Oct 2026 | 200 | 4 |
| `data/supplementary/housebets-coinflip-phaseD-200bets.json` | **Phase D**: one auditor-typed client seed per pair, minimum stake, 13 Oct 2026 | 200 | 4 |

`data/SHA256SUMS` lists the sha256 of every dataset above (`shasum -a 256 -c SHA256SUMS` in `data/`), and `data/SPLIT.txt`
names the split's input and its two outputs with their sha256.

E05 also lists 552 coin flip bets of the same account on the same engine, a pilot run of 12 Oct 2026
before the planned capture; they are not part of the audited population (its 36 refused 1-coin multi toss requests are
E07). They are not shipped (their file carries the account's user id); `npm run excluded` recomputes them (seed hash,
flips, matched count, win, multiplier, payout, the server's answer against the copy) and they agree 552/552.

The capture ran inside a logged-in browser tab on an account opened for the audit, placing bets through the game's own API
calls. For every seed pair it read the pair (the hash of the server seed and the hash of the next one), drew the client
seed after reading the hash, except on the 4 Phase D pairs, whose client seeds were chosen before the capture (DL-2) (the rig labels the source `node:crypto randomBytes(16) hex` on 141 of 141 Phase A–C seeds;
COINFLIP-06 checks that label, not the code that ran), placed 50 bets, read the server's nonce count, and rotated, which
reveals the server seed. A pre-capture read anchors the chain before the first pair. The Phase A plan is the whole declared
grid, 138 setting classes (`src/loader.ts` planClasses): flips in a row n = 1 … 10, the target game at every legal target
below n (38), and coins × flips at C = 2 … 10 × F = 1 … 10 (90); Phase A holds 45–48 bets per class (DL-4). The captured
file's `meta.planDoc` line ("588 = 147 cells … × 4") describes an earlier plan, not the one that ran: the plan that ran is
in `meta.plan` and `meta.planTruncated` (6,624 slots = 138 classes × 48, trimmed to 6,600), and as-captured metadata is not
edited. Every bet request carried only the calls, the target or coin count and mode, the stake, the currency and a one-time
`generation` id (distinct on all 7,234 bets): no client seed, nonce, payout or multiplier field.

**Capture code** (`capture/`, redacted reference copies, not a runnable tool: the files import each other by paths that
do not exist in this package). Each file starts with a header saying what it is; below it only comments are edited (names,
quotes, internal paths, another audit), the code is unchanged. No scored check reads them.

| file | what | sha256 of the file it was made from | as-run copy |
|---|---|---|---|
| `capture/capture-hb-coinflip.mjs` | the coin flip rig: the Phase A plan, the bet body, the phases | `66ea9c38…f0775` | the as-run file of the $10 set (sha256 `66ea9c38…f0775`, recorded in `data/supplementary/housebets-coinflip-phaseC-safe-10usd-200bets.json` meta) is held privately; Phase A ran `60e26a36…` and Phases C and D `f7429628…`, which were not kept |
| `capture/hb-sp-core.mjs` | the shared capture engine: seed reads, rotation, the empty-seed control | `86266dae…13a2a` | not kept (the datasets record `74a3e47c…` Phase A, `fbc43aa1…` Phases C and D, `d791cce1…` the $10 set) |
| `capture/hb-capture-lib.mjs` | the client-seed generator `csprngClientSeed` (`prefix + randomBytes(16)` hex), credential scrubbing, the commitment witness | `433b6847…b89a8` | not kept (the datasets do not record its hash) |
| `capture/inpage-crypto-shim.js` | what `node:crypto` is inside the browser tab: `randomBytes` and `randomInt` from `crypto.getRandomValues` | `0c1d7af7…c13e8`, nothing below the header edited | not kept (the datasets do not record its hash) |

The shipped files are reference copies, not as-run copies: they show how the client seeds and settings were drawn, not the
exact bytes that ran for every phase (DL-13).

## Game and algorithm

The full specification, with the source of every step, the counts that confirm it and test vectors, is
[docs/ALGORITHM.md](docs/ALGORITHM.md); the module interface of `src/` is [docs/INTERFACE.md](docs/INTERFACE.md).

From HouseBets' published spec (E01, `GET /housegames/coinflip/fairness`; the same body was read at 13:32 and 17:04 UTC on
12 Oct) and the rules panel of the game page (E02):

- **Draws.** `HMAC-SHA256(key = serverSeed as UTF-8, message = "clientSeed:nonce:block")`; each 32-byte block holds eight
  big-endian 32-bit draws `u`, and flip i reads draw i (block floor(i/8)). The key is the seed's 64-character text, not
  the 32 bytes it hex-decodes to: with a hex-decoded key 270 of the 7,234 shipped
  flip sequences match, 274.1 expected by chance. The four worked examples the spec publishes, ten draws and ten flips each,
  recompute (COINFLIP-09).
- **Side.** `floor(u / 2^32 × 2)`: 0 = heads, 1 = tails — the top bit of `u`, so each side has exactly 2^31 of the 2^32
  draws (COINFLIP-08). No call, target, mode or coin count enters the message (COINFLIP-17).
- **Modes** (E02, verbatim): flips in a row — "You win only if every flip lands as called."; the target game — "You win if
  at least that many land your side"; coins × flips — "A coin that misses drops out; a coin that lands every flip
  survives." and "Each surviving coin pays its share at 0.99 × 2ⁿ for n flips, and the round pays the sum."; Multi — "Pick a
  side and how many coins to toss, 2 to 10." (coins × flips at one flip).
- **Commitment.** The hashed server seed shown before the bets is `sha256` of the seed's UTF-8 text (145 of 145 revealed
  seeds, COINFLIP-01; the hex-decoded bytes match 0 of 145); each pair also shows the hash of the next seed, and the chain links (COINFLIP-02).
- **Nonces** start at 1 on a fresh pair and count every bet (COINFLIP-04).

## Payouts and RTP

- **Multipliers** (E01): target game `floor4(0.99 × 2^n / S(n, t))`, S(n, t) the number of the 2^n outcomes with at least
  t of n calls landed; coins × flips `floor4(0.99 × 2^F × h / C)` for h survivors of C coins; multi toss
  `floor4(1.98 × h / n)`, the same as coins × flips at F = 1 on every cell. Paid exactly on 2,204 of 2,204 winning Phase A
  bets and 368 of 368 tail and supplementary winners; the published multiplierTable and multiTable equal the formulas cell
  for cell
  (COINFLIP-13). The largest multiplier is 1,013.76× (ten flips in a row, or every coin surviving ten flips).
- **Win chance.** From the binomial law alone, checked by enumerating every outcome (COINFLIP-18). The smallest legal target
  keeps the win chance at or under 98 % (E01 minTargets, COINFLIP-14). The server's `winChance` field is the chance the
  round pays more than the stake, which for coins × flips is lower than the chance of any survivor (E02 rulesCxf5: "a
  round where too few coins survive pays back only part of your stake"); it is compared, never used.
- **Payout** = stake × multiplier, truncated to the wallet's 1e-8 unit; exact at 8 decimals on 6,550 of 6,550 Phase A bets
  and 684 of 684 tail and supplementary bets (COINFLIP-11, COINFLIP-12). Every money value is checked on the 1e-8 grid as
  served, before any rounding: 0 off the grid (COINFLIP-11).
- **Max win** (E02 rulesMaxWin "The maximum win on one bet is {cap}"; E03 1,000,310.0961298 USDT). With E03's max bet,
  20,006.20192259 USDT × 1013.76× = 20,281,487.26104483, which is 20,261,481.05912224 above the stake (the copy of the
  bundle fetched 19 Oct 2026, E08 rulesMaxWinCap, words the cap as "Most a spin can win above its stake: {cap}"), so a
  refusal is reachable within the bet limits. This capture
  placed no bet near the cap (largest payout 11.314 USDT), so the server's refusal was never produced. COINFLIP-14's rule asks for monotone
  multipliers, the 98 % cap at the smallest target and every multiplier within the max-win cap, not for the refusal to be
  produced, so COINFLIP-14 passes with the refusal declared unwitnessed (DL-3).
- **RTP.** The figure is published in two places, and the verifier reads it from both at run time (COINFLIP-19; no copy of it
  is typed into the code). In the rules: the rules panel text in the game page's code, "Every bet returns at most 99% over
  the long run, a 1% house edge: the multiplier is the fair odds times 0.99, rounded down to four decimals." (E02
  rulesEdge1; also rulesCxfEdge and rulesMultiEdge, 99 %). In the game settings the site loads: the fairness answer, "the
  return is at most 99% at every n and target" (E01 summary; the game bundle requests `/fairness`). No rendered page was
  captured, so neither is said to be shown. The live copy of the same bundle (fetched 19 Oct 2026, last-modified Fri, 16 Oct
  2026 09:18:09 GMT) carries the same three rules sentences (E08), read as three more places. The seven figures agree; were
  they to differ, the claim held is the highest.
  Exactly, across all 147 settings the RTP runs from 0.989929687
  (target game n = 6, t = 2) to 0.990000000, never above 99 %, before the payout is truncated to 1e-8; it is exactly 99 % on the 115 settings whose multipliers need
  no rounding, as E01 states; the Multi tab's "98.995% at 7 coins" (E02 rulesMultiEdge, read from the exhibit) is 98.995078 %, equal at the 3 decimals
  quoted. Under the framework rule RTP-CLAIM 1.2.0 (switched on, Methodology v1.1) the claim holds: 0 settings beyond the 0.1 pp band (`outputs/rtp-claim-table.json`, COINFLIP-19; the rule is switched on and COINFLIP-19 scores PASS). The payout's truncation to 1e-8 depends on the stake and is not in that
  table.
- **Simulation.** 147 bands of 1,000,000 fresh-seed rounds, one for every legal setting and each on its own seeds
  (147,000,000 rounds) — the target game at every legal target of every n (48), the multi toss at 2 to 10 coins (9) and
  coins × flips at every C and F (90) — each land within their tolerance |RTP_sim − RTP_exact| ≤
  5·SE + 0.0001, SE = σ/√n (worst 2.37 SE; COINFLIP-20 prints every band's |Δ| and width). The width runs from 0.00099
  (target n=5 t=1) to 0.15842 (target n=10 t=10). **71 of the 147 bands are wider than the 1 % house edge** (18 of the
  target game, none of the multi toss, 53 of coins × flips; COINFLIP-20 lists them): from 1,000,000 rounds those bands cannot
  detect an edge of that size (DL-11); the RTP evidence there is the exact table (COINFLIP-19). Live-bet returns are
  variance only; RTP evidence is the exact table and the simulation.

## Verification results

`node verify.js` runs the 30 checks of the COINFLIP profile (`src/profile-map.ts`, generated from the framework's public profile
`games/coinflip/profile.public.json`, version `1.0.2-public`, sha256
`97e02fd0303f80b686749ce20a6cc1f5344b5199691bd5074135f8796e767c62`, the public form of profile 1.0.2: the same checks,
ids, names, layers, kinds, policies, parameters and floors). The package ships a byte copy of that profile
(`profile/profile.json`); every run checks its sha256 against the one cited here, takes the 22 scored checks from it, and
requires every row of `src/profile-map.ts` to equal it (id, name, layer, kind, policy): a row deleted or relabelled there
withholds the verdict (INCOMPLETE, exit 3). Node 22.23.1: 21 of 22 scored checks PASS (COINFLIP-14 with a declared,
unwitnessed branch), 1 capture-origin FLAG (COINFLIP-15), 0 FAIL, 0 not run; COINFLIP-22 informational; package checks 7 of 7 PASS;
verdict **PROVABLY FAIR — Full Pass**. The committed record and RELEASE-MANIFEST.json count 20 passes: they leave out COINFLIP-27, the check that compares the record with the run. The
verdict is bound to the profile's 22 scored checks: a check with no status from the run withholds it (INCOMPLETE, exit 3).
The full per-check output is `outputs/verification-results.json`. That record holds every check of the run except COINFLIP-27, COINFLIP-28 and COINFLIP-29, which attest the record itself: COINFLIP-27 compares it with the run, and COINFLIP-28 and COINFLIP-29 read the gate records (`outputs/fresh-copy.json`, `outputs/mutation-results.json`), which are bound to sources that pin the record (`src/artifact-pins.ts`); verify prints those three and does not record them.

| check | status | result |
|---|---|---|
| COINFLIP-01 seeds | PASS | 145/145 revealed seeds hash to their commitments (131 Phase A) |
| COINFLIP-02 chain | PASS | 130/130 Phase A links, pre-capture anchor, Phase A → tail, tail → the pair active after the capture; supplementary chains anchored |
| COINFLIP-03 / 04 | PASS | 131/131 pairs: one hash and client seed per pair; nonces exactly 1..50, rising in the order the bets were placed, N == the server's count |
| COINFLIP-05 population | PASS | 6,550 / 131 / 131 × 50 against code constants; the split re-run reproduces both files byte for byte |
| COINFLIP-06 client seed | PASS | a wrong client seed changes 77,987 of 156,147 Phase A flips (49.94 %, z −0.44); Phase D 200/200 recompute under 4 player seeds; the empty-seed request was answered HTTP 400 with a generic error (E06) |
| COINFLIP-07 / 10 / 11 / 13 | PASS | flip sequences, matched counts, win rule, payouts 6,550/6,550 Phase A and 684/684 tail + C + C $10 + D; multipliers 2,204/2,204 and 368/368; capture copy == server round record and == the server's raw answer, every bet |
| COINFLIP-08 | PASS | side = top bit of the draw: exactly 2^31 draws each, bias 0 |
| COINFLIP-09 | PASS | the 4 worked examples of E01 recompute; a captured winner recomputes |
| COINFLIP-12 | PASS | Phase C 250/250 (122 wins) and the $10 set 200/200 (177 wins) recompute and pay by the base rule |
| COINFLIP-14 | PASS | multiplier strictly rises with the target at every n; minTargets is the 98 % cap at every n; every multiplier within the max-win cap; declared unwitnessed: the max-win refusal is reachable within the bet limits and was never produced (DL-3) |
| COINFLIP-15 | FLAG (capture) | all 138 plan classes present, 45–48 bets each, under the profile's 50 floor by the plan's own sizing (DL-4); the 1-coin multi toss request refused 36/36 (E07); a missing or unplanned class would also be a capture FLAG, and a planned setting refused by the server with a non-transient answer an operator FLAG (0 such; 16 transient, DL-1) |
| COINFLIP-16 | PASS | 7,234/7,234 package rounds in the platform's bet history with the same stake, payout and status (E04); the full `reconcile-full.py` output (E05) checked by its numbers: every row's net == paid − staked, TOTAL == the rows, 86,979 entries == 86,966 captured + 0 open + 13 of 10 Oct, this package's 4 rows == the sums of its own datasets, balance before == after − net (986.84718000, the run's --before argument, DL-10); the pass rests on that bet history and that account reconciliation: the comparison of consecutive balances the profile describes was not possible in this capture (DL-8) |
| COINFLIP-17 | PASS | no call, target, mode or coin count in the RNG message; every bet of every mode recomputes without them |
| COINFLIP-18 / 19 | PASS | enumeration == binomial law for every setting (the negative control adds exactly one mismatch to the unmodified recompute); the claim read from E02 and E01 (0.99) holds on all 147 settings; the secondary statements ("at most 99%", "exactly 99% where the multiplier is a short number", "98.995% at 7 coins") are compared and printed, never in place of the rule |
| COINFLIP-20 | PASS | 2,000,000 flips: 999,585 tails (chi² 0.344, p 0.5573), runs z 1.598, lag-1 z −2.346 (p 0.0190, screen at 0.0033); 147/147 bands in tolerance, every legal setting on its own seeds (71 wider than the edge, DL-11) |
| COINFLIP-21 | PASS | 145 revealed seeds (Phase A 131, tail 1, C 5, $10 4, D 4) × 10,000 nonces, early window = each pair's captured nonces: scored (per-slot standardised) early-window z −1.063, p 0.1439 over the 5,267 scored slots, against the rule's threshold p < 0.009 (DL-14); power: a 3.55 pp per-bet RTP deficit at 80 %. Printed, not scored: the 131 Phase A seeds alone z −1.067, the other 14 z −0.176; the pooled form z −1.168, p 0.1214, power 10.36 pp (the scored form was switched from pooled to per-slot on 14 Oct 2026, after the pooled result on the Phase A seeds was known). 87 epochs below expectation, 58 at or above; under fair play 86.18 ± 5.9 are below (descriptive, not a test) |
| COINFLIP-22 | INFO | 156,147 live flips: 78,082 tails (z 0.04); matched counts per n chi² p 0.0641 |
| COINFLIP-23 | PASS | the S5 matrix below carries the framework's ids and names, S5-1 … S5-8, each with a status |
| COINFLIP-24 | PASS | `site-verifier/derive.js`, sha256 `86b887b626aaa35b0ee2c646af29c98927183604c0033e3dc0109711441aa05a`, generated from `src/rng.ts`: equals its pins (`src/artifact-pins.ts`, RELEASE-MANIFEST.json) and returns what `src/rng.ts` returns on all 7,234 captured bets (201,398 calls, 0 differing results) ([Player verifiers](#player-verifiers)) |
| COINFLIP-25 | PASS | README "Verify a bet": where the seed is revealed, the fields, the commitment, the HMAC key's encoding, the flip rule, the match count and the multiplier |
| COINFLIP-26 / 27 | PASS | 6 datasets, 8 exhibits and 3 artifacts match their pins; the user id is redacted in every shipped dataset (13,818 "redacted", 0 other values, DL-9); the 34 constants in `src/` that stand for exhibit figures equal the values parsed from E01, E02 and E03 (and E01, E03 equal the captured preflight answers); regenerated census, RTP table and verification record == committed; `verify.js`'s header digest == the current sources (the body is bound by the stale guard, exit 4, and by `release-manifest --check`, which rebuilds the bundle and compares it byte for byte) |
| COINFLIP-28 / 29 | PASS | read only from the committed, pinned records `outputs/fresh-copy.json` and `outputs/mutation-results.json` (RELEASE-MANIFEST), produced from the current sources; audit ID PF-2026-HB10; a record that is missing or is not the bytes its pin names prints FAIL and fails the verdict (exit 1) |
| COINFLIP-30 | PASS | the limitations register, the premises table and every exhibit E01–E08 by file name |

**COINFLIP-14 and COINFLIP-15 are scored by the profile's rule text.** COINFLIP-14's rule asks that the multiplier not
fall as the target rises within each n, that the smallest legal target keep the win chance at or under 98 %, and that
every quoted multiplier lie within the declared max-win cap, a violation disclosed; it does not ask for the max-win refusal
to be produced, so the refusal branch the capture never produced is declared unwitnessed in the check's own output and in
DL-3, and COINFLIP-14 passes. The limbo and dice packages score the same situation the same way (LIMBO-14, DICE-14).
COINFLIP-15 stays a capture-origin FLAG: its rule asks Phase A to cover the declared (n, target) and (coins, flips) grid at
the floor of 50 bets per class, and this capture placed 45–48 (DL-4).

### False-alarm rates

Pass 1 side balance 0.0033 (exact binomial), runs and lag-1 0.0033 each (nominal); target-game bands ≤ 6.9 × 10^-7 each
(exact binomial), multi toss and coins × flips bands ≤ 4.4 × 10^-5 each (a Bernstein bound, not an estimate), every band summed ≤ 0.0011; Pass 2, the scored per-slot
rule at p < 0.009 over the 5,267 scored slots of the 145 revealed seeds, 0.00907 ± 0.000212 (standard error;
`src/false-alarm-pass2.ts`, 200,000 honest replicates over those slots, re-derived by `npm run false-alarm:pass2`, not
re-run by verify); the same rule at the nominal p < 0.01, 0.01007 ± 0.000223, not within the cap (DL-14); the pooled rule
at p < 0.01 on the same replicates 0.00657 ± 0.000181. Each scored rate is below the 1 % cap for a failing step.

## S5 fairness-integrity matrix

S5: fairness-integrity matrix.

<!-- S5-MATRIX:BEGIN -->
| Test ID | Category | What the framework tests | Result | Tied to |
|---|---|---|---|---|
| S5-1 | Replay protection | A completed bet cannot be replayed to duplicate a payout | Pass | HB-COINFLIP-REPLAY-001, HB-COINFLIP-EXTRA-001: Identical bets sent in parallel, with and without a shared request key, settled one round per pair, and a reused request key returned the original round with no second debit. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no replay request was sent. Observed only: each of the 7,234 bets was sent with its own `generation` id (7,234 distinct) and settled once, with one round id (7,234 distinct) and one bet-history row (COINFLIP-16, E04). DL-12 |
| S5-2 | Input validation | Invalid, out-of-range or malformed parameters are rejected | Pass | HB-COINFLIP-PARAM-001, HB-COINFLIP-PARAM-003, HB-COINFLIP-PARAM-006, HB-COINFLIP-PARAM-007, HB-COINFLIP-SEED-001: Empty, over-long, invalid, look-alike and wrong-type calls, alias and stray fields, malformed request keys, invalid coin counts, unknown or mismatched modes, out-of-range and wrong-type targets and invalid client seeds were rejected. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: the capture sent valid settings only. Observed only: one request with an empty client seed was refused, HTTP 400 with a generic error (E06, COINFLIP-06); the 1-coin multi toss request of the 12 Oct pilot run was refused 36/36 (E07). DL-12 |
| S5-3 | Seed integrity under adversarial input | Server and client seed fields cannot be injected or overridden via the API | Pass | HB-COINFLIP-MAXWIN-002: Bets each carrying one injected outcome field (flip, match, win chance, nonce, seed or payout) were rejected at validation and consumed no nonce; the control and recovery bets recomputed from the revealed seed. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no injection was attempted; no bet request carried a seed field. Observed only: every bet carries its pair's committed hash and client seed in the server's answer (COINFLIP-03), and the four typed Phase D seeds are the ones the flips recompute with (COINFLIP-06). DL-12 |
| S5-4 | Cross-player isolation | One player's seeds, nonces or outcomes are not observable or influenced by another | Pass on 1 of 2 controls; 1 not tested | HB-COINFLIP-AUTH-001: Bets carrying foreign and malformed user identifiers were rejected; the control bet stayed in the caller's own seed and balance chain and no bet was attributed to another account. Not covered: observation by another account was not tested; influence was tested from one account, by sending another account's identifier. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: single audit account (EC-9). DL-12 |
| S5-5 | Payout field integrity | Client-supplied payout or multiplier values are ignored by the server | Pass on 1 of 2 controls; 1 not tested | HB-COINFLIP-MAXWIN-002: Bets each carrying one injected outcome field (flip, match, win chance, nonce, seed or payout) were rejected at validation and consumed no nonce; the control and recovery bets recomputed from the revealed seed. Not covered: no multiplier field was injected (payout only). Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no bet request carried a payout or multiplier field. Observed only: every payout equals floor(stake × the formula multiplier) at 1e-8 (COINFLIP-11, 12, 13). DL-12 |
| S5-6 | Nonce sequence enforcement | Nonces cannot be forced, replayed or skipped via the API | Pass | HB-COINFLIP-NONCE-001, HB-COINFLIP-NONCE-002, HB-COINFLIP-NONCE-003, HB-COINFLIP-RACE-001, HB-COINFLIP-RACE-003, HB-COINFLIP-MAXWIN-002: Bets carrying reused, skipped-ahead, boundary and malformed nonces, or an injected nonce field, were rejected at validation and the sequence continued by one; under bursts of parallel bets accepted nonces were unique and in sequence. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no bet request carried a nonce. Observed only: nonces run 1..50 with no gap, repeat or reorder in all 131 Phase A pairs and equal the server's count at rotation (COINFLIP-04); the 16 transient refusals used no nonce (DL-1). DL-12 |
| S5-7 | Parameter boundary enforcement | Bet amounts, configuration values and game parameters outside valid ranges are rejected | Pass | HB-COINFLIP-PARAM-004, HB-COINFLIP-PARAM-007, HB-COINFLIP-MAXWIN-001, HB-COINFLIP-MAXWIN-003: Below-minimum, zero, negative, out-of-range, fractional and huge targets, stakes whose profit would pass the max-payout cap, stakes above the maximum bet, overflow-sized stakes, very long calls and extreme coin counts were refused. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no out-of-range setting or stake was sent by the planned capture. Observed only: every legal n, target and coin count was accepted (COINFLIP-15); the max-win refusal was never produced (COINFLIP-14, DL-3). DL-12 |
| S5-8 | Game-specific state | For Coin Flip: a seed rotation racing a bet in flight cannot change the seed it settles on; calls cannot steer the flips | Pass | HB-COINFLIP-EXTRA-002, HB-COINFLIP-RACE-004, HB-COINFLIP-ENTROPY-003: With rotations fired against bets in flight and bets sent around a rotation, every bet settled before its seed was revealed recomputed under the seed it reported, and none settled on the seed being revealed; over a large run of bets cycling the calls, the flips did not depend on the calls. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: Coin flip settles in one request; the capture placed one bet at a time and never raced a rotation against a bet. Observed only: every bet recomputes under the seed committed for its pair, and no call, target, mode or coin count enters the derivation (COINFLIP-07, 17). DL-12 |
<!-- S5-MATRIX:END -->

Of the eight framework rows, **6 pass on every control the row names**, **2 pass on part of the controls they name** (S5-4,
S5-5: the row's status says how many of its controls were tested, and its evidence cell what was not) and none remains Not
tested. The passing rows rest on fairness-integrity tests run separately on HouseBets' running service by ProvablyFair.org;
they are recorded in the ProvablyFair.org report for this game, Section 5 (Fairness Integrity Testing), not in this
package's data, so nothing in this package reproduces them. The matrix names 20 of that section's 38 tests, each under the
row whose control it tests; the other 18 tests check controls outside these eight rows and are in the report only. This
package's own capture recorded normal play and sent no adversarial request to the API; the one empty client seed of E06 is
the only out-of-spec request of the planned capture. The "Observed only" notes state what the captured data shows; none
substitutes for the adversarial test, and reproducing a test from this package needs a deliberate probe capture (DL-12).

The offline consistency checks below are this audit's own ids, not the framework's S5 rows (they were S5-1 … S5-8 before
this release, which collided with the framework ids):

| Check | Category | What was tested | Result | Finding |
|---|---|---|---|---|
| EC-1 | Seed substitution | Can a revealed seed be swapped for a better one that still matches the commitment? | Pass | 145/145 seeds hash to their commitments and the chain links in order from a pre-capture anchor; these are consistency checks, the timing rests on the capture's reads before each pair (P-1). [COINFLIP-01, COINFLIP-02] |
| EC-2 | Client-seed manipulation | Does the client seed enter the derivation? | Pass | Under a wrong client seed 49.94 % of 156,147 Phase A flips change (z −0.44); Phase D 200/200 recompute under player-set seeds. [COINFLIP-06] |
| EC-3 | Stake-conditional outcome | Do the captured higher-stake bets recompute and settle by the same rule as the base stake? | Pass | Phase C at 100 × minimum (250 single flips) and the $10 set (200 bets) recompute and pay by the same rule as base stake; the derivation takes no stake input. [COINFLIP-12] |
| EC-4 | Server-seed cherry-picking | Can the operator pre-select seeds unfavourable for the early nonces? | Pass, structural + statistical | The flips depend on the client seed, set after the hash is shown (P-1): drawn after the read on 141 of 145 pairs; the 4 Phase D client seeds were chosen before the capture (DL-2), so the structural argument does not cover those pairs, which are in the Pass 2 screen; Pass 2 over all 145 revealed pairs × 10,000 nonces: per-slot early-window z −1.063, p 0.1439 on the 5,267 scored slots (DL-7), detection power 3.55 pp per bet. Nothing here rules out selection across the capture as a whole; the four Phase D pairs had predictable client seeds (DL-2), and Pass 2 is their cherry-pick check. [COINFLIP-21, COINFLIP-06] |
| EC-5 | Seed-rotation race | Can a rotation during an in-flight bet change its seed? | Not tested — disclosed | Coin flip settles in one request; no flip is pending against an unrevealed seed. The capture places one bet at a time per game, so the capture did not exercise a concurrent rotate/bet race; the tests named under S5-8, run separately on HouseBets' running service by ProvablyFair.org, did. |
| EC-6 | Multiplier tampering | Is any win credited at a multiplier other than the published formula's? | Pass | Recomputed and compared with the served multiplier: 2,204/2,204 Phase A winners, every supplementary winner; payouts exact; the published tables equal the formulas. [COINFLIP-13, COINFLIP-11] |
| EC-7 | Nonce manipulation | Are nonces skipped, reused or reordered? | Pass | 131/131 pairs run exactly 1..50 with the server's count equal to 50; the capture's skipped requests used no nonce (DL-1). [COINFLIP-04] |
| EC-8 | Range-mapping bias | Does the draw-to-side map favour a side? | Pass | The side is the top bit of the draw: 2^31 draws each, bias 0; and the calls cannot steer a flip. [COINFLIP-08, COINFLIP-17] |
| EC-9 | Scope limitation | Multi-account seed sharing | Not tested | Single account; a future audit item |

## Player verifiers

The ProvablyFair.org verifier for HouseBets is at
[provablyfair.org/verify-bets/housebets](https://www.provablyfair.org/verify-bets/housebets). The module it runs for this
game ships in this release as `site-verifier/derive.js`, sha256
`86b887b626aaa35b0ee2c646af29c98927183604c0033e3dc0109711441aa05a`. The live verifier serves exactly these bytes.

**How the module is built.** `npm run build:site-verifier` (`scripts/build-site-verifier.mjs`, bun 1.3.9) bundles
`src/rng.ts` and the constants it imports from `src/spec.ts` into one ES module with no import, which exports the same
names (`SIDES`, `draws`, `flips`, `hmacBlock`, `sha256Hex`, `sideOf`: five functions and the constant `SIDES`) and
runs in a browser and in Node. `src/rng.ts` takes SHA-256 and HMAC-SHA256 from Node; a browser page has no such module, so
the build puts its own implementation of the two inside the file. Nothing else differs from `src/rng.ts`. The same sources
give the same bytes: the file's header carries the sha256 of both source files and no date, host or path, the bun version
is fixed, and `node scripts/release-manifest.mjs --check` rebuilds the module in a throwaway folder and requires the
shipped file to equal the rebuild byte for byte.

**What COINFLIP-24 checks, on every run.** The file on disk has the sha256 pinned in `src/artifact-pins.ts`
(`SITE_VERIFIER_PIN`) and in RELEASE-MANIFEST.json, and this document and the README quote it. The module is then loaded
from that file and run side by side with `src/rng.ts` on every captured bet of the five shipped datasets, each with its
own number of flips: 7,234 bets and 145 revealed seeds, 201,398 calls over its six exports, 0 differing
results. Two mutations cover the check (`tests/mutations.json`): M24a swaps heads and tails inside the module and re-pins
it everywhere, so only the side-by-side run can catch it; M24b breaks the pin and leaves the module alone. To confirm the
bytes a page serves, compare the sha256 of the module it loads with the one above.

HouseBets' own verify tab was not tested against this package beyond its `/unhash` seed lookup (DL-6). README.md
"Verify a bet" carries the player steps by hand, with a runnable function and a worked example.

## Reproduce the audit

`node verify.js` on Node 22, or `npm test` on Node 22.6 or later, with nothing installed. Re-generation of the artifacts of record:
`npm run simulate` (the census, `outputs/simulation-results.json`), `npm run rtp-claim:write` (the RTP table),
`npm run record` (the verification record) — each re-pinned in `src/artifact-pins.ts` (and `src/rtp-settings.ts`) in the
same change; `npm run build:site-verifier` rebuilds `site-verifier/derive.js` from `src/rng.ts` and writes its pin; then `npm run build:standalone` (verify.js carries the digest of the sources it was built from; COINFLIP-27 fails a stale bundle under `npm run verify`, and a stale `verify.js` itself exits 4 with no verdict). `npm run false-alarm:pass2` re-derives the declared Pass 2 rates. `npm run mutate` runs the mutation
battery in throwaway copies against an unmutated control copy and writes the committed record
`outputs/mutation-results.json`; `npm run gate:fresh` runs the package from a fresh copy and writes `outputs/fresh-copy.json`;
`npm run release-manifest` then pins both (COINFLIP-28/29 read only those pinned records), and the README and this
overview. `npm run excluded -- <file>` recomputes an excluded workshop capture file. `node scripts/release-manifest.mjs
--check` also rebuilds `verify.js` from the sources in a throwaway copy (bun) and requires the shipped file to equal it byte
for byte, and does the same for `site-verifier/derive.js`; RELEASE-MANIFEST pins every file of the package except itself. `verify` re-runs
the whole simulation: 750 s measured on an Apple M2 Max (12 cores, Node 22.23.1) at load average 9 (it prints its
own `runtime` last).

A release-gate record that is missing or is not the bytes RELEASE-MANIFEST.json pins fails the verdict (exit 1), and every
mutant copy reads the fresh-copy record, so the records are regenerated in this order: `npm run build:standalone`,
`npm run gate:fresh`, `npm run release-manifest`, `npm run mutate`, `npm run release-manifest`. COINFLIP-24 reads the
module's pin from RELEASE-MANIFEST.json, so after a change of `src/rng.ts` or `src/spec.ts` these come first:
`npm run build:site-verifier`, `npm run release-manifest`.

**Bundler version.** `verify.js` was built with bun 1.3.9; its header and RELEASE-MANIFEST.json (`toolchain.bun`) record
it. Another bun version can name local variables differently and produce different bytes from the same sources; when the
`--check` rebuild differs and the installed bun is not the recorded one, the check says so and names both versions. The
bundle's behaviour does not depend on it: `node verify.js` itself refuses to run (exit 4) when its sources differ from the
ones it was built from.

What the verifier reads from the exhibits at run time: the RTP figure (E02 and E08 rulesEdge1, rulesCxfEdge,
rulesMultiEdge; E01 summary), the house edge (E01), the wallet minimum, maximum win and maximum bet (E03). Every constant that
has to stay in `src/` for an exhibit figure (E01's derivation fields, tables, vectors and the coefficient of its three formula
strings; E02's bundle constants; E03's limits) is compared with the parsed value by COINFLIP-26, and a difference is a
reproduction failure (exit 1). A captured payout above E03's maximum win would be an operator-origin FLAG on COINFLIP-14.

How the battery reaches each exit (`tests/mutations.json`; a mutation with an expected exit is killed only when that exit is
produced): M16x (a bet-history row forged, record regenerated) ends Conditional Pass, exit 2; M07d (a step deleted), M07x (a
step and its profile row deleted) and M07r (a step relabelled informational) end INCOMPLETE, exit 3; M19e (E02's figure
raised to 99.5 %, table and record regenerated) and M19s (the law of one setting no captured bet won priced lower, census,
table and record regenerated) end RTP FIGURE OVERSTATED, exit 5; M07f (a relabel plus a forged flip) ends exit 1 or 3, never
0. The other mutations end NOT PROVABLY FAIR, exit 1 (or move a FLAG or a package check). M21c covers the all-seed Pass 2,
M23 renames an S5 row. A step that throws is scored FAIL (the checks it scores print FAIL with the
error), the other steps still run, and the run ends NOT PROVABLY FAIR, exit 1; INCOMPLETE covers a step deleted or skipped.

Exit codes of `node verify.js` / `npm run verify`, the same in all 11 HouseBets new-engine packages (the ranking of
RTP-CLAIM 1.2.0, `rtpClaimVerdict`): 0 PROVABLY FAIR — Full Pass · 2 PROVABLY FAIR — Conditional Pass · 5 RTP FIGURE
OVERSTATED · 3 INCOMPLETE · 1 NOT PROVABLY FAIR · 4 `verify.js` is a stale build of the sources beside it (no verdict). When
more than one applies: NOT PROVABLY FAIR > INCOMPLETE > RTP FIGURE OVERSTATED > Conditional Pass > Full Pass.

## Evidence

| exhibit | file | role |
|---|---|---|
| E01 | `evidence/E01-coinflip-fairness-spec-2026-10-12.json` | the server's published coin flip spec (draws, side rule, modes, multipliers, tables, four worked examples), with the earlier identical read |
| E02 | `evidence/E02-coinflip-rules-panel-2026-10-10.json` | the rules panel text in the game page's code, its bet-slip max-win messages, constants and functions (modes, multipliers, 98 % cap, RTP claim), with the bundle's hash |
| E03 | `evidence/E03-coinflip-limits-2026-10-12.json` | the limits answer: minimum stake 0.01000311 USDT, maximum win 1,000,310.0961298 USDT, wallet decimals 8 |
| E04 | `evidence/E04-coinflip-bet-history-2026-10-13.json` | the platform's bet-history rows of all 7,234 package rounds |
| E05 | `evidence/E05-account-reconcile-2026-10-13.txt` | the full output of the workshop's `reconcile-full.py` on the final ledger: every capture file of the 11 games (this package's four, 7,234 rounds, and the 552 coin flip bets of the pilot run described under [Dataset and capture](#dataset-and-capture)), 86,979 history entries = 86,966 captured rounds + 13 bets of 10 Oct, 0 unexplained; the before-balance it derives (wallet after − net + open stakes) equals the run's `--before` argument, 986.84718000 (DL-10) |
| E06 | `evidence/E06-coinflip-empty-seed-control-2026-10-13.json` | one request with an empty client seed, answered HTTP 400 with a generic error (`{"error":"an error occurred"}`); nothing was read afterwards |
| E07 | `evidence/E07-coinflip-refused-settings-2026-10-12.json` | the refused requests: the 1-coin multi toss of the 12 Oct pilot run (36/36 "multi toss takes 2 to 10 coins") and the planned capture's 16 transient refusals |
| E08 | `evidence/E08-coinflip-rules-panel-live-2026-10-19.json` | the same rules panel text in the live copy of the game page's bundle, fetched 19 Oct 2026 (last-modified Fri, 16 Oct 2026 09:18:09 GMT, sha256 and etag recorded), with every key changed since E02 (the speed line reworded; Min bet / Max bet and a max-win cap line replace the bet-range line; the three return sentences unchanged) |

`scripts/make-evidence.py` records the source path and sha256 of each exhibit; `scripts/make-live-rules.py` builds E08 from the
live bundle copy of 19 Oct and stops unless its reading reproduces every key of E02 from the 10 Oct copy.

## Limitations and trust

### Load-bearing premises

| ID | Premise | Why it holds | Could the data contradict it? |
|---|---|---|---|
| P-1 | Each commitment was shown before its bets. On the 141 of 145 pairs whose client seed the capture drew (every pair outside Phase D), the seed was drawn after the commitment was read; the 4 Phase D client seeds were chosen before the capture (DL-2), and each of their commitments was read before the pair's first bet | The capture read the hash, then drew the seed, then bet; timestamps logged per pair | Partly: a commitment that did not match its revealed seed would fail COINFLIP-01; the order of reads is the capture's record, not the server's |
| P-2 | E02 is the rules panel text the live coin flip page loads | The bundle E02 was cut from is the one the live coin flip page loaded, checked 10 Oct 2026; whether and where each string renders was not observed | No: the rendered panel was not captured; a different panel would not show in the data |
| P-3 | The Multi tab is coins × flips at one flip per coin | E02 rulesMulti1 "Pick a side and how many coins to toss, 2 to 10"; the multi toss and coins × flips formulas agree on every cell (COINFLIP-13) | Partly: the per-coin-call multi toss the spec also describes was refused when requested with 1 coin (E07); no other request shape for it was tried |
| P-4 | The account was used only by the capture | E05: the history holds the captured rounds and 13 earlier bets, nothing else | Yes: any other bet would be an unexplained history entry |

### Declared limitations register

| ID | Limitation | Effect | Closure / evidence |
|---|---|---|---|
| DL-1 | The capture rig skipped 16 coin flip bets the server answered with a transient 400 "Transaction temporarily unavailable", so the last seed pair of the capture holds 34 bets, not 50 | Verdict-neutral: no nonce was used (COINFLIP-04); those 34 bets are in their own file (`data/…tail-34bets.json`) and the verifier recomputes them (COINFLIP-07, 10, 11, 13) and replays their seed in Pass 2 (COINFLIP-21) | The supplementary sets (13 Oct) have 0 skips |
| DL-2 | Phase D client seeds are predictable strings chosen by the auditor (`provablyfair-1`, `provablyfair-2`, `player-seed-abc`, `1234567890`) | All 4 Phase D pairs are exposed to an operator who could foresee them; Phase D tests recomputation, not unpredictability | Pass 2 replays the four Phase D seeds with the rest (COINFLIP-21); Phases A–C seeds carry the rig's CSPRNG source label, `node:crypto randomBytes(16) hex` (141/141, COINFLIP-06: a label check; the generator is in `capture/hb-capture-lib.mjs`) |
| DL-3 | A bet whose win would exceed the maximum win (1,000,310.0961298 USDT, E03) was not placed | At 1,013.76× a stake above 986.73 USDT would exceed it. The page's code blocks such a bet ("The win would exceed the maximum payout of {amount} {currency}") and has a message for a server refusal ("The win would exceed the maximum payout"), E02; the server's own answer was not witnessed | COINFLIP-14 passes with the refusal declared unwitnessed (its rule does not ask for it to be produced): the refusal is reachable within the bet limits and was never produced; no captured payout came near the cap |
| DL-4 | The Phase A plan was sized at 6,624 slots = 138 classes × 48, under the profile's 50 floor by design, before any trim; it was then trimmed to 6,600 to make whole epochs and lost 16 slots to transient refusals: 45–48 bets per class in Phase A | COINFLIP-15 is a capture-origin FLAG, verdict-neutral; every class is present and every bet recomputes | A re-capture at ≥ 50 per class would close it |
| DL-5 | Commitment timing rests on the capture's reads (P-1) | Hash equality is a consistency check | — |
| DL-6 | The player-facing reveal path was observed in the API and the game's code, not on the rendered verify screen | README "Verify a bet" steps 1–2 are scoped to that; where the screen shows the hashed seed was not checked | — |
| DL-7 | Pass 2 scores the played slots whose largest multiplier is ≤ 100× (5,267 of 7,234). The subset was set for the pooled form, where the slots above (up to 1,013.76×) weaken the all-slot test (pooled, all slots: z −0.211); it is kept unchanged under the per-slot form scored since 14 Oct 2026 | The all-slot per-slot statistic is printed, not scored (z −0.838, p 0.2010, power 4.00 pp); every unscored slot is recomputed by COINFLIP-07/11 | `src/sim-config.ts` records the subset as decided on 13 Oct before the statistic was computed on the live data; no artifact orders the two |
| DL-8 | The per-bet balance field cannot be checked bet to bet: 8 games were captured at once | Reconciliation uses the platform history (E04) and the account wallet (E05) instead | E05 RECONCILED |
| DL-9 | The datasets ship with the audit account's HouseBets user id replaced by the string "redacted" (`bets[]._raw.game.userId`, one per bet: 13,818 values across the shipped data files; the other userId fields hold the nil UUID, 41,454 values, unchanged) | No check uses the user id and every other byte is as captured. The as-captured files are not shipped: they stay in the HouseBets workshop, and `data/REDACTION.txt` gives each one's sha256 next to the shipped file's sha256; `node scripts/redact-user-id.mjs <as-captured> <out>` reproduces the shipped bytes (a text substitution of that one value) | COINFLIP-26 requires every bet's `_raw.game.userId` == "redacted" and no other userId value |
| DL-10 | E05's 8-dp balance before the capture, 986.84718000, is the `--before` argument the reconcile run was given; the exhibit shows only that wallet after − net + open stakes equals it. The workshop records that figure as read from the page header before the first bet; that screenshot was not kept | The before-balance has no surviving independent exhibit; the first answer E05 prints (986.8372, 12 Oct 13:31:59.103Z) is to a bet placed before every coin flip bet in the capture files E05 lists (the earliest of those, the 552-bet pilot run, starts 2026-10-12T13:32:46.160Z, `npm run excluded`), so this package holds no bet it can be tied to | COINFLIP-16 checks every figure E05 does show by arithmetic, and the last answer's 4-dp balance against the 8-dp balance after |
| DL-11 | 71 of the 147 Pass 1 bands have a tolerance wider than the 1 % house edge | From 1,000,000 rounds those bands cannot detect an edge of 1 %; they test gross misbehaviour only | The exact RTP of every setting (COINFLIP-19) carries the RTP claim |
| DL-12 | This package's capture sent no adversarial request to the API apart from the one empty client seed of E06, so its data cannot reproduce a fairness-integrity test | The tests behind the S5 matrix were run separately on HouseBets' running service by ProvablyFair.org and are recorded in the ProvablyFair.org report for this game, Section 5 (Fairness Integrity Testing), not in this package: all 8 rows Pass on them (6 on every control the row names, 2 on part); single audit account | The [S5 matrix](#s5-fairness-integrity-matrix) names the tests behind each row and states what the captured data shows. Reproducing a test from this package needs a deliberate probe capture |
| DL-13 | The capture code ships as redacted reference copies, not as-run copies: comments edited, code unchanged ([Dataset and capture](#dataset-and-capture)). The $10 set's as-run rig is held privately (its sha256 is in that dataset's meta); the other as-run copies were not kept | The capture code shows how client seeds and settings were drawn; the exact bytes that ran for Phase A, C and D are not in the package (their sha256 is in each dataset's `meta.captureScript`) | No scored check reads the capture code; every bet is recomputed from the data |
| DL-14 | COINFLIP-21's scored per-slot rule rejects at p < 0.009, not the nominal 0.01. When Pass 2 was widened to every revealed seed (27 Oct 2026), the rule's honest false-alarm rate at 0.01 on the widened scored slots came out 0.01007 ± 0.000223, not within the 1 % cap a failing step must meet; at 0.009 it is 0.00907 ± 0.000212 | A slightly less sensitive test (power 3.55 pp at 80 %); the threshold was set from the honest replicates of the scored slots' settings, before the statistic was computed on the widened population | `src/sim-config.ts` SIM_PASS2_ALPHA_SCORED, `src/false-alarm-pass2.ts`, `npm run false-alarm:pass2`; the observed p 0.1439 is above both thresholds |

## Terms

**G-BIND:** the framework's population rule (COINFLIP-05): the counts a dataset is checked against are code constants in
`src/loader.ts`, never the dataset's own header.

## Release history

| Release | What changed | Verdict |
|---|---|---|
| `v1.0.0` | First public release, 24 Nov 2026. | PROVABLY FAIR — Full Pass |

Pilot run: the account's history (E05) also holds 552 coin flip bets on the same engine, from a pilot run
of 12 Oct 2026; they are not part of the audited population ([Dataset and capture](#dataset-and-capture)).

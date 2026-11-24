# HouseBets Coin Flip: algorithm specification

Written 21 Oct 2026 for the ProvablyFair.org audit of HouseBets House Games **Coin Flip** on the October 2026 engine
(fairness version `canonical`).

This document states the flip derivation, the three ways a round is settled and the payout of HouseBets Coin Flip in
enough detail to rebuild them. It is taken from what HouseBets publishes and from this package's own code, and every rule
names its source:

- **SPEC**: HouseBets' published fairness answer, `GET /housegames/coinflip/fairness`, as answered to the capture on
  12 Oct 2026 (exhibit E01, `evidence/E01-coinflip-fairness-spec-2026-10-12.json`; the same body at 13:32Z and 17:04Z).
- **PAGE**: the rules panel text and the constants it is filled from, in the coin flip game page's code (E02, the bundle
  of 10 Oct 2026; E08, the live copy fetched 19 Oct 2026). The rendered panel was not captured.
- **LIMITS**: `GET /housegames/limits/coinflip` (E03): minimum stake 0.01000311 USDT, wallet decimals 8.
- **DATA**: measured on the captured bets by the scored steps of `tests/verify.ts` (step ids `COINFLIP-nn`; the counts are
  the ones `npm test` prints).
- **CODE**: the module of this package that implements the rule (`src/rng.ts`, `src/rules.ts`, `src/spec.ts`).

---

## 1. Inputs and commitment

### 1.1 Inputs

| Input | Form | Source |
|---|---|---|
| `serverSeed` | 64 lowercase hex characters; secret until the pair is rotated | DATA: 145/145 revealed seeds of the shipped files. The derivation uses it as **text** (§2) |
| `clientSeed` | text string | SPEC (`message`); DATA: `pfcoin` + 32 hex characters in Phases A–C (`pfcoinstart` + 32 hex on the first pair of a set), four auditor-typed seeds in Phase D (`provablyfair-1`, `provablyfair-2`, `player-seed-abc`, `1234567890`); all ASCII |
| `nonce` | integer, **1** on the first bet of a fresh pair, +1 per bet | DATA: nonces exactly 1…50 in 131/131 Phase A epochs, equal to the server's nonce count at rotation (COINFLIP-04) |
| `calls` | `n` letters `H` / `T`, 1 ≤ n ≤ 10 | SPEC (`minFlips` 1, `maxFlips` 10); PAGE (rulesStreak1) |
| `target` | `t`, the number of calls that must land: `minTargets[n] ≤ t ≤ n` (`t = n` when not chosen) | SPEC (`winRule`, `minTargets` [1,1,1,1,1,2,2,2,3,3], `maxWinChance` 0.98) |
| `coins` | `C`, 2 … 10, for the coins × flips and multi toss bets | SPEC (`multiMinFlips` 2, "2 <= n <= 10"); PAGE (E02 constants `Yi` 2, `Zi` 10) |
| `stake` | USDT, at most 8 decimals | LIMITS (decimals 8); DATA |

The package names the three bets as `kind` (`src/types.ts`): `'streak'` (every one of the `n` calls must land, `t = n`),
`'target'` (at least `t < n` calls), `'coins'` (C coins, each flipping the `F = n`-letter calls pattern; multi toss is
`F = 1`, one side called). The server receives coins bets as mode `"multi"` with `coins` C.

### 1.2 Commitment

```
commitment = lowercase_hex( SHA-256( UTF-8(serverSeed) ) )
```

- SOURCE: SPEC (summary: "The server seed is committed up front by its SHA-256 hash and revealed when you rotate") +
  DATA for the encoding: 145/145 revealed seeds across Phase A, its tail, C, the $10 set and D (COINFLIP-01).
- The next-seed hash chain links on 130/130 Phase A transitions, from a pre-capture anchor (COINFLIP-02).
- CODE: `src/rng.ts` `sha256Hex`.

---

## 2. Outcome derivation

### Step 1: the draw stream

```
key        = UTF-8(serverSeed)                                       # the 64-character text, not hex-decoded
block_b    = HMAC-SHA256( key, UTF-8( clientSeed + ":" + decimal(nonce) + ":" + decimal(b) ) )   for b = 0, 1, 2, …
draw i     = bytes 4i … 4i+3 of the stream block_0 ‖ block_1 ‖ …, read as an unsigned 32-bit BIG-ENDIAN integer u_i
           = block_floor(i/8)[ 4·(i mod 8) … 4·(i mod 8) + 3 ]
```

Flip `i` (0-based) reads draw `i`: flips 0–7 come from block 0, flips 8–15 from block 1, and so on. A bet reads `n`
draws, or `C × F` for coins × flips (up to 100, block 12).

- SOURCE: SPEC (`"hash": "HMAC-SHA256"`, `"key": "serverSeed"`, `"message": "clientSeed:nonce:block"`,
  `"bytesPerDigest": 32`, `"bytesPerDraw": 4`, `"byteOrder": "big-endian"`, `"drawBits": 32`, `"drawRule": "flip i reads
  draw i (bytes 4i..4i+3, block floor(i/8))"`).
- No call, target, mode or coin count enters the message: every bet recomputes with the calls excluded from the
  derivation (COINFLIP-17).
- CODE: `src/rng.ts` `hmacBlock`, `draws`.

### Step 2: draw to side

```
side_i = floor( u_i / 2^32 × 2 )        # 0 = H (heads), 1 = T (tails); the top bit of u_i
```

- SOURCE: SPEC (`"sideRule": "side = floor(u / 2^32 * 2): 0 = H, 1 = T"`) + PAGE (E02 rulesFair1: "the top bit of the
  draw picks the side").
- No rejection and no bias: the rule is a single step at `u = 2^31`, so H and T each have exactly 2,147,483,648 of the
  2^32 draws (COINFLIP-08).
- DATA: the flip sequence recomputed from the revealed seed equals the served sequence, compared as strings, on
  6,550/6,550 Phase A bets (streak 474, target 1,808, coins × flips 4,268) and 684/684 tail and supplementary bets
  (COINFLIP-07).
- SPEC vectors: the four worked examples E01 publishes, ten draws and ten flips each, recompute 4/4 (COINFLIP-09; §5 V1–V4).
- CODE: `src/rng.ts` `sideOf`, `flips`.

---

## 3. Win condition, multiplier and payout

Multipliers are carried as integers in **1e-4 units** (`mult4`, so 1.98× = 19800); `floor4(x)` is `x` rounded down to 4
decimals. Each formula below is the integer floor of an exact rational.

### 3.1 Streak and target game

```
matched = number of i in 0 … n−1 with flip_i = calls[i]
S(n, t) = Σ_{i = t}^{n} C(n, i)                        # outcomes with at least t calls landed, of 2^n
win     ⟺ matched ≥ t                                   # t = n for the streak
mult4   = floor( 9900 × 2^n / S(n, t) )   on a win;  0 on a loss
```

- SOURCE: SPEC (`"winRule": "at least target of the n calls land as called (target = n unless chosen: every flip)"`;
  `"multiplier": "floor4(0.99 * 2^n / S(n, target)), S(n, k) = sum_{i>=k} C(n, i); = 0.99 * 2^n when target = n"`) +
  PAGE (E02 rulesStreak2 "You win only if every flip lands as called."; rulesStreak3 "A win pays 0.99 × 2ⁿ for n flips:
  1.98× for one, up to 1,013.76× for ten"; rulesEdge1 "the multiplier is the fair odds times 0.99, rounded down to four
  decimals").
- The legal targets are `minTargets[n] ≤ t ≤ n`, the smallest `t` keeping `S(n, t) / 2^n ≤ 98 %`: 10/10 `n`
  (COINFLIP-14). 48 legal (n, t) settings.
- E01 also publishes `multiplierTable` and `winChanceTable`; the tables equal the formula and the binomial law cell for
  cell (COINFLIP-13: 55/55 cells; COINFLIP-18: 55/55 cells). They are compared, never used.
- CODE: `src/rules.ts` `matchedOf`, `S`, `mult4Target`, `mult4Of`.

### 3.2 Coins × flips (multi toss at F = 1)

```
coin j (0 … C−1) reads flips j·F … j·F + F − 1
h       = number of coins whose F flips all equal the calls pattern (the survivors)
mult4   = floor( 9900 × 2^F × h / C )      # 0 when h = 0
```

Multi toss is the same bet at `F = 1` (one side called, C coins): `mult4 = floor(19800 × h / C)`.

- SOURCE: SPEC (`"coinsRule"`: "C coins (2..10) each flip the F-letter calls pattern in a row; coin i reads draws i*F ..
  i*F+F-1; every coin whose F flips all land as called pays its share at 0.99 * 2^F"; `"coinsMultiplier": "floor4(0.99 *
  2^F * h / C)"`; `"multiMultiplier": "floor4(1.98 * h / n), h = coins landed as called (2 <= n <= 10)"`) + PAGE (E02
  rulesMulti1 "Pick a side and how many coins to toss, 2 to 10. Your stake is split evenly across the coins."; rulesCxf5:
  a round where too few coins survive "pays back only part of your stake").
- E01's `multiTable` equals the formula on 63/63 cells, and multi toss equals coins × flips at F = 1 on every cell
  (COINFLIP-13). The survivor law by enumeration equals the one the package uses on 90/90 (C, F) settings (COINFLIP-18).
- A coins round with `h > 0` can pay less than the stake. E01 `multiProfitChance` and the server's `winChance` field give
  the chance of a payout above the stake; both are compared, never used (COINFLIP-13, COINFLIP-18).
- CODE: `src/rules.ts` `matchedOf`, `mult4Coins`, `mult4Multi`, `mult4Of`.

DATA for §3.1–3.2: the server's `matched` field equals the recomputed count, and the win rule per mode equals the served
win or loss, on 6,550/6,550 Phase A bets and 684/684 supplementary bets (COINFLIP-10); the multiplier paid equals the
formula on 2,204/2,204 Phase A winners and 368/368 supplementary winners, losers served 0 on 4,346/4,346 (COINFLIP-13).

### 3.3 Payout

```
payout = floor_8( stake × mult4 / 10^4 )        # truncated to the wallet's 1e-8 unit; 0 when mult4 = 0
```

In 1e-8 units: `payout8 = floor(stake8 × mult4 / 10^4)`.

- SOURCE: PAGE + LIMITS (wallet decimals 8). The truncation is DATA: exact at 8 decimals on 6,550/6,550 Phase A bets and
  684/684 tail and supplementary bets, every money value on the 1e-8 grid as served (COINFLIP-11, COINFLIP-12).
- Max win: E02 rulesMaxWin "The maximum win on one bet is {cap}."; E03 `wallet.maxWin` 1,000,310.0961298 USDT. The
  largest multiplier, 1,013.76×, pays 10.14075279 at the minimum stake; no bet came near the cap (COINFLIP-14 passes with the refusal declared unwitnessed; §6 O1).
- CODE: `src/rules.ts` `units8`, `payout8`.

### 3.4 RTP

For each of the 147 legal settings (target game 48, multi toss 9, coins × flips 90) the exact return, before the payout is truncated to 1e-8 (§3.3), is
`Σ_levels mult4 × weight / (10^4 × 2^bits)` (`src/rules.ts` `allLaws`, `moments`). It runs from 0.9899296875 (126711/128000,
target game n = 6, t = 2) to 0.99 and is exactly 99 % on the 115 settings whose multipliers need no rounding (COINFLIP-19,
`outputs/rtp-claim-table.json`). The published figure is 99 % (E02 rulesEdge1, rulesCxfEdge, rulesMultiEdge; E08 the
same three; E01 summary "the return is at most 99% at every n and target"), read by the verifier from the exhibits at run
time.

### 3.5 Fields an implementation must not read

The served `outcome` (the flip string), `matched`, `payoutMultiplier`, `payout`, `winChance` and the wallet balance are
claims to be checked. The derivation reads only the revealed `serverSeed`, `clientSeed`, `nonce`, the `calls`, the
target or coin count, and the `stake`.

---

## 4. Source per step (summary)

| Step | Source | Evidence |
|---|---|---|
| Commitment = SHA-256 over the seed's UTF-8 text | SPEC + DATA | 145/145 seeds (COINFLIP-01) |
| Next-seed hash chain | DATA | 130/130 Phase A links (COINFLIP-02) |
| Nonce from 1, +1 per bet | DATA | 131/131 epochs (COINFLIP-04) |
| HMAC stream, key = seed text, message `clientSeed:nonce:block`, flip i = draw i | SPEC | 6,550/6,550 + 684/684 flip sequences (COINFLIP-07); E01 vectors 4/4 (COINFLIP-09) |
| Side = top bit of u | SPEC + PAGE | exactly 2^31 draws per side (COINFLIP-08) |
| Calls do not enter the message | SPEC + DATA | 7,234/7,234 bets recompute without them (COINFLIP-17) |
| Match count and win rule per mode | SPEC + PAGE | 6,550/6,550 + 684/684 (COINFLIP-10) |
| Multiplier formulas, floor to 1e-4 | SPEC + PAGE | 2,204/2,204 + 368/368 winners; E01 tables cell for cell (COINFLIP-13) |
| Win probability from the binomial law | SPEC | 48/48, 9/9, 90/90 laws enumerated (COINFLIP-18) |
| Payout truncated to 1e-8 | LIMITS + DATA | 6,550/6,550 + 684/684 (COINFLIP-11, COINFLIP-12) |

---

## 5. Test vectors

V1–V4 are E01's published worked examples (ten draws and ten flips each). V5–V10 are copied from
`data/housebets-coinflip-phaseA-6550bets.json` (bet `roundId`), all from the first seed pair of Phase A. Every value
below was printed by this package's `src/rng.ts` and `src/rules.ts` and equals the served value.

**V1–V4: E01 examples** (first ten flips)
```
housebets-demo-server-seed-0001 / demo-client / nonce 1
  draws 3067352357,880954808,1637878786,1213675087,2326647103,481855596,869634276,4138718340,46131377,3723417200
  flips THHHTHHTHT (E01: THHHTHHTHT)
housebets-demo-server-seed-0001 / demo-client / nonce 2 → flips TTTTHTHHTT (E01: TTTTHTHHTT)
housebets-demo-server-seed-0001 / demo-client / nonce 3 → flips TTTTTTHHHT (E01: TTTTTTHHHT)
5a1f7d2c9e4b8a3f6d0c2b5e8f1a4d7c0b3e6f9a2d5c8b1e4f7a0d3c6b9e2f5a / housebets / nonce 1 → flips THHHTTTTTT (E01: THHHTTTTTT)
```

Seed pair of V5–V10:
```
serverSeed  b47b1f16a2814e7a54c1110480bf933478fc93494a54f9961c99f132e2f5bd8f
commitment  522c162f97c45b8e2461b8e1ae1aaeb2345f1973c014f3a79665025b03480ac8
clientSeed  pfcoinstart3d83f16dbe8d573df91771f8e9cc0361        stake 0.01000311
```

**V5: roundId `3e9b6ce2-02d9-4a83-9667-9ae2d32699ed`** (streak, n = 2, calls `HT`, win)
```
message  …:19:0   HMAC 4767d580a234cb16ec33212b42f8c81ab0e180973c6e0a6312f7e87395142f9c
draws 1197987200, 2721368854 → flips HT → matched 2 = t → win; mult4 39600 (3.96×) → payout 0.03961231
```

**V6: roundId `20d0f0da-28bd-4613-93f8-d4e110fbe410`** (streak, n = 10, calls `HHTHTHHHTH`, loss)
```
message  …:33:0 and …:33:1
HMAC     ea965831b940a14f409b9f97b0ce358203909dbbc6e6aa8bb93d768fe69b9159
         d4df7931c047d2ac9f88b2d2b8caa19c2bb9c8c30d30a15cf275a52aaeadaec5
flips TTHTHTTTTT → matched 1 < 10 → loss; payout 0
```

**V7: roundId `9be02461-b0b5-4215-b4cd-1cc07d8e2c5e`** (target game, n = 4, t = 1, calls `THTH`, win)
```
message  …:4:0    HMAC b14c8042c5b382611c7ecab47fb2e0fb6c657471a13529a7572cbf3ec9fce479
draws 2974580802, 3316875873, 478071476, 2142429435 → flips TTHH → matched 2 ≥ 1 → win
S(4, 1) = 15 → mult4 floor(9900 × 16 / 15) = 10560 (1.056×) → payout 0.01056328
```

**V8: roundId `f2dead0e-ab31-4039-94dc-2d66a258c3cb`** (multi toss, C = 5, F = 1, call `H`)
```
message  …:8:0    HMAC 8640f3ed03908ccd4516f4f103a0e49b3e4f940be3cb66e84051bd9d4d1d323b
draws 2252403693, 59804877, 1159132401, 60875931, 1045402635 → flips THHHH → h = 4
mult4 floor(19800 × 4 / 5) = 15840 (1.584×) → payout 0.01584492
```

**V9: roundId `eb65f112-29af-4406-a852-0665cb102e42`** (coins × flips, C = 6, F = 4, calls `THHT`)
```
messages …:6:0 … …:6:2
flips HHHT THHT THHH HHTT TTHH HTTT → coin 1 (0-based) survives → h = 1
mult4 floor(9900 × 16 × 1 / 6) = 26400 (2.64×) → payout 0.02640821
```

**V10: roundId `aa22ca46-e7ce-416d-a285-ea779dfca8cb`** (coins × flips, C = 6, F = 6, calls `HTHTTH`, no survivor)
```
messages …:1:0 … …:1:4  (36 draws, blocks 0–4)
flips THTHHH TTHHHH THTTTT THHTTH HHTHTH TTHTTT → h = 0 → payout 0
```

Further: `S(6, 2)` = 57, `mult4Target(6, 2)` = 11115 (1.1115×, the lowest RTP setting); `mult4Target(10, 10)` =
`mult4Coins(10, 10, 10)` = 10137600 (1,013.76×); `mult4Multi(7, 3)` = 8485 (0.8485×); `allLaws()` lists 147 settings.

---

## 6. Open points the public sources do not settle

- **O1: max-win refusal.** E02 states the cap and the page's code has a message for the server refusing a bet over it; no
  such bet was placed, so the server's answer was not witnessed (MANIFEST.md DL-3).
- **O2: payout truncation.** The rules give the multiplier's floor to 4 decimals; the truncation of the payout to 1e-8 is
  measured on every bet, not published.
- **O3: target-game bets and the UI.** The target game (t < n) was placed in a shape the capture rig labels `apiOnly`,
  its label for a setting the game page's UI does not send (COINFLIP-15). Whether the page itself can place a target-game
  bet was not established: the rendered page was not checked. The server accepts and settles these bets by the published
  rule.
- **O4: reveal path.** Observed in the API and the game's code, not on the rendered verify screen.
- **O5: client-seed encoding beyond ASCII.** UTF-8 is applied by `src/rng.ts`; every captured client seed is ASCII.
- **O6: stake grid and currency.** Only USDT was captured, at 0.01000311, 1.000311 and 10.

---

## 7. Reproduction

`npm test` (or `node verify.js`) recomputes every rule above on every shipped bet and prints the counts this document
cites; the step ids are in §4. `tests/rng.test.ts` holds the E01 vectors (V1–V4). V5–V10 and the figures under them were
printed by calling `src/rng.ts` `hmacBlock`, `draws`, `flips` and `src/rules.ts` `flipsNeeded`, `matchedOf`, `mult4Of`,
`S`, `mult4Target`, `mult4Coins`, `mult4Multi`, `allLaws` and `payout8` on those bets of the Phase A file.

---

## 8. Sources in this package

`evidence/E01-coinflip-fairness-spec-2026-10-12.json`, `evidence/E02-coinflip-rules-panel-2026-10-10.json`,
`evidence/E03-coinflip-limits-2026-10-12.json`, `evidence/E08-coinflip-rules-panel-live-2026-10-19.json`;
`data/housebets-coinflip-phaseA-6550bets.json`; `src/rng.ts`, `src/rules.ts`, `src/spec.ts`;
`outputs/rtp-claim-table.json`; the step output of `npm test`.

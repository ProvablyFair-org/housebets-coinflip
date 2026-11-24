#!/usr/bin/env python3
"""Builds evidence/ for the HouseBets coin flip package from the HouseBets workshop (run once by the auditor; the outputs are
pinned in src/loader.ts and listed in MANIFEST.md#evidence). Sources (outside this package):
  W = the HouseBets workshop folder (capture rigs, bundles, 12 Oct capture, 13 Oct full capture + ledger)
Every exhibit records its source path and the sha256 of the source bytes it was cut from."""
import hashlib, json, os, re, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); PKG = os.path.dirname(HERE)
W = os.path.abspath(os.path.join(PKG, '..', '..', 'housebets-new-deal-2026-10-09'))
EV = os.path.join(PKG, 'evidence'); os.makedirs(EV, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
def dump(name, obj):
    open(os.path.join(EV, name), 'w', encoding='utf-8').write(json.dumps(obj, indent=2, ensure_ascii=False) + '\n'); print('wrote', name)

prim_path = os.path.join(PKG, 'data', 'captured', 'housebets-coinflip-sp1-6584bets.redacted.json')
prim_raw = open(prim_path, 'rb').read(); prim = json.loads(prim_raw)
pf = prim['meta']['preflight']
src_note = {'file': 'data/captured/housebets-coinflip-sp1-6584bets.redacted.json', 'sha256': sha(prim_raw), 'field': None}
# the same endpoint read by the earlier 12 Oct capture (13:32Z): the body must be identical, and the exhibit says so
early_path = os.path.join(W, 'capture-2026-10-12', 'coinflip', 'housebets-coinflip-sp1-552bets.json')
early_raw = open(early_path, 'rb').read(); early = json.loads(early_raw)
ef = early['meta']['preflight']['fairness']
assert ef['body'] == pf['fairness']['body'], 'the two 12 Oct reads of the coinflip spec differ'

# E01 the server's published coin flip spec, as answered to the capture (GET /housegames/coinflip/fairness, 12 Oct 17:04:46Z)
dump('E01-coinflip-fairness-spec-2026-10-12.json', {'exhibit': 'E01', 'what': "HouseBets House Games coin flip: the server's published fairness spec (GET /housegames/coinflip/fairness)",
     'source': dict(src_note, field='meta.preflight.fairness'),
     'sameBodyEarlierRead': {'file': 'capture-2026-10-12/coinflip/housebets-coinflip-sp1-552bets.json (HouseBets workshop)', 'sha256': sha(early_raw), 'field': 'meta.preflight.fairness', 'at': ef['at']},
     'answer': pf['fairness']})
# E03 the limits answer (min bet, max bet, max win, wallet decimals)
dump('E03-coinflip-limits-2026-10-12.json', {'exhibit': 'E03', 'what': 'HouseBets coin flip limits (GET /housegames/limits/coinflip)',
     'source': dict(src_note, field='meta.preflight.limits'), 'answer': pf['limits']})

# E02 the game page's rules panel and the constants/functions it is filled from, as shipped in the live coin flip bundle
bp = os.path.join(W, 'bundles', 'platform-housegames-coinflip-game.js'); braw = open(bp, 'rb').read(); bt = braw.decode('utf-8', 'replace')
i = bt.find('rulesMulti1:"'); blk = bt[max(0, i - 3000): i + 4000]
strings = {}
for key in re.findall(r'(rules[A-Za-z0-9]+):"', blk):
    m = re.search(key + r':"((?:[^"\\]|\\.)*)"', blk)
    if m and key not in strings: strings[key] = m.group(1)
consts = {}
for pat in (r'const Ed=98,rn=1e4', r'const Yi=2,Ko=19800', r'jq=1', r'qn=10', r'Zi=10'):
    m = re.search(pat, bt); consts[pat] = m.start() if m else None
ui = {}
for key in ('blockOverMax', 'blockOverMaxWin', 'apiMaxWin'):
    m = re.search(key + r':"((?:[^"\\]|\\.)*)"', bt)
    if m: ui[key] = m.group(1)
funcs = {}
for name in ('_i', 'Wo', 'Ki', 'jo', 'Yo', 'Jo', 'Ld'):
    m = re.search(r'function ' + name + r'\([^)]*\)\{.*?\}(?=function |const |var |let |$)', bt)
    if m: funcs[name] = m.group(0)
assert all(v is not None for v in consts.values()) and len(ui) == 3 and strings.get('rulesEdge1') and strings.get('rulesMulti1') and funcs.get('jo') and funcs.get('Jo'), 'bundle text moved'
dump('E02-coinflip-rules-panel-2026-10-10.json', {'exhibit': 'E02', 'what': 'HouseBets coin flip game page: the rules panel text (English) and the constants and functions it is filled from, as shipped in the bundle the live page loads',
     'source': {'file': 'bundles/platform-housegames-coinflip-game.js (HouseBets workshop)', 'sha256': sha(braw), 'bytes': len(braw), 'checkedOnLivePage': '2026-10-10 (bundles/LIVE-BUNDLES.md)'},
     'rulesPanelEnglish': strings,
     'betSlipMessagesEnglish': ui,
     'constants': {'text': list(consts.keys()), 'offsets': consts, 'meaning': {'MAX_WIN_CHANCE_PCT (Ed)': 98, 'MULT_SCALE (rn)': 10000, 'MIN_MULTI_COINS (Yi)': 2,
                   'MULTI_NUMERATOR (Ko = 1.98 x 1e4)': 19800, 'MIN_FLIPS (jq)': 1, 'MAX_FLIPS (qn)': 10, 'MAX_COINS (Zi)': 10}},
     'functions': {'S(n, t) (_i)': funcs.get('_i'), 'minTarget (Wo)': funcs.get('Wo'), 'legalTarget (Ki)': funcs.get('Ki'), 'targetMultiplier (jo)': funcs.get('jo'),
                   'multiMultiplier (Yo)': funcs.get('Yo'), 'coinsMultiplier (Jo)': funcs.get('Jo'), 'coinsSurvivors (Ld)': funcs.get('Ld')}})

# E04 the platform bet history rows of every round in this package's datasets
lp = os.path.join(W, 'capture-full-2026-10-12', 'ledger', 'ledger-2026-10-13-final.json'); lraw = open(lp, 'rb').read(); L = json.loads(lraw)
led = {x['id']: x for x in L['items']}
files = ['housebets-coinflip-phaseA-6550bets.json', 'housebets-coinflip-phaseA-tail-34bets.json', 'supplementary/housebets-coinflip-phaseC-250bets.json',
         'supplementary/housebets-coinflip-phaseD-200bets.json', 'supplementary/housebets-coinflip-phaseC-safe-10usd-200bets.json']
rows, missing = [], []
for f in files:
    for b in json.load(open(os.path.join(PKG, 'data', f)))['bets']:
        x = led.get(b['roundId'])
        if x is None: missing.append(b['roundId']); continue
        rows.append({k: x[k] for k in ('id', 'game', 'placed_at', 'stake', 'payout', 'currency', 'status')})
assert not missing, f'{len(missing)} rounds not in the ledger'
dump('E04-coinflip-bet-history-2026-10-13.json', {'exhibit': 'E04', 'what': 'HouseBets bet history (GET /api/v1/transactions/bets?category=casino) rows of every coin flip round in this package; fields id = roundId, stake, payout, status',
     'source': {'file': 'capture-full-2026-10-12/ledger/ledger-2026-10-13-final.json (HouseBets workshop)', 'sha256': sha(lraw), 'readAt': L['readAt'], 'entries': len(L['items'])},
     'rows': sorted(rows, key=lambda r: r['placed_at'])})

# E05 the whole-account reconciliation: the FULL output of the workshop's reconcile-full.py (every captured round of all 11
# games against the platform history and the wallet), run on the final ledger with the balance read before the capture
cdir = os.path.join(W, 'capture-full-2026-10-12'); script = os.path.join(cdir, 'reconcile-full.py')
cmd = ['python3', '-I', 'reconcile-full.py', '--ledger', 'ledger/ledger-2026-10-13-final.json', '--before', '986.84718000']
r = subprocess.run(cmd, cwd=cdir, capture_output=True, text=True)
assert r.returncode == 0 and r.stdout.rstrip().endswith('RECONCILED'), 'reconcile-full.py did not reconcile'
head = (f"# E05 {' '.join(cmd)}  (cwd capture-full-2026-10-12/, HouseBets workshop) exit {r.returncode}\n"
        f"# reconcile-full.py sha256 {sha(open(script, 'rb').read())} · ledger-2026-10-13-final.json sha256 {sha(open(os.path.join(cdir, 'ledger', 'ledger-2026-10-13-final.json'), 'rb').read())}\n")
open(os.path.join(EV, 'E05-account-reconcile-2026-10-13.txt'), 'w', encoding='utf-8').write(head + r.stdout); print('wrote E05')

# E06 the empty-client-seed control of Phase D (POST /change_seed with clientSeed "")
dp = os.path.join(PKG, 'data', 'supplementary', 'housebets-coinflip-phaseD-200bets.json'); draw = open(dp, 'rb').read()
dump('E06-coinflip-empty-seed-control-2026-10-13.json', {'exhibit': 'E06', 'what': 'Phase D empty-seed control: the server\'s answer to POST /change_seed {clientSeed: ""}',
     'source': {'file': 'data/supplementary/housebets-coinflip-phaseD-200bets.json', 'sha256': sha(draw), 'field': 'meta.emptySeedControl'}, 'record': json.loads(draw)['meta']['emptySeedControl']})

# E07 the refused settings: the 12 Oct capture's 1-coin multi toss requests (mode "multi", coins 1, one call per coin) and the
# server's answer to each; and the 12-13 Oct full capture's transient refusals (no nonce used)
dump('E07-coinflip-refused-settings-2026-10-12.json', {'exhibit': 'E07', 'what': 'Requests the server refused: the 1-coin multi toss of the 12 Oct capture (every one refused) and the transient refusals of the full capture',
     'source': {'file': 'capture-2026-10-12/coinflip/housebets-coinflip-sp1-552bets.json (HouseBets workshop)', 'sha256': sha(early_raw), 'field': 'meta.rejected'},
     'multiTossOneCoin': {'requestShape': 'POST /housegames/coinflip/bet {calls: <n letters, one per coin>, amount, currency, mode: "multi", coins: 1} (rig/coinflip/capture-hb-coinflip.mjs; the game page never sends coins < 2)',
                          'rejected': early['meta']['rejected']},
     'fullCaptureTransient': {'source': dict(src_note, field='meta.rejected'), 'rejected': prim['meta']['rejected']}})

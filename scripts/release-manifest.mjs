#!/usr/bin/env node
// RELEASE-MANIFEST.json: the identity of what a release ships — every dataset, exhibit and artifact by sha256, the committed
// gate records (mutation battery, fresh-copy gate), the verifier's sources and the standalone bundle (verify.js
// and tests/verify.ts are both pinned), the verdict and counts of the committed verification record, the profile and
// runtime. `--check` recomputes it from disk and fails on any difference (the release script refuses a stale manifest).
// It pins every file of the package except itself (everyFile(), below), and `--check` rebuilds verify.js from the sources in a
// throwaway copy (scripts/build-standalone.mjs, bun) and requires the shipped verify.js to equal it byte for byte, so a body
// edit that keeps the header cannot pass; it also rebuilds site-verifier/derive.js from src/rng.ts
// (scripts/build-site-verifier.mjs --check, bun) and requires the shipped module to equal the rebuild byte for byte.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { bundledWith, bunVersionOf } from './build-standalone.mjs';
const GAME = 'coinflip';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; }).sort();
// Every file of the package is pinned, except this manifest itself (PIN_SKIP: one place to change the rule). The folder is
// walked; left out is only what a clone does not hold: .git, node_modules, macOS .DS_Store, and in outputs/ everything
// but the files .gitignore keeps by name (its "!outputs/<file>" lines; outputs/run/ and other run files are not shipped).
const PIN_SKIP = new Set(['RELEASE-MANIFEST.json']);
function everyFile() {
  const kept = readFileSync(join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).filter((l) => l.startsWith('!outputs/')).map((l) => l.slice(1).trim());
  const walk = (d) => readdirSync(join(ROOT, d)).flatMap((f) => {
    const rel = d ? `${d}/${f}` : f;
    if (f === '.git' || f === 'node_modules' || f === '.DS_Store' || PIN_SKIP.has(rel)) return [];
    if (statSync(join(ROOT, rel)).isDirectory()) return rel === 'outputs' ? kept.filter((k) => existsSync(join(ROOT, k))) : walk(rel);
    return [rel];
  });
  return walk('').sort();
}
const rec = JSON.parse(readFileSync(join(ROOT, 'outputs', 'verification-results.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const prof = readFileSync(join(ROOT, 'src', 'profile-map.ts'), 'utf8');
const pinned = ['outputs/simulation-results.json', 'outputs/rtp-claim-table.json', 'outputs/verification-results.json', 'outputs/mutation-results.json',
  'outputs/fresh-copy.json', 'verify.js', 'tests/verify.ts', 'tests/rng.test.ts', 'tests/mutations.json', 'package.json', 'profile/profile.json', 'package-lock.json', 'docs/ALGORITHM.md', 'docs/INTERFACE.md',
  'README.md', 'MANIFEST.md', 'LICENSE', '.gitignore', '.gitattributes', '.nvmrc'];
// The release this package is cut as (the shape of the reference ProvablyFair.org releases): v1.0.0 is the first public release of housebets-coinflip, so it supersedes
// nothing. `signature` is the fingerprint of the SSH key that signs the release commit and tag. `pending` names what the
// release still waits for; it is read from the audit ID above (ProvablyFair.org assigns it), never typed.
const RELEASE = { release: 'v1.0.0', supersedes: null, signature: 'SHA256:gEujiJm2pRyq7lQsfYQfQ1r97H/J7GdaKHbOW8GtikY' };
const m = {
  package: pkg.name, version: pkg.version, release: RELEASE.release, game: GAME, operator: 'HouseBets (House Games, new engine, fairness version canonical)',
  auditId: ((readFileSync(join(ROOT, 'src', 'artifact-pins.ts'), 'utf8').match(/AUDIT_ID: string \| null = '([^']+)'/) || [])[1]) ?? null,
  verdict: rec.verdict, summary: rec.summary,
  // Methodology v1.1 (14 Oct 2026): the framework version this release is certified under. The RTP-CLAIM rule
  // version and its switch are read from the package's own src/rtp-claim.ts and src/rtp-claim-switch.ts (on).
  framework: '1.1',
  rtpClaim: { rule: (readFileSync(join(ROOT, 'src', 'rtp-claim.ts'), 'utf8').match(/RTP_CLAIM_RULE_VERSION = '([0-9.]+)/) || [])[1] ?? null,
    enforced: /^export const RTP_CLAIM_RULE_ENFORCED: boolean = true;$/m.test(readFileSync(join(ROOT, 'src', 'rtp-claim-switch.ts'), 'utf8')) },
  profile: { sha256: (prof.match(/PROFILE_SHA256 = '([0-9a-f]{64})'/) || [])[1], version: (prof.match(/PROFILE_VERSION = "([^"]+)"/) || [])[1] },
  runtime: { node: pkg.engines?.node, nvmrc: existsSync(join(ROOT, '.nvmrc')) ? readFileSync(join(ROOT, '.nvmrc'), 'utf8').trim() : null },
  // the bun version that bundled verify.js, read from its header (scripts/build-standalone.mjs writes it); --check rebuilds
  // the bundle with the installed bun, and a different bun version can produce different bytes from the same sources
  toolchain: { bun: existsSync(join(ROOT, 'verify.js')) ? bundledWith(readFileSync(join(ROOT, 'verify.js'), 'utf8')) : null },
  files: Object.fromEntries(everyFile().map((p) => [p, sha(join(ROOT, p))])),
  supersedes: RELEASE.supersedes,
  signature: RELEASE.signature,
};
m.pending = m.auditId ? '' : 'audit ID (assigned by ProvablyFair.org)';
const text = JSON.stringify(m, null, 2) + '\n';
const target = join(ROOT, 'RELEASE-MANIFEST.json');
if (process.argv.includes('--check')) {
  const ok = existsSync(target) && readFileSync(target, 'utf8') === text;
  // the standalone bundle, rebuilt from the sources in a throwaway copy, must equal the shipped verify.js byte for byte
  const dir = mkdtempSync(join(tmpdir(), `hb${GAME}-bundle-`));
  let bundle = 'not compared';
  try {
    cpSync(ROOT, dir, { recursive: true, filter: (s) => !/[\\/](data|evidence|outputs|node_modules)([\\/]|$)/.test(relative(ROOT, s) ? '/' + relative(ROOT, s) : '') });
    const r = spawnSync(process.execPath, ['scripts/build-standalone.mjs'], { cwd: dir, encoding: 'utf8' });
    const built = m.toolchain.bun, here = bunVersionOf();
    bundle = r.status !== 0 ? `rebuild FAILED (${(r.stderr || r.stdout || '').trim().slice(0, 120) || 'is bun installed?'})`
      : readFileSync(join(dir, 'verify.js')).equals(readFileSync(join(ROOT, 'verify.js'))) ? `rebuilt from the sources with bun ${here} == the shipped verify.js`
      : built && here && built !== here ? `DIFFERS from a rebuild of the sources with bun ${here}; the shipped verify.js was bundled with bun ${built} (RELEASE-MANIFEST.json toolchain.bun), and another bun version can name local variables differently: rebuild with bun ${built} to compare byte for byte (node verify.js checks the sources itself, exit 4 when they differ)`
      : `DIFFERS from a rebuild of the sources with bun ${here ?? '?'} (the shipped verify.js was bundled with bun ${built ?? 'unrecorded'})`;
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const bundleOk = bundle.startsWith('rebuilt');
  // the site-verifier module: scripts/build-site-verifier.mjs --check rebuilds it from src/rng.ts in a throwaway folder (bun) and
  // requires site-verifier/derive.js to equal the rebuild byte for byte, and SITE_VERIFIER_PIN (src/artifact-pins.ts) its sha256
  const sv = spawnSync(process.execPath, ['scripts/build-site-verifier.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  const siteOk = sv.status === 0;
  const site = siteOk ? 'site-verifier/derive.js rebuilt from src/rng.ts == the shipped file' : `site-verifier/derive.js NOT reproduced from src/rng.ts (${(sv.stdout || sv.stderr || '').trim().split('\n').pop().slice(0, 300)})`;
  console.log(`[release-manifest] ${ok && bundleOk && siteOk ? 'OK' : 'STALE'}: ${Object.keys(m.files).length} files, verdict "${m.verdict}", audit ID ${m.auditId ?? 'not assigned'}; verify.js ${bundle}; ${site}`);
  process.exitCode = ok && bundleOk && siteOk ? 0 : 1;
} else { writeFileSync(target, text); console.log(`wrote RELEASE-MANIFEST.json (${Object.keys(m.files).length} files)`); }

// the step list is bound to the framework profile the MANIFEST cites. profile/profile.json
// is a byte copy of the framework's games/coinflip/profile.public.json; its sha256 must equal PROFILE_SHA256 (src/profile-map.ts, the
// figure the MANIFEST and RELEASE-MANIFEST cite), its version PROFILE_VERSION, and every check it lists must be in
// src/profile-map.ts with the same name, layer, kind and policy. The scored list the verdict is bound to (EXPECTED_STEPS) is
// taken from the vendored file, never from profile-map.ts, so deleting or relabelling a row there cannot shrink it: a binding
// that does not hold withholds the verdict (INCOMPLETE, exit 3).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './loader.ts';
import { PROFILE, PROFILE_SHA256, PROFILE_VERSION, type ProfileCheck } from './profile-map.ts';

export const PROFILE_FILE = 'profile/profile.json';
export interface ProfileBinding {
  ok: boolean; fileSha256: string | null; fileOk: boolean; version: string | null; checks: ProfileCheck[]; scored: string[];
  missing: string[]; relabelled: string[]; differs: string[]; extra: string[]; detail: string;
}
const isScored = (c: { policy: string }) => c.policy === 'HARD_FAIL' || c.policy === 'FLAG';

export function bindProfile(): ProfileBinding {
  const p = join(ROOT, PROFILE_FILE);
  let fileSha256: string | null = null, json: any = null;
  if (existsSync(p)) { const b = readFileSync(p); fileSha256 = createHash('sha256').update(b).digest('hex'); try { json = JSON.parse(b.toString('utf8')); } catch { json = null; } }
  const version: string | null = json?.profileVersion ?? null;
  const fileOk = fileSha256 === PROFILE_SHA256 && version === PROFILE_VERSION && Array.isArray(json?.checks);
  const checks: ProfileCheck[] = fileOk ? json.checks.map((c: any) => ({ id: c.id, name: c.name, layer: c.layer, kind: c.kind, policy: c.policy })) : [];
  const missing: string[] = [], relabelled: string[] = [], differs: string[] = [];
  for (const c of checks) {
    const r = PROFILE.find((x) => x.id === c.id);
    if (!r) { missing.push(c.id); continue; }
    if (r.policy !== c.policy) relabelled.push(`${c.id} ${c.policy} → ${r.policy}`);
    if (r.name !== c.name || r.layer !== c.layer || r.kind !== c.kind) differs.push(c.id);
  }
  const extra = fileOk ? PROFILE.filter((r) => !checks.some((c) => c.id === r.id)).map((r) => r.id) : [];
  const ok = fileOk && missing.length === 0 && relabelled.length === 0 && differs.length === 0 && extra.length === 0;
  const scored = (fileOk ? checks : PROFILE).filter(isScored).map((c) => c.id);
  const detail = `${PROFILE_FILE} sha256 ${fileSha256 ? fileSha256.slice(0, 12) + '…' : 'ABSENT'} == PROFILE_SHA256 ${PROFILE_SHA256.slice(0, 12)}… and version ${version ?? '?'} == ${PROFILE_VERSION}: ${fileOk}; `
    + `src/profile-map.ts rows == the vendored profile (id, name, layer, kind, policy): ${checks.length - missing.length - differs.length}/${checks.length}`
    + `${missing.length ? `; rows missing from profile-map.ts: ${missing.join(', ')}` : ''}${relabelled.length ? `; policy relabelled: ${relabelled.join(', ')}` : ''}`
    + `${differs.length ? `; name/layer/kind differ: ${differs.join(', ')}` : ''}${extra.length ? `; rows not in the profile: ${extra.join(', ')}` : ''}; scored checks of the profile: ${scored.length}`;
  return { ok, fileSha256, fileOk, version, checks, scored, missing, relabelled, differs, extra, detail };
}

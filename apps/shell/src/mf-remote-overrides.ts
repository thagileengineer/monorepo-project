/**
 * Pinned semver loads: default manifest entries use .../<mfe>/latest/mf-manifest.json.
 * Overrides swap `latest` for a concrete version for that remote only.
 *
 * Query: ?mf.mfe01=1.0.0&mf.mfe02=2.0.0
 * sessionStorage: key "mf_versions", value JSON {"mfe01":"1.0.0"}
 * Precedence: query overrides sessionStorage overrides manifest defaults.
 */

const SESSION_KEY = 'mf_versions';

export function readSessionMfOverrides(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function readQueryMfOverrides(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    if (!key.startsWith('mf.') || !value) return;
    const name = key.slice(3);
    if (name) out[name] = value;
  });
  return out;
}

export function applyMfVersionPins(
  manifest: Record<string, string>,
  pins: Record<string, string>,
): Record<string, string> {
  const next = { ...manifest };
  for (const [remoteName, semver] of Object.entries(pins)) {
    const entry = next[remoteName];
    if (!entry || !semver) continue;
    next[remoteName] = rewriteLatestToVersion(entry, remoteName, semver);
  }
  return next;
}

function rewriteLatestToVersion(
  entry: string,
  remoteName: string,
  version: string,
): string {
  const suffix = `/${remoteName}/latest/mf-manifest.json`;
  if (entry.endsWith(suffix)) {
    return entry.slice(0, -suffix.length) + `/${remoteName}/${version}/mf-manifest.json`;
  }
  return entry.replace(
    new RegExp(`/${remoteName}/latest/`),
    `/${remoteName}/${version}/`,
  );
}

export function mergeMfPins(
  manifest: Record<string, string>,
): Record<string, string> {
  const fromSession = readSessionMfOverrides();
  const fromQuery = readQueryMfOverrides();
  let merged = applyMfVersionPins(manifest, fromSession);
  merged = applyMfVersionPins(merged, fromQuery);
  return merged;
}

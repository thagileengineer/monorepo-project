/**
 * Production pipeline: regenerate shell manifest for versioned CDN URLs, then
 * build each MFE and the shell into dist/deploy/<project>/<semver>/.
 *
 * Required: MFE_ASSET_BASE — public origin where dist/deploy/** will be hosted
 *   Example: https://cdn.example.com/mf  → remotes at .../mfe01/latest/mf-manifest.json (prod manifest)
 *
 * Incremental builds (changed apps only):
 *   MFE_DEPLOY_AFFECTED=1  or  node tools/build-versioned-deploy.mjs --affected
 *   NX_BASE / NX_HEAD      — passed to `nx show projects --affected` (default origin/main … HEAD)
 * Writes .mfe-deploy-manifest.json for publish:poc to sync only built apps.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const MANIFEST_FILE = join(root, '.mfe-deploy-manifest.json');

/** Avoid Nx daemon restarts (e.g. lockfile/package.json changes) killing long sequential builds with write EPIPE. */
const nxEnv = { ...process.env, NX_DAEMON: 'false' };

const affectedMode =
  process.argv.includes('--affected') || process.env.MFE_DEPLOY_AFFECTED === '1';

const NX_BASE = process.env.NX_BASE || 'origin/main';
const NX_HEAD = process.env.NX_HEAD || 'HEAD';

const MFES = Array.from({ length: 10 }, (_, i) => `mfe${String(i + 1).padStart(2, '0')}`);
const DEPLOY_PROJECTS = new Set([...MFES, 'shell']);

if (!process.env.MFE_ASSET_BASE) {
  console.error(
    'Set MFE_ASSET_BASE to the URL prefix where versioned folders will be served (no trailing slash).',
  );
  process.exit(1);
}

const versions = JSON.parse(
  readFileSync(join(root, 'mfe-versions.json'), 'utf8'),
);

function gitNameOnlyDiff() {
  try {
    const out = execSync(`git diff --name-only ${NX_BASE}...${NX_HEAD}`, {
      encoding: 'utf8',
      cwd: root,
    }).trim();
    return out ? out.split('\n') : [];
  } catch {
    return null;
  }
}

function needsFullDeployFromGit(paths) {
  if (!paths) return true;
  return paths.some(
    (p) =>
      p === 'mfe-versions.json' ||
      p === 'tsconfig.base.json' ||
      p === 'nx.json' ||
      p.startsWith('tools/build-versioned-deploy') ||
      p.startsWith('tools/generate-mfe-manifest') ||
      p.startsWith('tools/generate-build-version'),
  );
}

function nxAffectedProjects() {
  const out = execSync(
    `npx nx show projects --affected --base=${NX_BASE} --head=${NX_HEAD} --json`,
    { encoding: 'utf8', cwd: root, env: nxEnv },
  );
  const list = JSON.parse(out);
  return Array.isArray(list) ? list : [];
}

/**
 * @returns {string[]} project names to build (subset of DEPLOY_PROJECTS)
 */
function resolveProjectsToBuild() {
  if (!affectedMode) {
    return [...MFES, 'shell'];
  }

  const paths = gitNameOnlyDiff();
  if (paths === null) {
    console.warn(
      '[mfe-deploy] git diff failed (not a repo or missing base ref); building all deploy apps.',
    );
    return [...MFES, 'shell'];
  }

  if (needsFullDeployFromGit(paths)) {
    console.log(
      '[mfe-deploy] Affected mode: global/version inputs changed; building all deploy apps.',
    );
    return [...MFES, 'shell'];
  }

  let affected;
  try {
    affected = nxAffectedProjects();
  } catch (e) {
    console.warn('[mfe-deploy] nx affected failed; building all deploy apps.', e.message || e);
    return [...MFES, 'shell'];
  }

  let toBuild = affected.filter((p) => DEPLOY_PROJECTS.has(p));
  const hasMfe = toBuild.some((p) => p.startsWith('mfe'));
  if (hasMfe && !toBuild.includes('shell')) {
    toBuild = [...toBuild, 'shell'];
  }

  toBuild = [...new Set(toBuild)];

  if (toBuild.length === 0) {
    console.log(
      '[mfe-deploy] Affected mode: no deploy apps changed (nx empty set). Skipping nx builds.',
    );
    return [];
  }

  console.log(
    `[mfe-deploy] Affected mode (${NX_BASE}…${NX_HEAD}): building ${toBuild.join(', ')}`,
  );
  return toBuild;
}

const projectsToBuild = new Set(resolveProjectsToBuild());

execSync('node tools/generate-build-version-modules.mjs', {
  stdio: 'inherit',
  env: nxEnv,
});

execSync('node tools/generate-mfe-manifest.mjs prod', {
  stdio: 'inherit',
  env: { ...nxEnv, MFE_MANIFEST_MODE: 'prod' },
});

const builtList = [];

for (const name of MFES) {
  if (!projectsToBuild.has(name)) continue;
  const v = versions[name];
  if (!v) {
    console.error(`mfe-versions.json missing ${name}`);
    process.exit(1);
  }
  execSync(
    `npx nx run ${name}:build:production --outputPath=dist/deploy/${name}/${v}`,
    { stdio: 'inherit', env: nxEnv },
  );
  builtList.push(name);
}

const shellV = versions.shell;
if (!shellV) {
  console.error('mfe-versions.json missing shell');
  process.exit(1);
}

if (projectsToBuild.has('shell')) {
  execSync(
    `npx nx run shell:build:production --outputPath=dist/deploy/shell/${shellV}`,
    { stdio: 'inherit', env: nxEnv },
  );
  builtList.push('shell');
}

writeFileSync(
  MANIFEST_FILE,
  JSON.stringify(
    {
      mode: affectedMode ? 'affected' : 'full',
      base: NX_BASE,
      head: NX_HEAD,
      built: affectedMode ? builtList : [...MFES, 'shell'],
    },
    null,
    2,
  ) + '\n',
);

console.log('\nDone. Upload dist/deploy/* to your static host under the same paths as MFE_ASSET_BASE.');
if (affectedMode) {
  console.log(`Wrote ${MANIFEST_FILE} for selective publish (built: ${builtList.join(', ') || '(none)'}).`);
}

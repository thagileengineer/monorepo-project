/**
 * Production pipeline: regenerate shell manifest for versioned CDN URLs, then
 * build each MFE and the shell into dist/deploy/<project>/<semver>/.
 *
 * Required: MFE_ASSET_BASE — public origin where dist/deploy/** will be hosted
 *   Example: https://cdn.example.com/mf  → remotes at .../mfe01/latest/mf-manifest.json (prod manifest)
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

if (!process.env.MFE_ASSET_BASE) {
  console.error(
    'Set MFE_ASSET_BASE to the URL prefix where versioned folders will be served (no trailing slash).',
  );
  process.exit(1);
}

const versions = JSON.parse(
  readFileSync(join(root, 'mfe-versions.json'), 'utf8'),
);

execSync('node tools/generate-mfe-manifest.mjs prod', {
  stdio: 'inherit',
  env: { ...process.env, MFE_MANIFEST_MODE: 'prod' },
});

const mfes = Array.from({ length: 10 }, (_, i) => `mfe${String(i + 1).padStart(2, '0')}`);

for (const name of mfes) {
  const v = versions[name];
  if (!v) {
    console.error(`mfe-versions.json missing ${name}`);
    process.exit(1);
  }
  execSync(
    `npx nx run ${name}:build:production --outputPath=dist/deploy/${name}/${v}`,
    { stdio: 'inherit' },
  );
}

const shellV = versions.shell;
if (!shellV) {
  console.error('mfe-versions.json missing shell');
  process.exit(1);
}
execSync(
  `npx nx run shell:build:production --outputPath=dist/deploy/shell/${shellV}`,
  { stdio: 'inherit' },
);

console.log('\nDone. Upload dist/deploy/* to your static host under the same paths as MFE_ASSET_BASE.');

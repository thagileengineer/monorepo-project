import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outFile = join(root, 'apps/shell/public/module-federation.manifest.json');

const versions = JSON.parse(
  readFileSync(join(root, 'mfe-versions.json'), 'utf8'),
);

const mode =
  process.env.MFE_MANIFEST_MODE ||
  process.argv.find((a) => a === 'dev' || a === 'prod') ||
  'dev';

const MFES = [
  'mfe01',
  'mfe02',
  'mfe03',
  'mfe04',
  'mfe05',
  'mfe06',
  'mfe07',
  'mfe08',
  'mfe09',
  'mfe10',
];

/** @type {Record<string, string>} */
const manifest = {};

if (mode === 'dev') {
  const startPort = Number(process.env.MFE_DEV_PORT_START || 4201);
  MFES.forEach((name, i) => {
    const port = startPort + i;
    manifest[name] = `http://localhost:${port}/mf-manifest.json`;
  });
} else {
  const base = process.env.MFE_ASSET_BASE;
  if (!base) {
    console.error(
      'For prod manifest, set MFE_ASSET_BASE (no trailing slash), e.g. https://cdn.example.com/mf',
    );
    process.exit(1);
  }
  const b = base.replace(/\/$/, '');
  for (const name of MFES) {
    const v = versions[name];
    if (!v) {
      console.error(`mfe-versions.json missing entry for ${name}`);
      process.exit(1);
    }
    manifest[name] = `${b}/${name}/${v}/mf-manifest.json`;
  }
}

writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${outFile} (${mode} mode)`);

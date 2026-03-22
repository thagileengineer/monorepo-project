/**
 * Local POC: build versioned MF artifacts, upload to MinIO (S3 API).
 *
 * Prereqs:
 *   - Docker: docker compose -f docker-compose.minio.yml up -d
 *   - AWS CLI v2: aws --version
 *
 * Env (defaults for local MinIO):
 *   MFE_ASSET_BASE   Browser-reachable base (no trailing slash). Example:
 *                    http://localhost:9000/mf-poc/mf
 *   MINIO_ENDPOINT   S3 API for aws CLI (default http://127.0.0.1:9000)
 *   MFE_POC_BUCKET   (default mf-poc)
 *   MFE_POC_PREFIX   key prefix inside bucket (default mf)
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — default minioadmin / minioadmin
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const MFE_ASSET_BASE = process.env.MFE_ASSET_BASE;
if (!MFE_ASSET_BASE) {
  console.error(
    'Set MFE_ASSET_BASE to the public URL prefix for objects, e.g. http://localhost:9000/mf-poc/mf',
  );
  process.exit(1);
}

const ENDPOINT =
  process.env.MINIO_ENDPOINT || process.env.AWS_S3_ENDPOINT || 'http://127.0.0.1:9000';
const BUCKET = process.env.MFE_POC_BUCKET || 'mf-poc';
const PREFIX = (process.env.MFE_POC_PREFIX || 'mf').replace(/^\/+|\/+$/g, '');

if (!process.env.AWS_ACCESS_KEY_ID) process.env.AWS_ACCESS_KEY_ID = 'minioadmin';
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  process.env.AWS_SECRET_ACCESS_KEY = 'minioadmin';
}

const versions = JSON.parse(readFileSync(join(root, 'mfe-versions.json'), 'utf8'));

const awsEnv = {
  ...process.env,
  MFE_ASSET_BASE,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
};

function aws(...args) {
  execSync(`aws ${args.join(' ')}`, {
    stdio: 'inherit',
    env: awsEnv,
  });
}

console.log('Building dist/deploy with latest-aware manifest…');
execSync('node tools/build-versioned-deploy.mjs', {
  stdio: 'inherit',
  env: { ...awsEnv, MFE_MANIFEST_MODE: 'prod' },
});

const s3Base = `s3://${BUCKET}/${PREFIX}/`;
console.log(`\nSyncing dist/deploy/ → ${s3Base}`);
aws(
  's3',
  'sync',
  'dist/deploy/',
  s3Base,
  '--endpoint-url',
  ENDPOINT,
  '--region',
  'us-east-1',
);

console.log('\nMirroring semver builds to .../<app>/latest/ …');
for (const [app, version] of Object.entries(versions)) {
  if (typeof version !== 'string' || !version) continue;
  const localDir = join(root, 'dist', 'deploy', app, version);
  const dest = `s3://${BUCKET}/${PREFIX}/${app}/latest/`;
  console.log(`  ${app}@${version} → ${dest}`);
  aws(
    's3',
    'sync',
    localDir,
    dest,
    '--endpoint-url',
    ENDPOINT,
    '--region',
    'us-east-1',
  );
}

console.log(`
Done.

Serve the shell (same build as in MinIO):
  npm run serve:shell:poc
Then open http://localhost:4200 and use routes /mfe01 … /mfe10.

Remote manifests load from:
  ${MFE_ASSET_BASE}/<mfe>/latest/mf-manifest.json

Pin a remote (semver must exist under that app prefix in MinIO):
  ?mf.mfe01=1.0.0
sessionStorage "mf_versions" JSON also works; query params win.
`);

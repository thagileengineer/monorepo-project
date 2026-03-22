/**
 * Serves the POC shell build from dist/deploy/shell/<semver>/ (same tree as uploaded to MinIO).
 * Run after: npm run publish:poc
 */
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const versions = JSON.parse(readFileSync(join(root, 'mfe-versions.json'), 'utf8'));
const v = versions.shell;
const dir = join(root, 'dist', 'deploy', 'shell', v);

if (!existsSync(dir)) {
  console.error(`Missing ${dir}. Run npm run publish:poc first.`);
  process.exit(1);
}

const port = process.env.SHELL_POC_PORT || '4200';
execSync(`npx --yes http-server "${dir}" -p ${port} -c-1 --cors`, {
  stdio: 'inherit',
  cwd: root,
});

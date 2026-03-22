/**
 * Bump semver in mfe-versions.json for one app.
 * Usage: node tools/bump-version.mjs <mfe01|shell|...> <major|minor|patch>
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'mfe-versions.json');

const [, , name, release] = process.argv;
if (!name || !release || !['major', 'minor', 'patch'].includes(release)) {
  console.error('Usage: node tools/bump-version.mjs <app> <major|minor|patch>');
  process.exit(1);
}

const data = JSON.parse(readFileSync(path, 'utf8'));
const current = data[name];
if (typeof current !== 'string') {
  console.error(`Unknown app "${name}" in mfe-versions.json`);
  process.exit(1);
}

const parts = current.split('.').map((n) => parseInt(n, 10));
if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
  console.error(`Invalid semver for ${name}: ${current}`);
  process.exit(1);
}

if (release === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (release === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
} else {
  parts[2] += 1;
}

const next = parts.join('.');
data[name] = next;
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`${name}: ${current} → ${next}`);

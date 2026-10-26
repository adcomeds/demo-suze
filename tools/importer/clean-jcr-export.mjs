/* eslint-disable no-console */
/*
 * Keeps only the chess challenge pages in migration-work/jcr-content (the folder pushed to AEM)
 * and moves everything else to migration-work/jcr-content-quarantine/.
 *
 * Why: every import regenerates the export from all files in content/, which still holds
 * July migration leftovers (an empty masters page, empty fr/fr and fr/en parents, and France/
 * English snapshots). Pushed to AEM, those wiped the masters blueprints and broke MSM live
 * copies (`*_msm_moved`). Run this after every import: `npm run export:clean`.
 */
import {
  existsSync, mkdirSync, readdirSync, renameSync, statSync,
} from 'node:fs';
import {
  dirname, join, relative, resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const exportDir = join(root, 'migration-work/jcr-content');
const quarantineDir = join(root, 'migration-work/jcr-content-quarantine');

// pages this project creates and may push (relative paths without extension)
const KEEP = [
  /^masters\/en\/chess-challenge$/, // MSM blueprint, rolled out to us/en
  /^(us\/es|fr\/fr)\/chess-challenge$/,
  /^experiments\/(us\/en|us\/es|fr\/fr)\/chess-challenge\/exp-chess-001\/challenger$/,
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(exportDir)) {
  console.log('nothing to clean: no migration-work/jcr-content');
  process.exit(0);
}

const moved = [];
walk(exportDir).forEach((file) => {
  const rel = relative(exportDir, file);
  const page = rel.replace(/\.(xml|md)$/, '');
  if (KEEP.some((re) => re.test(page))) return;
  const target = join(quarantineDir, rel);
  mkdirSync(dirname(target), { recursive: true });
  renameSync(file, target);
  moved.push(rel);
});

console.log(moved.length ? `moved to quarantine:\n  ${moved.join('\n  ')}` : 'export already clean');
console.log('export now contains:');
walk(exportDir).filter((f) => f.endsWith('.xml')).sort()
  .forEach((f) => console.log(`  ${relative(exportDir, f)}`));

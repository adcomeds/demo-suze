/* eslint-disable no-console */
/*
 * Builds the chess challenge sheets from docs/game-sheets/*.source.json.
 *
 *   npm run sheets:build   checks the copy and writes paste-ready CSV files for the
 *                          AEM spreadsheets to docs/game-sheets/out/
 *   npm run sheets:local   same, plus local-only JSON copies served by `aem up`
 *                          (/<locale>/placeholders.json, /<locale>/game-email.json,
 *                          /game-config.json). These are gitignored, never commit them.
 *
 * Checks: no em dash in any copy, every locale filled in, and every placeholder key
 * used by the game blocks exists.
 */
import {
  readFileSync, writeFileSync, mkdirSync, readdirSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sheetsDir = join(root, 'docs/game-sheets');
const outDir = join(sheetsDir, 'out');
const local = process.argv.includes('--local');
const SHEETS = ['placeholders', 'game-email'];
const GAME_BLOCKS = ['age-gate', 'player-registration', 'chess', 'invite', 'player-message'];
const DYNAMIC_KEYS = [
  'age-gate-yes', 'age-gate-no',
  ...['q', 'r', 'b', 'n'].map((p) => `chess-promote-${p}`),
  ...['w', 'b'].flatMap((c) => ['p', 'n', 'b', 'r', 'q', 'k'].map((p) => `chess-piece-${c}${p}`)),
  ...['stalemate', 'draw', 'abandoned'].map((o) => `chess-outcome-${o}`),
  ...['validation', 'unauthorized', 'not-found', 'game-full', 'not-your-turn', 'illegal-move',
    'stale-version', 'rate-limited', 'network', 'unknown'].map((c) => `error-${c}`),
];

const errors = [];
const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

function usedKeys() {
  const keys = new Set(DYNAMIC_KEYS);
  GAME_BLOCKS.forEach((block) => {
    const dir = join(root, 'blocks', block);
    readdirSync(dir).filter((f) => f.endsWith('.js')).forEach((file) => {
      const source = readFileSync(join(dir, file), 'utf8');
      [...source.matchAll(/\bt\(\s*'([a-z0-9-]+)'/g)].forEach(([, key]) => keys.add(key));
    });
  });
  return keys;
}

const built = {};
SHEETS.forEach((sheet) => {
  const source = JSON.parse(readFileSync(join(sheetsDir, `${sheet}.source.json`), 'utf8'));
  const { locales, review, rows } = source;
  built[sheet] = new Set(rows.map(([key]) => key));
  rows.forEach(([key, ...values]) => {
    values.forEach((value, i) => {
      if (!value) errors.push(`${sheet}: "${key}" is empty for ${locales[i]}`);
      if (/—/.test(value)) errors.push(`${sheet}: "${key}" (${locales[i]}) contains an em dash`);
    });
  });

  locales.forEach((locale, i) => {
    const name = locale.replace('/', '-');
    const csv = [['Key', 'Text', 'Review'], ...rows.map(([key, ...values]) => [key, values[i], review[locale]])]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    mkdirSync(join(outDir, name), { recursive: true });
    writeFileSync(join(outDir, name, `${sheet}.csv`), `${csv}\r\n`);

    if (local) {
      const data = rows.map(([key, ...values]) => ({
        Key: key, Text: values[i], Review: review[locale],
      }));
      mkdirSync(join(root, locale), { recursive: true });
      writeFileSync(join(root, locale, `${sheet}.json`), JSON.stringify({
        total: data.length, offset: 0, limit: data.length, data, ':type': 'sheet',
      }, null, 2));
    }
  });
});

const missing = [...usedKeys()].filter((key) => !built.placeholders.has(key));
missing.forEach((key) => errors.push(`placeholders: key "${key}" is used by a block but missing`));

const config = [{ Key: 'game-api-base', Value: '' }];
writeFileSync(join(outDir, 'game-config.csv'), `${[['Key', 'Value'], ...config.map((r) => [r.Key, r.Value])]
  .map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`);
if (local) {
  writeFileSync(join(root, 'game-config.json'), JSON.stringify({
    total: 1, offset: 0, limit: 1, data: config, ':type': 'sheet',
  }, null, 2));
}

// bulk metadata: experiment variant pages must never be indexed
const bulkMetadata = [['URL', 'robots'], ['/experiments/**', 'noindex,nofollow']];
writeFileSync(join(outDir, 'metadata.csv'), `${bulkMetadata.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`);

if (errors.length) {
  errors.forEach((e) => console.error(`✖ ${e}`));
  process.exit(1);
}
console.log(`✔ sheets built in ${outDir}${local ? ' (local JSON copies written)' : ''}`);

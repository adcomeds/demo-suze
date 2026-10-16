import { getLocaleRoot } from './scripts.js';

const sheetCache = {};

/**
 * Returns the site root of the current page: "/content/<site>" on the author /
 * Universal Editor, "" on the delivery tiers.
 * @returns {string} the site root path
 */
export function getSiteRoot() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  // the local dev server mounts imported content at /content without a site segment
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) return '';
  return segments[0] === 'content' && segments[1] ? `/content/${segments[1]}` : '';
}

/**
 * Fetches a key/value spreadsheet and returns it as a plain object.
 * Supports single sheets ({ data }) and the default sheet of a multi-sheet ({ default: { data } }).
 * Column names are matched case-insensitively ("Key"/"key", "Text"/"Value").
 * @param {string} path the sheet path without extension, e.g. "/masters/en/placeholders"
 * @returns {Promise<Object<string, string>>} keys mapped to values, {} if the sheet is missing
 */
export function fetchSheet(path) {
  if (!sheetCache[path]) {
    sheetCache[path] = fetch(`${path}.json`)
      .then((resp) => (resp.ok ? resp.json() : {}))
      .then((json) => {
        const rows = json.data || json.default?.data || [];
        return rows.reduce((acc, row) => {
          const cells = Object.fromEntries(
            Object.entries(row).map(([col, value]) => [col.toLowerCase(), value]),
          );
          const key = (cells.key || '').trim();
          if (key) acc[key] = cells.text ?? cells.value ?? '';
          return acc;
        }, {});
      })
      .catch(() => ({}));
  }
  return sheetCache[path];
}

/**
 * Loads a per-locale placeholders sheet and returns a translate function.
 * Missing keys return the key itself, so untranslated strings are visible during QA
 * instead of falling back to copy hardcoded in JavaScript.
 * @param {string} [sheet] the sheet name in the locale root
 * @returns {Promise<function(string, Object=): string>} t(key, vars) replacing {var} tokens
 */
export async function fetchPlaceholders(sheet = 'placeholders') {
  const strings = await fetchSheet(`${getLocaleRoot()}/${sheet}`);
  return (key, vars = {}) => (strings[key] ?? key)
    .replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

/**
 * Reads a value from the site-level game configuration sheet (/game-config).
 * @param {string} key the config key, e.g. "game-api-base"
 * @returns {Promise<string>} the trimmed value, "" if not set
 */
export async function getGameConfig(key) {
  const config = await fetchSheet(`${getSiteRoot()}/game-config`);
  return (config[key] || '').trim();
}

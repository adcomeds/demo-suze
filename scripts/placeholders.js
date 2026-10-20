import { getLocalePrefix } from './scripts.js';

/*
 * In the Universal Editor the page runs on the AEM author host, where sheets are not served at
 * their delivery path. Read them through the same AEM delivery servlet Edge Delivery uses
 * (see fstab.yaml); it works with the author's login and returns the sheet JSON format.
 */
const AUTHOR_DELIVERY_PREFIX = '/bin/franklin.delivery/adcomeds/demo-suze/main';

const sheetCache = {};

function isAuthorHost() {
  const { hostname } = window.location;
  return hostname.startsWith('author-') && hostname.endsWith('.adobeaemcloud.com');
}

/**
 * @param {string} deliveryPath delivery path without extension, e.g. "/fr/fr/placeholders"
 * @returns {string} the URL to fetch the sheet JSON from on the current host
 */
function sheetUrl(deliveryPath) {
  return `${isAuthorHost() ? AUTHOR_DELIVERY_PREFIX : ''}${deliveryPath}.json`;
}

/**
 * Fetches a key/value spreadsheet and returns it as a plain object.
 * Supports single sheets ({ data }) and the default sheet of a multi-sheet ({ default: { data } }).
 * Column names are matched case-insensitively ("Key"/"key", "Text"/"Value").
 * @param {string} path the sheet's delivery path without extension, e.g. "/masters/en/placeholders"
 * @returns {Promise<Object<string, string>>} keys mapped to values, {} if the sheet is missing
 */
export function fetchSheet(path) {
  if (!sheetCache[path]) {
    sheetCache[path] = fetch(sheetUrl(path))
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
  const strings = await fetchSheet(`${getLocalePrefix()}/${sheet}`);
  return (key, vars = {}) => (strings[key] ?? key)
    .replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

/**
 * Reads a value from the site-level game configuration sheet (/game-config).
 * @param {string} key the config key, e.g. "game-api-base"
 * @returns {Promise<string>} the trimmed value, "" if not set
 */
export async function getGameConfig(key) {
  const config = await fetchSheet('/game-config');
  return (config[key] || '').trim();
}

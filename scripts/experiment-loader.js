/**
 * Checks if experimentation is enabled.
 * @returns {boolean} True if experimentation is enabled, false otherwise.
 */
const isExperimentationEnabled = () => document.head.querySelector('[name^="experiment"],[name^="campaign-"],[name^="audience-"],[property^="campaign:"],[property^="audience:"]')
  || [...document.querySelectorAll('.section-metadata div')].some((d) => d.textContent.match(/Experiment|Campaign|Audience/i));

/*
 * Universal Editor (AEM author host) support. On the delivery tiers nothing below applies.
 *
 * - Authors must edit the page they opened. A variant swap replaces <main> with fetched HTML
 *   that has no editing instrumentation (the content tree empties), so a control page is pinned
 *   to its control unless a variant is chosen explicitly (?experiment=<id>/<variant>).
 * - Variant URLs are authored as delivery paths (/experiments/<locale>/...), which don't exist
 *   on author; they are prefixed with the site root (/content/<site>). The UE experimentation
 *   panel reads them from window.hlx and adds .html itself.
 * - Variant pages (/content/<site>/experiments/<locale...>/<page>/<experiment>/<variant>) carry
 *   no experiment metadata, so the panel kept showing the control as current. On author they
 *   borrow the control page's experiment metadata and report themselves as the served variant.
 */
const isAuthorHost = () => {
  const { hostname } = window.location;
  return hostname.startsWith('author-') && hostname.endsWith('.adobeaemcloud.com');
};

const withoutHtml = (path) => path.replace(/\.html$/, '');

/* /content/<site> on author, or null */
function getAuthorSiteRoot() {
  const [, root, site] = window.location.pathname.split('/');
  return root === 'content' && site ? `/content/${site}` : null;
}

/* author path of a variant URL authored as a delivery path or full URL */
function toAuthorPath(value, siteRoot) {
  const { pathname } = new URL(value, window.location.origin);
  return withoutHtml(pathname.startsWith('/content/') ? pathname : `${siteRoot}${pathname}`);
}

/**
 * On a variant page under /experiments/, copies the control page's experiment metadata into this
 * page so the plugin (and the UE panel) know which experiment and variant this is.
 * @returns {Promise<{controlPath: string}|null>} the control page path, or null
 */
async function adoptControlExperiment(siteRoot) {
  const rest = withoutHtml(window.location.pathname).slice(siteRoot.length).split('/').filter(Boolean);
  // experiments / <locale (2)> / <page...> / <experiment> / <variant>
  if (rest[0] !== 'experiments' || rest.length < 6) return null;
  const controlPath = `${siteRoot}/${rest.slice(1, -2).join('/')}`;
  try {
    const resp = await fetch(`${controlPath}.html`, { credentials: 'same-origin' });
    if (!resp.ok) return null;
    const dom = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const metas = [...dom.head.querySelectorAll('meta[name^="experiment"]')];
    if (!metas.length) return null;
    metas.forEach((meta) => {
      document.head.querySelector(`meta[name="${meta.name}"]`)?.remove();
      const copy = document.createElement('meta');
      copy.name = meta.name;
      copy.content = meta.content;
      document.head.append(copy);
    });
    return { controlPath };
  } catch {
    return null;
  }
}

function setOverride(param, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  window.history.replaceState(window.history.state, '', url);
}

/**
 * Prepares the page for the plugin on the author host.
 * @returns {Promise<Object|null>} info used to fix up the reported config after the plugin ran
 */
async function prepareAuthorExperiment(config) {
  const siteRoot = getAuthorSiteRoot();
  if (!isAuthorHost() || !siteRoot) return null;
  const variantPage = await adoptControlExperiment(siteRoot);

  const experimentId = document.head.querySelector('meta[name="experiment"]')?.content?.trim();
  const variantsMeta = document.head.querySelector('meta[name="experiment-variants"]');
  if (!experimentId || !variantsMeta) return null;
  const variantPaths = variantsMeta.content.split(',').map((v) => v.trim()).filter(Boolean)
    .map((v) => toAuthorPath(v, siteRoot));

  const param = config.experimentsQueryParameter || 'experiment';
  const explicit = new URLSearchParams(window.location.search).has(param);
  const currentPath = withoutHtml(window.location.pathname);

  if (variantPage) {
    // the plugin compares variant URLs with location.pathname: use the exact current path for
    // this variant so it reports it as served without fetching or swapping any content
    const index = variantPaths.indexOf(currentPath);
    if (index < 0) return null;
    variantsMeta.content = variantPaths
      .map((path) => (path === currentPath ? window.location.pathname : path)).join(', ');
    if (!explicit) setOverride(param, `${experimentId}/challenger-${index + 1}`);
    return { controlPath: variantPage.controlPath, variantPaths };
  }

  variantsMeta.content = variantPaths.join(', ');
  if (!explicit) setOverride(param, `${experimentId}/control`);
  return { controlPath: currentPath, variantPaths };
}

/* after the plugin ran: report clean author paths (without .html) to the UE panel */
function fixReportedConfig(info) {
  const page = window.hlx?.experiments?.find((e) => e.type === 'page');
  const variants = page?.config?.variants;
  if (!variants) return;
  variants.control.pages = [info.controlPath];
  info.variantPaths.forEach((path, i) => {
    if (variants[`challenger-${i + 1}`]) variants[`challenger-${i + 1}`].pages = [path];
  });
  if (page.servedExperience) page.servedExperience = withoutHtml(page.servedExperience);
}

/**
 * Loads the experimentation module (eager).
 * @param {Document} document The document object.
 * @param {Object} config The experimentation configuration.
 * @returns {Promise<void>} A promise that resolves when the experimentation module is loaded.
 */
export async function runExperimentation(document, config) {
  const authorInfo = await prepareAuthorExperiment(config);

  if (!isExperimentationEnabled()) {
    window.addEventListener('message', async (event) => {
      if (event.data?.type === 'hlx:experimentation-get-config') {
        event.source.postMessage({
          type: 'hlx:experimentation-config',
          config: { experiments: [], audiences: [], campaigns: [] },
          source: 'no-experiments',
        }, '*');
      }
    });
    return null;
  }

  try {
    const { loadEager } = await import(
      // eslint-disable-next-line import/no-relative-packages
      '../plugins/experimentation/src/index.js'
    );
    const result = await loadEager(document, config);
    if (authorInfo) fixReportedConfig(authorInfo);
    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load experimentation module (eager):', error);
    return null;
  }
}

/**
 * Loads the experimentation simulation UI (lazy).
 * The simulation panel is an authoring aid, so this is a no-op in production —
 * the coarse check below avoids even fetching the plugin there, and the plugin
 * re-checks authoritatively before showing anything.
 * @param {Document} document The document object.
 * @param {Object} config The experimentation configuration.
 * @returns {Promise<void>} A promise that resolves when the simulation UI is loaded.
 */
export async function runExperimentationLazy(document, config) {
  const { host, hostname, origin } = window.location;
  const isPreview = hostname === 'localhost'
    || hostname.endsWith('.page')
    || (typeof config.isProd === 'function' && !config.isProd())
    || (config.prodHost && ![host, hostname, origin].includes(config.prodHost));
  if (!isPreview) {
    return null;
  }

  try {
    const { loadLazy } = await import(
      // eslint-disable-next-line import/no-relative-packages
      '../plugins/experimentation/src/index.js'
    );
    return loadLazy(document, config);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load experimentation module (lazy):', error);
    return null;
  }
}

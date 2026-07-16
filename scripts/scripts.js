import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * Returns the locale root of the current page in a path-based multi-locale setup,
 * where nav/footer fragments live at `<localeRoot>/nav` and `<localeRoot>/footer`.
 * The locale is the first two path segments (e.g. "/masters/en"). On the author /
 * Universal Editor the page is served under a `/content/<site>/` prefix
 * (e.g. "/content/suze/masters/en/index.html"); that prefix is preserved so the
 * fragments resolve in the editor too.
 * @returns {string} the locale root path, or "" if the page is not under a locale
 */
export function getLocaleRoot() {
  const segments = window.location.pathname.replace(/\.html$/, '').split('/').filter(Boolean);
  const prefix = segments[0] === 'content' ? segments.slice(0, 2) : [];
  const locale = segments.slice(prefix.length, prefix.length + 2);
  if (locale.length < 2) return '';
  return `/${[...prefix, ...locale].join('/')}`;
}

/**
 * Returns the delivery-path locale prefix (e.g. "/us/en"), stripped of any
 * `/content/<site>` Universal Editor prefix. Unlike `getLocaleRoot()`, this is
 * meant for matching against delivery paths coming from a query index (whose
 * `path` values never carry the UE prefix), not for resolving fragment URLs.
 * @returns {string} the locale prefix path, or "" if the page is not under a locale
 */
export function getLocalePrefix() {
  const segments = window.location.pathname.replace(/\.html$/, '').split('/').filter(Boolean);
  const offset = segments[0] === 'content' ? 2 : 0;
  const locale = segments.slice(offset, offset + 2);
  if (locale.length < 2) return '';
  return `/${locale.join('/')}`;
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * AEM DAM assets selected via the asset selector are delivered as absolute links
 * to the delivery host (e.g. https://delivery-*.adobeaemcloud.com/adobe/assets/
 * urn:aaid:aem:.../as/name.avif) instead of as <picture> elements. Convert those
 * autolinked image URLs into <picture><img> so blocks (which look for a
 * <picture>) can render them. Instrumentation is moved so Universal Editor keeps
 * working.
 * @param {Element} main The container element
 */
export function decorateExternalImages(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    let url;
    try {
      url = new URL(a.href);
    } catch {
      return;
    }
    const isAemAsset = url.hostname.endsWith('.adobeaemcloud.com')
      && url.pathname.includes('/adobe/assets/');
    const isImage = /\.(avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
    // only convert autolinked URLs (link text === href), not intentional links
    const isAutolink = a.textContent.trim() === href.trim();
    if (!isAemAsset || !isImage || !isAutolink) return;

    const img = document.createElement('img');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('src', a.href);
    img.setAttribute('alt', a.getAttribute('title') || '');
    const picture = document.createElement('picture');
    picture.append(img);
    moveInstrumentation(a, img);
    a.replaceWith(picture);
  });
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
export function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateExternalImages(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

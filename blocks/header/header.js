import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { getLocaleRoot } from '../../scripts/scripts.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

// hardcoded language options per country (first locale path segment)
const LANGUAGE_OPTIONS = {
  masters: [['en', 'English'], ['fr', 'Français']],
  fr: [['fr', 'Français'], ['en', 'English']],
  us: [['en', 'English'], ['es', 'Español']],
};

/**
 * Replaces the authored nav "tools" cell (the "EN" label) with a hardcoded
 * language dropdown. Available languages depend on the country — the first
 * locale path segment — so /fr offers French + English and /us offers English +
 * Spanish. Selecting a language swaps the language segment of the current path.
 * Works both on the delivery tier (/fr/fr/…) and in Universal Editor, where the
 * page is served under a /content/<site>/ prefix.
 * @param {Element} nav the decorated <nav> element
 */
function decorateLanguageSelector(nav) {
  const navTools = nav.querySelector('.nav-tools');
  if (!navTools) return;

  const segments = window.location.pathname.replace(/\.html$/, '').split('/').filter(Boolean);
  const offset = segments[0] === 'content' ? 2 : 0;
  const country = segments[offset];
  const lang = segments[offset + 1];
  const options = LANGUAGE_OPTIONS[country];
  if (!options || !lang) {
    navTools.textContent = '';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-language';

  const current = options.find(([code]) => code === lang);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-language-toggle';
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = current ? current[1] : lang.toUpperCase();

  const list = document.createElement('ul');
  list.className = 'nav-language-list';
  const suffix = window.location.pathname.endsWith('.html') ? '.html' : '';
  // at the locale root (homepage) link to the folder URL with a trailing slash
  const isLocaleRoot = segments.length <= offset + 2;
  options.forEach(([code, label]) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    const parts = [...segments];
    parts[offset + 1] = code;
    a.href = `/${parts.join('/')}${suffix || (isLocaleRoot ? '/' : '')}`;
    a.textContent = label;
    if (code === lang) a.setAttribute('aria-current', 'true');
    li.append(a);
    list.append(li);
  });

  wrapper.append(toggle, list);

  const close = () => {
    wrapper.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = wrapper.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) close();
  });

  navTools.textContent = '';
  navTools.append(wrapper);
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * Adds a single black "pill" highlight to the desktop nav that slides to the
 * hovered/focused item (turning its text white) and rests on the active page
 * otherwise. On the index page (no active item) it stays hidden until hovered.
 * @param {Element} navSections The .nav-sections element
 */
function decorateNavHighlight(navSections) {
  const navList = navSections.querySelector('.default-content-wrapper > ul');
  if (!navList) return;

  const highlight = document.createElement('span');
  highlight.className = 'nav-highlight';
  highlight.setAttribute('aria-hidden', 'true');
  navList.prepend(highlight);

  const items = [...navList.children].filter((el) => el.tagName === 'LI');
  const activeItem = () => items.find((li) => li.querySelector('a[aria-current="page"]'));

  const moveTo = (li, animate = true) => {
    if (!li || !isDesktop.matches) {
      navList.classList.remove('nav-highlight-visible');
      items.forEach((el) => el.classList.remove('nav-lit'));
      return;
    }
    if (!animate) highlight.style.transition = 'none';
    const ulRect = navList.getBoundingClientRect();
    const liRect = li.getBoundingClientRect();
    highlight.style.left = `${liRect.left - ulRect.left}px`;
    highlight.style.top = `${liRect.top - ulRect.top}px`;
    highlight.style.width = `${liRect.width}px`;
    highlight.style.height = `${liRect.height}px`;
    navList.classList.add('nav-highlight-visible');
    items.forEach((el) => el.classList.toggle('nav-lit', el === li));
    if (!animate) requestAnimationFrame(() => { highlight.style.transition = ''; });
  };

  const reset = () => moveTo(activeItem());

  items.forEach((li) => {
    li.addEventListener('mouseenter', () => moveTo(li));
    li.addEventListener('focusin', () => moveTo(li));
  });
  navList.addEventListener('mouseleave', reset);

  // reposition (no animation) on the current item — used for layout changes
  const reposition = () => {
    const lit = items.find((el) => el.classList.contains('nav-lit')) || activeItem();
    moveTo(lit, false);
  };

  // The nav bar lays out asynchronously (fonts, fixed positioning), so measure
  // once it is stable and again whenever its size changes.
  const observer = new ResizeObserver(reposition);
  observer.observe(navList);
  isDesktop.addEventListener('change', reposition);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment (locale-relative unless an explicit nav path is set)
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : `${getLocaleRoot()}/nav`;
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });

    // mark the link matching the current page as active (segmented-pill highlight)
    const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    navSections.querySelectorAll(':scope a[href]').forEach((link) => {
      const linkPath = new URL(link.href, window.location).pathname.replace(/\.html$/, '').replace(/\/$/, '');
      if (linkPath && currentPath.endsWith(linkPath)) {
        link.setAttribute('aria-current', 'page');
      }
    });

    decorateNavHighlight(navSections);
  }

  decorateLanguageSelector(nav);

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}

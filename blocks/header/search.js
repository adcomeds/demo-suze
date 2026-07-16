import { getLocalePrefix } from '../../scripts/scripts.js';

const DEBOUNCE_MS = 200;

/**
 * Fetches and caches /query-index-recipes.json. Fetched once, lazily, on the
 * first user interaction with the search control.
 * @returns {Promise<Array>} the recipe records, or [] on any failure
 */
let recipesPromise;
function loadRecipes() {
  if (!recipesPromise) {
    recipesPromise = fetch('/query-index-recipes.json')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => json.data || [])
      .catch(() => []);
  }
  return recipesPromise;
}

/**
 * Builds one result row. All dynamic values are set via textContent/src/href,
 * never innerHTML, since index content is untrusted from the client's view.
 * @param {Object} recipe a single query-index-recipes.json record
 * @param {number} index position in the current result set (for the id)
 * @returns {Element} an <li role="option"> element
 */
function renderResult(recipe, index) {
  const li = document.createElement('li');
  li.id = `nav-search-result-${index}`;
  li.setAttribute('role', 'option');

  const a = document.createElement('a');
  a.href = recipe.path;

  const title = document.createElement('span');
  title.className = 'nav-search-result-title';
  title.textContent = recipe.title || recipe.path;
  a.append(title);

  if (recipe.description) {
    const description = document.createElement('span');
    description.className = 'nav-search-result-description';
    description.textContent = recipe.description;
    a.append(description);
  }

  li.append(a);
  return li;
}

/**
 * Decorates a search toggle + expanding input + live results flyout into
 * navSections, scoped to recipe pages under the current locale only.
 * Fails silently (hides the control) on any error so a broken/undeployed
 * index can never break the rest of header decoration.
 * @param {Element} navSections the .nav-sections element
 */
export default function decorateSearch(navSections) {
  try {
    const localePrefix = getLocalePrefix();
    if (!navSections || !localePrefix) return;

    const wrapper = document.createElement('li');
    wrapper.className = 'nav-search';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-search-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'nav-search-input');
    toggle.setAttribute('aria-label', 'Search recipes');
    const icon = document.createElement('span');
    icon.className = 'nav-search-icon';
    icon.setAttribute('aria-hidden', 'true');
    toggle.append(icon);

    const field = document.createElement('div');
    field.className = 'nav-search-field';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'nav-search-input';
    input.className = 'nav-search-input';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'nav-search-results');
    input.setAttribute('autocomplete', 'off');
    input.placeholder = 'Search recipes…';

    const results = document.createElement('ul');
    results.className = 'nav-search-results';
    results.id = 'nav-search-results';
    results.setAttribute('role', 'listbox');
    results.hidden = true;

    const status = document.createElement('p');
    status.className = 'nav-search-status';
    status.setAttribute('aria-live', 'polite');

    field.append(input, results, status);
    wrapper.append(toggle, field);
    const navList = navSections.querySelector('.default-content-wrapper > ul');
    (navList || navSections).append(wrapper);

    let activeIndex = -1;
    let debounceTimer;
    let latestRecipes = [];

    const setActive = (index) => {
      const items = [...results.children];
      items.forEach((li) => li.classList.remove('nav-search-result-active'));
      activeIndex = index;
      const active = items[activeIndex];
      if (active) {
        active.classList.add('nav-search-result-active');
        input.setAttribute('aria-activedescendant', active.id);
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    };

    const render = (query) => {
      results.textContent = '';
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');

      const trimmed = query.trim();
      if (!trimmed) {
        results.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        status.textContent = '';
        return;
      }

      const needle = trimmed.toLocaleLowerCase();
      const matches = latestRecipes.filter((recipe) => {
        const title = (recipe.title || '').toLocaleLowerCase();
        const description = (recipe.description || '').toLocaleLowerCase();
        return title.includes(needle) || description.includes(needle);
      });

      if (matches.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'nav-search-empty';
        empty.setAttribute('aria-disabled', 'true');
        empty.textContent = 'No recipes found';
        results.append(empty);
        status.textContent = 'No recipes found';
      } else {
        matches.forEach((recipe, index) => results.append(renderResult(recipe, index)));
        status.textContent = `${matches.length} recipe${matches.length === 1 ? '' : 's'} found`;
      }

      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };

    const closeSearch = () => {
      wrapper.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-expanded', 'false');
      input.value = '';
      results.textContent = '';
      results.hidden = true;
      status.textContent = '';
      activeIndex = -1;
    };

    const openSearch = () => {
      wrapper.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      input.focus();
      loadRecipes().then((recipes) => {
        latestRecipes = recipes.filter((recipe) => recipe.path
          && recipe.path.startsWith(`${localePrefix}/`));
        render(input.value);
      });
    };

    toggle.addEventListener('click', () => {
      if (wrapper.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
    });

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const { value } = input;
      debounceTimer = setTimeout(() => render(value), DEBOUNCE_MS);
    });

    input.addEventListener('keydown', (e) => {
      const items = [...results.children].filter((li) => li.getAttribute('role') === 'option');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length) setActive((activeIndex + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length) setActive((activeIndex - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        const active = items[activeIndex];
        if (active) {
          e.preventDefault();
          active.querySelector('a').click();
        }
      } else if (e.key === 'Escape') {
        closeSearch();
        toggle.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) closeSearch();
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Search unavailable', e);
  }
}

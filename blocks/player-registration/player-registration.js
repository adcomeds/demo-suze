import { fetchPlaceholders } from '../../scripts/placeholders.js';
import {
  EVENTS, getLocale, getPlayer, isAgePassed, on, setPlayer,
} from '../../scripts/game-session.js';
import { errorKey, registerPlayer } from '../../scripts/game-api.js';
import {
  createField, createStatus, loadFormStyles, setStatus, validateForm, wireValidation,
} from '../../scripts/game-form.js';

/**
 * Splits the authored rows into the terms link (a row holding only a link)
 * and intro content (everything else).
 */
function readConfig(block) {
  let termsLink = null;
  const intro = document.createElement('div');
  intro.className = 'player-registration-intro';
  [...block.children].forEach((row) => {
    const links = row.querySelectorAll('a[href]');
    const onlyLink = links.length === 1 && row.textContent.trim() === links[0].textContent.trim();
    if (!termsLink && onlyLink) {
      [termsLink] = links;
    } else if (row.textContent.trim()) {
      intro.append(...row.firstElementChild.childNodes);
    }
  });
  return { termsLink, intro };
}

/* builds "I accept the {termsLink}" with the authored terms page as the link */
function termsLabel(t, termsHref) {
  const label = document.createDocumentFragment();
  const [before, after = ''] = t('registration-terms').split('{termsLink}');
  label.append(before);
  const link = document.createElement('a');
  link.href = termsHref || '#';
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = t('registration-terms-link');
  label.append(link, after);
  return label;
}

function buildForm(t, termsLink) {
  const form = document.createElement('form');
  form.className = 'game-form player-registration-form';
  form.id = 'player-registration-form';
  form.setAttribute('aria-label', t('registration-heading'));

  const firstName = createField({
    name: 'firstName',
    label: t('registration-first-name'),
    error: t('registration-first-name-error'),
    attrs: {
      required: true, autocomplete: 'given-name', maxlength: 50, enterkeyhint: 'next',
    },
  });
  const email = createField({
    name: 'email',
    type: 'email',
    label: t('registration-email'),
    error: t('registration-email-error'),
    attrs: {
      required: true, autocomplete: 'email', maxlength: 254, enterkeyhint: 'next',
    },
  });
  const terms = createField({
    name: 'terms',
    type: 'checkbox',
    label: termsLabel(t, termsLink?.href),
    error: t('registration-terms-error'),
    attrs: { required: true, value: 'yes' },
  });
  const marketing = createField({
    name: 'marketing',
    type: 'checkbox',
    label: t('registration-marketing'),
    attrs: { value: 'yes' },
  });

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button primary';
  submit.textContent = t('registration-submit');
  const actions = document.createElement('div');
  actions.className = 'game-form-actions';
  actions.append(submit);

  const status = createStatus();
  form.append(firstName.field, email.field, terms.field, marketing.field, actions, status);
  wireValidation(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(form) || submit.disabled) return;
    submit.disabled = true;
    setStatus(status, '');
    try {
      const player = await registerPlayer({
        firstName: firstName.input.value.trim(),
        email: email.input.value.trim(),
        locale: getLocale(),
        consents: { terms: terms.input.checked, marketing: marketing.input.checked },
        termsVersion: t('terms-version'),
      });
      form.reset();
      setPlayer(player);
    } catch (error) {
      setStatus(status, t(errorKey(error)), true);
      submit.disabled = false;
    }
  });
  return form;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const [t] = await Promise.all([fetchPlaceholders(), loadFormStyles()]);
  const { termsLink, intro } = readConfig(block);

  const heading = document.createElement('h2');
  heading.textContent = t('registration-heading');
  const form = buildForm(t, termsLink);
  block.replaceChildren(heading, ...(intro.childNodes.length ? [intro] : []), form);

  const update = () => {
    block.hidden = !isAgePassed() || !!getPlayer();
  };
  update();
  on(EVENTS.AGE_PASSED, () => {
    update();
    if (!block.hidden) heading.scrollIntoView({ block: 'start' });
    form.querySelector('input')?.focus({ preventScroll: true });
  });
  on(EVENTS.REGISTERED, update);
}

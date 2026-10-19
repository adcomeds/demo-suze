import { fetchPlaceholders } from '../../scripts/placeholders.js';
import { getAgeGateResult, setAgeGateResult } from '../../scripts/game-session.js';
import {
  createField, loadFormStyles, validateForm, wireValidation,
} from '../../scripts/game-form.js';

const DEFAULT_MINIMUM_AGE = 18;

/**
 * Reads the authored config: an optional minimum age row (a number) and any other rows
 * as intro content. The mode comes from the block option: "dob" or "yes-no" (default).
 */
function readConfig(block) {
  let minimumAge = DEFAULT_MINIMUM_AGE;
  const intro = document.createElement('div');
  intro.className = 'age-gate-intro';
  [...block.children].forEach((row) => {
    const text = row.textContent.trim();
    if (/^\d{1,2}$/.test(text)) minimumAge = Number(text);
    else if (text) intro.append(...row.firstElementChild.childNodes);
  });
  return { minimumAge, intro, mode: block.classList.contains('dob') ? 'dob' : 'yes-no' };
}

function ageOn(dob, today) {
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday = today.getMonth() < dob.getMonth()
    || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function showRefusal(block, t) {
  const message = document.createElement('p');
  message.className = 'age-gate-refused';
  message.tabIndex = -1;
  message.textContent = t('age-gate-refused');
  block.replaceChildren(message);
  block.classList.add('is-refused');
  return message;
}

function buildYesNo(form, t, minimumAge, done) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = t('age-gate-question', { age: minimumAge });
  const actions = document.createElement('div');
  actions.className = 'game-form-actions';
  [['yes', 'primary'], ['no', 'secondary']].forEach(([answer, style]) => {
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = `button ${style}`;
    button.value = answer;
    button.textContent = t(`age-gate-${answer}`);
    actions.append(button);
  });
  fieldset.append(legend, actions);
  form.append(fieldset);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    done(event.submitter?.value === 'yes');
  });
}

function buildDob(form, t, minimumAge, done) {
  const today = new Date();
  const max = today.toISOString().slice(0, 10);
  const { field, input } = createField({
    name: 'dob',
    type: 'date',
    label: t('age-gate-dob-label', { age: minimumAge }),
    hint: t('age-gate-dob-hint'),
    error: t('age-gate-dob-invalid'),
    attrs: {
      required: true, autocomplete: 'bday', min: '1900-01-01', max,
    },
  });
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button primary';
  submit.textContent = t('age-gate-submit');
  const actions = document.createElement('div');
  actions.className = 'game-form-actions';
  actions.append(submit);
  form.append(field, actions);
  wireValidation(form);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const dob = new Date(`${input.value}T00:00:00`);
    // only the outcome is kept; the date itself is discarded with the form
    done(ageOn(dob, today) >= minimumAge);
  });
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const [t] = await Promise.all([fetchPlaceholders(), loadFormStyles()]);
  const { minimumAge, intro, mode } = readConfig(block);

  const result = getAgeGateResult();
  if (result === 'passed') {
    block.replaceChildren();
    block.hidden = true;
    return;
  }
  if (result === 'failed') {
    showRefusal(block, t);
    return;
  }

  const heading = document.createElement('h2');
  heading.textContent = t('age-gate-heading');
  const form = document.createElement('form');
  form.className = 'game-form age-gate-form';
  form.id = 'age-gate-form';
  form.setAttribute('aria-label', t('age-gate-heading'));

  const done = (passed) => {
    setAgeGateResult(passed);
    if (passed) {
      block.replaceChildren();
      block.hidden = true;
    } else {
      showRefusal(block, t).focus();
    }
  };

  if (mode === 'dob') buildDob(form, t, minimumAge, done);
  else buildYesNo(form, t, minimumAge, done);

  block.replaceChildren(heading, ...(intro.childNodes.length ? [intro] : []), form);
}

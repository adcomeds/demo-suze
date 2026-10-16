/*
 * Small helpers for the chess challenge forms (age gate, registration, invite).
 * Native controls and constraints; localized messages come from the caller.
 * Errors appear only after the visitor has left a field or tried to submit, and are
 * linked to the field with aria-describedby / aria-invalid while visible.
 */
import { loadCSS } from './aem.js';

let idCounter = 0;
const nextId = (name) => {
  idCounter += 1;
  return `game-${name}-${idCounter}`;
};

export function loadFormStyles() {
  return loadCSS(`${window.hlx.codeBasePath}/styles/game-form.css`);
}

function describe(control) {
  const ids = [control.dataset.hintId, !control.dataset.errorHidden && control.dataset.errorId];
  const value = ids.filter(Boolean).join(' ');
  if (value) control.setAttribute('aria-describedby', value);
  else control.removeAttribute('aria-describedby');
}

function setError(control, invalid) {
  const error = control.dataset.errorId && document.getElementById(control.dataset.errorId);
  if (invalid) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
  if (error) error.hidden = !invalid;
  if (invalid) delete control.dataset.errorHidden;
  else control.dataset.errorHidden = 'true';
  describe(control);
}

/**
 * Creates a labelled field.
 * @param {Object} opts
 * @param {string} opts.name control name
 * @param {string} opts.label visible label (text) or a Node for rich labels
 * @param {string} [opts.type] input type, "checkbox" renders the label after the box
 * @param {string} [opts.hint] help text shown under the label
 * @param {string} [opts.error] message shown when the value is invalid
 * @param {Object} [opts.attrs] extra attributes for the input (required, autocomplete, max...)
 * @returns {{field: HTMLElement, input: HTMLInputElement}}
 */
export function createField({
  name, label, type = 'text', hint, error, attrs = {},
}) {
  const id = nextId(name);
  const field = document.createElement('div');
  field.className = `game-field game-field-${type}`;

  const input = document.createElement('input');
  input.id = id;
  input.name = name;
  input.type = type;
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === true) input.setAttribute(key, '');
    else if (value !== false && value !== undefined) input.setAttribute(key, value);
  });

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.append(label);

  if (type === 'checkbox') field.append(input, labelEl);
  else field.append(labelEl);

  if (hint) {
    const hintEl = document.createElement('p');
    hintEl.className = 'game-field-hint';
    hintEl.id = `${id}-hint`;
    hintEl.textContent = hint;
    input.dataset.hintId = hintEl.id;
    field.append(hintEl);
  }
  if (type !== 'checkbox') field.append(input);
  if (error) {
    const errorEl = document.createElement('p');
    errorEl.className = 'game-field-error';
    errorEl.id = `${id}-error`;
    errorEl.textContent = error;
    errorEl.hidden = true;
    input.dataset.errorId = errorEl.id;
    input.dataset.errorHidden = 'true';
    field.append(errorEl);
  }
  describe(input);
  return { field, input };
}

/**
 * Wires validation timing on a form: check on blur (after the visitor typed or changed
 * something), clear on input as soon as the value becomes valid.
 * @param {HTMLFormElement} form
 */
export function wireValidation(form) {
  form.noValidate = true; // localized messages instead of browser bubbles
  form.addEventListener('focusout', (event) => {
    const control = event.target;
    if (!control.matches?.('input') || !control.dataset.touched) return;
    setError(control, !control.checkValidity());
  });
  form.addEventListener('input', (event) => {
    const control = event.target;
    if (!control.matches?.('input')) return;
    control.dataset.touched = 'true';
    if (control.getAttribute('aria-invalid') === 'true' && control.checkValidity()) setError(control, false);
  });
  form.addEventListener('change', (event) => {
    const control = event.target;
    if (control.matches?.('input[type="checkbox"]')) setError(control, !control.checkValidity());
  });
}

/**
 * Validates every control, shows all errors and focuses the first invalid control.
 * @param {HTMLFormElement} form
 * @returns {boolean} true when the form is valid
 */
export function validateForm(form) {
  const controls = [...form.querySelectorAll('input')];
  controls.forEach((control) => setError(control, !control.checkValidity()));
  const firstInvalid = controls.find((control) => !control.checkValidity());
  firstInvalid?.focus();
  return !firstInvalid;
}

/**
 * Creates a polite live region for form level messages (API errors, confirmations).
 * @returns {HTMLElement}
 */
export function createStatus() {
  const status = document.createElement('p');
  status.className = 'game-form-status';
  status.setAttribute('role', 'status');
  return status;
}

export function setStatus(status, message, isError = false) {
  status.textContent = message || '';
  status.classList.toggle('is-error', !!isError && !!message);
}

import { fetchPlaceholders } from '../../scripts/placeholders.js';
import {
  EVENTS, getInviteGameId, getLocale, getStoredGame, isMockForced, on,
} from '../../scripts/game-session.js';
import { errorKey, isMockMode, sendInvite } from '../../scripts/game-api.js';
import {
  createField, createStatus, loadFormStyles, setStatus, validateForm, wireValidation,
} from '../../scripts/game-form.js';

/* stable selector for the experiment conversion (submit of #chess-invite-form) */
const SEND_BUTTON_ID = 'chess-invite-send';

/**
 * Panel with the game link, shown after every successful invite so the host can also share
 * the link directly (the invite email may be slow, filtered or, in demos, not sent at all).
 * @param {function} t placeholders
 * @param {string} link absolute game link
 * @param {string} headingText "Demo mode: no email was sent" (mock) or "Invite sent..." (real API)
 */
function buildLinkPanel(t, link, headingText) {
  const panel = document.createElement('div');
  panel.className = 'invite-link-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'invite-link-heading');

  const heading = document.createElement('h3');
  heading.id = 'invite-link-heading';
  heading.textContent = headingText;
  heading.tabIndex = -1;
  const text = document.createElement('p');
  text.textContent = t('invite-mock-text');

  const output = document.createElement('input');
  output.type = 'text';
  output.readOnly = true;
  output.value = link;
  output.className = 'invite-link';
  output.setAttribute('aria-label', t('invite-mock-link-label'));
  output.addEventListener('focus', () => output.select());

  const actions = document.createElement('div');
  actions.className = 'game-form-actions';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'button primary';
  copy.textContent = t('invite-mock-copy');
  const copied = createStatus();
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      setStatus(copied, t('invite-mock-copied'));
    } catch {
      output.focus();
      setStatus(copied, t('invite-mock-copy-manual'));
    }
  });
  const open = document.createElement('a');
  open.className = 'button secondary';
  open.href = link;
  open.target = '_blank';
  // noopener: the new tab must not inherit this tab's session (it is the other player)
  open.rel = 'noopener noreferrer';
  open.textContent = t('invite-mock-open');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'button secondary';
  close.textContent = t('invite-mock-close');
  close.addEventListener('click', () => {
    panel.remove();
    document.getElementById(SEND_BUTTON_ID)?.focus();
  });
  actions.append(copy, open, close);
  panel.append(heading, text, output, actions, copied);
  return panel;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const [t] = await Promise.all([fetchPlaceholders(), loadFormStyles()]);

  const intro = document.createElement('div');
  intro.className = 'invite-intro';
  [...block.children].forEach((row) => {
    if (row.textContent.trim()) intro.append(...row.firstElementChild.childNodes);
  });

  const heading = document.createElement('h2');
  heading.textContent = t('invite-heading');

  const form = document.createElement('form');
  form.className = 'game-form invite-form';
  form.id = 'chess-invite-form';
  form.setAttribute('aria-label', t('invite-heading'));
  const email = createField({
    name: 'friendEmail',
    type: 'email',
    label: t('invite-email-label'),
    hint: t('invite-email-hint'),
    error: t('invite-email-error'),
    attrs: {
      required: true, autocomplete: 'off', maxlength: 254, enterkeyhint: 'send',
    },
  });
  const send = document.createElement('button');
  send.type = 'submit';
  send.id = SEND_BUTTON_ID;
  send.className = 'button primary';
  send.dataset.conversion = 'chess-invite';
  send.textContent = t('invite-send');
  const actions = document.createElement('div');
  actions.className = 'game-form-actions';
  actions.append(send);
  const status = createStatus();
  form.append(email.field, actions, status);
  wireValidation(form);

  block.replaceChildren(heading, ...(intro.childNodes.length ? [intro] : []), form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(form) || send.disabled) return;
    const gameId = getInviteGameId();
    if (!gameId) return;
    send.disabled = true;
    setStatus(status, t('invite-sending'));
    block.querySelector('.invite-link-panel')?.remove();
    try {
      const { gameUrl } = await sendInvite(gameId, {
        email: email.input.value.trim(),
        locale: getLocale(),
      });
      form.reset();
      const url = new URL(gameUrl, window.location.origin);
      const mock = await isMockMode();
      if (mock && isMockForced()) url.searchParams.set('mock', '1');
      setStatus(status, '');
      const panel = buildLinkPanel(t, url.href, t(mock ? 'invite-mock-heading' : 'invite-sent'));
      form.after(panel);
      panel.querySelector('h3').focus();
    } catch (error) {
      setStatus(status, t(errorKey(error)), true);
    } finally {
      send.disabled = false;
    }
  });

  // visible only while the invite belongs to the current game and nobody has joined yet
  let lastGame = null;
  const update = () => {
    const inviteGameId = getInviteGameId();
    const currentId = lastGame?.gameId || getStoredGame()?.gameId;
    block.hidden = !inviteGameId || currentId !== inviteGameId
      || (lastGame && (lastGame.status !== 'waiting' || !!lastGame.players.black));
  };
  block.hidden = true;
  update();
  on(EVENTS.INVITE_AVAILABLE, update);
  on(EVENTS.UPDATED, ({ game }) => {
    lastGame = game;
    update();
  });
  on(EVENTS.INVITE_REQUESTED, () => {
    update();
    if (block.hidden) return;
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    email.input.focus({ preventScroll: true });
  });
}

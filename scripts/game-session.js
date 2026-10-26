/*
 * Shared session state and events for the chess challenge blocks.
 * Blocks never import each other; they read state from here and react to events.
 * Only non-personal values are stored: the age gate outcome (never a date of birth),
 * playerId, token, the marketing opt-in flag, gameId and the player's colour. Everything
 * lives in sessionStorage, so each browser tab is its own player.
 */
import { getLocalePrefix } from './scripts.js';

const PREFIX = 'chess-challenge:';

export const EVENTS = {
  AGE_PASSED: 'game:age-passed',
  REGISTERED: 'game:registered',
  CREATED: 'game:created',
  UPDATED: 'game:updated',
  FIRST_MOVE: 'game:first-move',
  OVER: 'game:over',
  INVITE_AVAILABLE: 'game:invite-available',
  INVITE_SENT: 'game:invite-sent',
  OPPONENT_JOINED: 'game:opponent-joined',
  INVITE_REQUESTED: 'game:invite-requested',
};

function read(key) {
  try {
    return JSON.parse(sessionStorage.getItem(`${PREFIX}${key}`));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(`${PREFIX}${key}`);
    } else {
      sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    }
  } catch {
    // storage unavailable (private mode quota): state lives for this page view only
  }
}

/**
 * @returns {string} the current locale without slashes, e.g. "us/en"
 */
export function getLocale() {
  return getLocalePrefix().replace(/^\//, '') || 'us/en';
}

/* latest game and result of this page view, kept in memory only, for blocks that load late */
const latest = {};

export function emit(name, detail) {
  if (name === EVENTS.UPDATED) latest.game = detail.game;
  if (name === EVENTS.OVER) latest.over = detail;
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

export const getLatestGame = () => latest.game || null;
export const getLatestResult = () => latest.over || null;

export function on(name, handler) {
  const listener = (event) => handler(event.detail);
  document.addEventListener(name, listener);
  return () => document.removeEventListener(name, listener);
}

/* age gate: stored per locale, because the legal age and mode differ per market */
export function getAgeGateResult() {
  return read(`age:${getLocale()}`);
}

export function setAgeGateResult(passed) {
  write(`age:${getLocale()}`, passed ? 'passed' : 'failed');
  if (passed) emit(EVENTS.AGE_PASSED);
}

export const isAgePassed = () => getAgeGateResult() === 'passed';

/* player */
export function getPlayer() {
  return read('player');
}

/* marketing: the player's marketing opt-in (a boolean, used to target marketing messages) */
export function setPlayer({ playerId, token, marketing = false }) {
  write('player', { playerId, token, marketing: marketing === true });
  emit(EVENTS.REGISTERED, { playerId, marketing: marketing === true });
}

export const hasMarketingOptIn = () => getPlayer()?.marketing === true;

/* game */
export function getGameIdFromUrl() {
  const id = new URLSearchParams(window.location.search).get('game');
  return id && /^[\w-]{1,64}$/.test(id) ? id : null;
}

export function getStoredGame() {
  return read('game');
}

export function setStoredGame(game) {
  write('game', game);
}

/* forget the current game (and its invite) so the next visit starts a new one */
export function clearGame() {
  write('game', null);
  write('invite', null);
}

/* invite: opened by the chess block (right after the game is created, or after the
   opening move when the block's "nudge" option is on) */
export function getInviteGameId() {
  return read('invite');
}

export function setInviteAvailable(gameId) {
  write('invite', gameId);
  emit(EVENTS.INVITE_AVAILABLE, { gameId });
}

/* mock mode: ?mock=1 switches it on for this tab, ?mock=0 switches it off */
export function isMockForced() {
  const param = new URLSearchParams(window.location.search).get('mock');
  if (param === '1') write('mock', true);
  if (param === '0') write('mock', null);
  return read('mock') === true;
}

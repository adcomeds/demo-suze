/*
 * Site event layer for the chess challenge.
 *
 * Every game event is pushed to `window.adobeDataLayer`, a plain array any tag manager or
 * third-party script could read. No SDK is loaded. For registered players the event is also
 * sent to the game API (`POST /events`), whose connectors can forward it to a third party.
 *
 * Event data never contains personal data: no names, emails, tokens or player ids. It only
 * carries the gameId (random), the locale, the page and the experiment variant.
 */
import {
  EVENTS, getLocale, getPlayer, on,
} from './game-session.js';
import { recordEvent } from './game-api.js';

let started = false;

function context() {
  const { experiment, variant } = document.body.dataset;
  return {
    locale: getLocale(),
    page: window.location.pathname,
    ...(experiment ? { experiment, variant } : {}),
  };
}

/**
 * Records a chess challenge event.
 * @param {string} name event name without prefix, e.g. "game-finished"
 * @param {Object} [data] non-personal details
 */
export function track(name, data = {}) {
  const eventInfo = { ...data, ...context() };
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push({ event: `chess:${name}`, eventInfo });
  if (getPlayer()?.token) recordEvent(name, eventInfo).catch(() => {});
}

/** Maps the game's internal events to tracked events. Safe to call from every block. */
export function startGameEvents() {
  if (started) return;
  started = true;
  on(EVENTS.AGE_PASSED, () => track('age-gate-passed'));
  on(EVENTS.REGISTERED, ({ marketing }) => track('registered', { marketingOptIn: marketing }));
  on(EVENTS.CREATED, ({ game, origin, color }) => {
    if (origin === 'created') track('game-created', { gameId: game.gameId, color });
    if (origin === 'joined') track('game-joined', { gameId: game.gameId, color });
  });
  on(EVENTS.FIRST_MOVE, ({ gameId }) => track('first-move', { gameId }));
  on(EVENTS.INVITE_SENT, ({ gameId }) => track('invite-sent', { gameId }));
  on(EVENTS.OPPONENT_JOINED, ({ gameId }) => track('opponent-joined', { gameId }));
  on(EVENTS.OVER, ({ gameId, outcome, perspective }) => {
    track('game-finished', { gameId, outcome, result: perspective });
  });
}

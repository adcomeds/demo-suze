/*
 * Chess challenge API client. Blocks only ever call this module.
 * Contract: docs/game-api-contract.md
 *
 * The backend is chosen once per page view:
 * - the `game-api-base` key of the site /game-config sheet is empty, or the URL has ?mock=1
 *   (remembered for the tab): the in-browser mock in game-api-mock.js
 * - otherwise: HTTP calls to `game-api-base`
 * Pointing `game-api-base` at a real URL needs no code change.
 */
import { getGameConfig } from './placeholders.js';
import { getPlayer, isMockForced } from './game-session.js';

export class GameApiError extends Error {
  constructor(code, status = 0) {
    super(code);
    this.name = 'GameApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Maps an error to its localized placeholder key, e.g. ILLEGAL_MOVE -> "error-illegal-move".
 * @param {{code?: string}} error a GameApiError (or any object with a contract error code)
 * @returns {string} placeholder key
 */
export function errorKey(error) {
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN';
  return `error-${code.toLowerCase().replace(/_/g, '-')}`;
}

/* operation name -> [method, path] for the HTTP backend */
const ROUTES = {
  registerPlayer: () => ['POST', '/players'],
  createGame: () => ['POST', '/games'],
  getGame: ({ gameId }) => ['GET', `/games/${encodeURIComponent(gameId)}`],
  joinGame: ({ gameId }) => ['POST', `/games/${encodeURIComponent(gameId)}/join`],
  makeMove: ({ gameId }) => ['POST', `/games/${encodeURIComponent(gameId)}/moves`],
  resignGame: ({ gameId }) => ['POST', `/games/${encodeURIComponent(gameId)}/resign`],
  sendInvite: ({ gameId }) => ['POST', `/games/${encodeURIComponent(gameId)}/invites`],
};

function createHttpBackend(base) {
  const root = base.replace(/\/+$/, '');
  return {
    mock: false,
    async call(operation, { gameId, body } = {}, token = null) {
      const [method, path] = ROUTES[operation]({ gameId });
      const headers = { Accept: 'application/json' };
      if (body) headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = `Bearer ${token}`;
      let resp;
      try {
        resp = await fetch(`${root}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'omit',
          cache: 'no-store',
        });
      } catch {
        throw new GameApiError('NETWORK');
      }
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new GameApiError(json?.error?.code || 'UNKNOWN', resp.status);
      return json;
    },
    subscribe: () => () => {},
  };
}

let backendPromise;

function backend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      const base = await getGameConfig('game-api-base');
      if (!base || isMockForced()) {
        const { default: mock } = await import('./game-api-mock.js');
        return mock;
      }
      return createHttpBackend(base);
    })();
  }
  return backendPromise;
}

async function call(operation, params, { auth = true } = {}) {
  const token = auth ? getPlayer()?.token : null;
  if (auth && !token) throw new GameApiError('UNAUTHORIZED', 401);
  const api = await backend();
  try {
    return await api.call(operation, params, token);
  } catch (error) {
    if (error instanceof GameApiError) throw error;
    throw new GameApiError(error?.code || 'UNKNOWN', error?.status);
  }
}

/**
 * @returns {Promise<boolean>} true when the in-browser mock is serving the API
 */
export async function isMockMode() {
  return (await backend()).mock;
}

/**
 * Subscribes to out-of-band updates of a game (mock only: changes made in another tab).
 * The HTTP backend has no push channel, so callers keep polling getGame.
 * @returns {Promise<function>} unsubscribe
 */
export async function subscribeToGame(gameId, handler) {
  return (await backend()).subscribe(gameId, handler);
}

/**
 * @param {{firstName: string, email: string, locale: string,
 *   consents: {terms: boolean, marketing: boolean}, termsVersion: string}} player
 * @returns {Promise<{playerId: string, token: string}>}
 */
export function registerPlayer(player) {
  return call('registerPlayer', { body: player }, { auth: false });
}

/** @returns {Promise<Object>} Game, caller is white */
export function createGame({ locale }) {
  return call('createGame', { body: { locale } });
}

/** @returns {Promise<Object>} Game */
export function getGame(gameId) {
  return call('getGame', { gameId });
}

/** @returns {Promise<Object>} Game, caller is black */
export function joinGame(gameId) {
  return call('joinGame', { gameId });
}

/**
 * @param {string} gameId
 * @param {{from: string, to: string, promotion?: string, expectedVersion: number}} move
 * @returns {Promise<Object>} Game
 */
export function makeMove(gameId, move) {
  return call('makeMove', { gameId, body: move });
}

/** @returns {Promise<Object>} Game */
export function resignGame(gameId) {
  return call('resignGame', { gameId });
}

/**
 * @param {string} gameId
 * @param {{email: string, locale: string}} invite
 * @returns {Promise<{inviteId: string, gameUrl: string}>}
 */
export function sendInvite(gameId, invite) {
  return call('sendInvite', { gameId, body: invite });
}

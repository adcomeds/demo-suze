/*
 * In-browser implementation of the chess challenge API (docs/game-api-contract.md).
 * Loaded by game-api.js only when `game-api-base` is empty or the URL has ?mock=1.
 *
 * - State lives in localStorage, so two tabs of the same browser share games while
 *   sessionStorage keeps a separate player per tab.
 * - The `storage` event pushes changes made in one tab to the other immediately.
 * - Moves are validated with chess.js, exactly like the real backend.
 * - Every call waits about 300 ms to behave like a network round trip.
 * - The invitee email is validated but never stored, and no email is sent.
 */
import { Chess } from './vendor/chess.js';

const NS = 'chess-mock:';
const LATENCY_MS = 300;
const MAX_INVITES_PER_GAME = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sleep = () => new Promise((resolve) => {
  setTimeout(resolve, LATENCY_MS - 50 + Math.random() * 100);
});

const id = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(`${NS}${key}`));
  } catch {
    return null;
  }
}

function save(key, value) {
  localStorage.setItem(`${NS}${key}`, JSON.stringify(value));
}

/* game-api.js turns these into GameApiError instances */
function fail(code, status) {
  throw Object.assign(new Error(code), { code, status });
}

function chessFor(game) {
  const chess = new Chess();
  if (game.pgn) chess.loadPgn(game.pgn);
  return chess;
}

/* the Game object as defined by the contract (internal fields stripped) */
function toPublic(game) {
  const chess = chessFor(game);
  const history = chess.history({ verbose: true });
  const last = history[history.length - 1];
  return {
    gameId: game.gameId,
    status: game.status,
    fen: chess.fen(),
    pgn: chess.pgn(),
    turn: chess.turn(),
    version: game.version,
    moveCount: history.length,
    updatedAt: game.updatedAt,
    lastMove: last ? { from: last.from, to: last.to, san: last.san } : null,
    players: structuredClone(game.players),
    result: game.result ? { ...game.result } : null,
  };
}

function touch(game) {
  game.version += 1;
  game.updatedAt = new Date().toISOString();
  save(`game:${game.gameId}`, game);
  return toPublic(game);
}

function authenticate(token) {
  const playerId = token && load(`token:${token}`);
  const player = playerId && load(`player:${playerId}`);
  if (!player) fail('UNAUTHORIZED', 401);
  return player;
}

function findGame(gameId) {
  const game = load(`game:${gameId}`);
  if (!game) fail('NOT_FOUND', 404);
  return game;
}

function colorOf(game, playerId) {
  if (game.players.white?.playerId === playerId) return 'w';
  if (game.players.black?.playerId === playerId) return 'b';
  return null;
}

function resultAfterMove(chess) {
  if (chess.isCheckmate()) return { outcome: 'checkmate', winner: chess.turn() === 'w' ? 'b' : 'w' };
  if (chess.isStalemate()) return { outcome: 'stalemate', winner: null };
  if (chess.isDraw()) return { outcome: 'draw', winner: null };
  return null;
}

const MAX_EVENTS = 200;

const handlers = {
  registerPlayer({ body = {} }) {
    const firstName = String(body.firstName || '').trim();
    const email = String(body.email || '').trim();
    if (!firstName || firstName.length > 50 || !EMAIL_PATTERN.test(email)
      || body.consents?.terms !== true) {
      fail('VALIDATION', 400);
    }
    const player = {
      playerId: id('p'),
      token: id('t'),
      firstName,
      locale: body.locale,
      consents: { terms: true, marketing: body.consents?.marketing === true },
      termsVersion: body.termsVersion || '',
    };
    save(`player:${player.playerId}`, player);
    save(`token:${player.token}`, player.playerId);
    return { playerId: player.playerId, token: player.token };
  },

  createGame({ body = {} }, player) {
    const game = {
      gameId: id('g'),
      locale: body.locale,
      status: 'waiting',
      pgn: '',
      version: -1,
      players: { white: { playerId: player.playerId, firstName: player.firstName }, black: null },
      result: null,
      invites: 0,
    };
    return touch(game);
  },

  getGame({ gameId }) {
    return toPublic(findGame(gameId));
  },

  joinGame({ gameId }, player) {
    const game = findGame(gameId);
    if (colorOf(game, player.playerId)) return toPublic(game);
    if (game.players.black || game.status !== 'waiting') fail('GAME_FULL', 409);
    game.players.black = { playerId: player.playerId, firstName: player.firstName };
    game.status = 'active';
    return touch(game);
  },

  makeMove({ gameId, body = {} }, player) {
    const game = findGame(gameId);
    const chess = chessFor(game);
    // while waiting for an opponent, white may play the opening move only
    if (game.status === 'finished') fail('ILLEGAL_MOVE', 422);
    if (game.status === 'waiting' && chess.history().length > 0) fail('NOT_YOUR_TURN', 409);
    const color = colorOf(game, player.playerId);
    if (!color || color !== chess.turn()) fail('NOT_YOUR_TURN', 409);
    if (body.expectedVersion !== game.version) fail('STALE_VERSION', 409);
    try {
      chess.move({ from: body.from, to: body.to, promotion: body.promotion });
    } catch {
      fail('ILLEGAL_MOVE', 422);
    }
    game.pgn = chess.pgn();
    game.result = resultAfterMove(chess);
    if (game.result) game.status = 'finished';
    return touch(game);
  },

  resignGame({ gameId }, player) {
    const game = findGame(gameId);
    const color = colorOf(game, player.playerId);
    if (!color) fail('NOT_YOUR_TURN', 409);
    if (game.status === 'finished') return toPublic(game);
    game.result = game.status === 'waiting'
      ? { outcome: 'abandoned', winner: null }
      : { outcome: 'resign', winner: color === 'w' ? 'b' : 'w' };
    game.status = 'finished';
    return touch(game);
  },

  /* keeps the latest events in localStorage so the demo can show what the backend receives */
  recordEvent({ body = {} }, player) {
    if (!body.type) fail('VALIDATION', 400);
    const events = load('events') || [];
    events.push({
      type: body.type, data: body.data || {}, at: body.at, playerId: player.playerId,
    });
    save('events', events.slice(-MAX_EVENTS));
    return { accepted: true };
  },

  sendInvite({ gameId, body = {} }, player) {
    const game = findGame(gameId);
    if (colorOf(game, player.playerId) !== 'w') fail('NOT_YOUR_TURN', 409);
    if (!EMAIL_PATTERN.test(String(body.email || '').trim())) fail('VALIDATION', 400);
    if (game.invites >= MAX_INVITES_PER_GAME) fail('RATE_LIMITED', 429);
    game.invites += 1;
    save(`game:${game.gameId}`, game);
    // The real backend returns /<locale>/chess-challenge?game=<id>. The mock links to the
    // page the host is playing on, so the demo also works on local and unpublished paths.
    return { inviteId: id('i'), gameUrl: `${window.location.pathname}?game=${game.gameId}` };
  },
};

export default {
  mock: true,

  async call(operation, params = {}, token = null) {
    await sleep();
    const player = operation === 'registerPlayer' ? null : authenticate(token);
    // round trip through JSON so callers never share objects with the store
    return JSON.parse(JSON.stringify(handlers[operation](params, player)));
  },

  subscribe(gameId, handler) {
    const key = `${NS}game:${gameId}`;
    const listener = (event) => {
      if (event.key !== key || !event.newValue) return;
      try {
        handler(toPublic(JSON.parse(event.newValue)));
      } catch {
        // ignore malformed entries
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  },
};

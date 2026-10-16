import { fetchPlaceholders } from '../../scripts/placeholders.js';
import {
  EVENTS, emit, getGameIdFromUrl, getInviteGameId, getLocale, getPlayer, getStoredGame,
  isAgePassed, on, setInviteAvailable, setStoredGame, clearGame,
} from '../../scripts/game-session.js';
import {
  createGame, errorKey, getGame, joinGame, makeMove, resignGame, subscribeToGame,
} from '../../scripts/game-api.js';

const POLL_INTERVAL_MS = 3000;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RESULT_FIELDS = ['resultWin', 'resultLoss', 'resultDraw'];
const PROMOTIONS = ['q', 'r', 'b', 'n'];
const SPRITE = `${window.hlx?.codeBasePath || ''}/blocks/chess/pieces.svg`;

/**
 * TODO(live-demo): move history panel, to be generated live during the session.
 * Called after every board update with the empty, hidden container and the
 * chess.js verbose history (oldest first): [{ color, piece, from, to, san, lan, ... }].
 * Implement the rendering here, then remove `hidden` from the container.
 * @param {HTMLElement} historyEl the <aside data-hook="move-history"> container
 * @param {Array<Object>} history chess.history({ verbose: true })
 */
// eslint-disable-next-line no-unused-vars
function renderMoveHistory(historyEl, history) {
  // intentionally empty
}

/* authored rows: result copy for a win, a loss and a draw */
function readContent(block) {
  const content = {};
  [...block.children].forEach((row, index) => {
    const cell = row.firstElementChild;
    const name = cell?.dataset.aueProp || RESULT_FIELDS[index];
    if (name && cell) content[name] = [...cell.childNodes];
  });
  return content;
}

/* starts over: forget the game, drop ?game= from the URL and reload */
function restartGame() {
  clearGame();
  const url = new URL(window.location.href);
  url.searchParams.delete('game');
  window.history.replaceState(null, '', url);
  window.location.reload();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function pieceSvg(piece) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `chess-piece chess-piece-${piece.color}`);
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `${SPRITE}#${piece.type}`);
  svg.append(use);
  return svg;
}

class ChessGame {
  constructor(block, t, content, Chess) {
    this.block = block;
    this.t = t;
    this.content = content;
    this.Chess = Chess;
    this.chess = Chess ? new Chess() : null;
    this.invitePrompt = block.classList.contains('nudge');
    this.game = null;
    this.color = null;
    this.selected = null;
    this.focusSquare = 'e2';
    this.pending = false;
    this.pollTimer = null;
    this.unsubscribe = null;
    this.firstMoveSent = false;
    this.lastAnnounced = null;
    this.build();
  }

  /* ---------- DOM ---------- */

  build() {
    const { t } = this;
    this.statusEl = el('p', 'chess-status');
    this.statusEl.setAttribute('role', 'status');
    this.playersEl = el('ul', 'chess-players');

    this.board = el('div', 'chess-board');
    this.board.setAttribute('role', 'grid');
    this.board.setAttribute('aria-label', t('chess-board-label'));
    this.board.setAttribute('aria-describedby', 'chess-keyboard-help');
    this.squares = {};
    for (let r = 0; r < 8; r += 1) {
      const row = el('div', 'chess-row');
      row.setAttribute('role', 'row');
      for (let f = 0; f < 8; f += 1) {
        const cell = el('div', 'chess-cell');
        cell.setAttribute('role', 'gridcell');
        const button = el('button', 'chess-square');
        button.type = 'button';
        button.tabIndex = -1;
        cell.append(button);
        row.append(cell);
      }
      this.board.append(row);
    }
    this.board.addEventListener('click', (event) => {
      const button = event.target.closest('.chess-square');
      if (button) this.activate(button.dataset.square);
    });
    this.board.addEventListener('keydown', (event) => this.onKeydown(event));

    const help = el('p', 'chess-keyboard-help', t('chess-keyboard-help'));
    help.id = 'chess-keyboard-help';

    this.announcer = el('p', 'chess-announcer');
    this.announcer.setAttribute('aria-live', 'assertive');

    this.resignButton = el('button', 'button secondary chess-resign', t('chess-resign'));
    this.resignButton.type = 'button';
    this.resignButton.addEventListener('click', () => this.resign());

    this.promptEl = el('div', 'chess-invite-prompt');
    this.promptEl.hidden = true;
    const promptCta = el('button', 'button primary', t('chess-invite-prompt-cta'));
    promptCta.type = 'button';
    promptCta.addEventListener('click', () => emit(EVENTS.INVITE_REQUESTED));
    this.promptEl.append(
      el('h3', '', t('chess-invite-prompt-heading')),
      el('p', '', t('chess-invite-prompt-text')),
      promptCta,
    );

    this.resultEl = el('div', 'chess-result');
    this.resultEl.hidden = true;

    this.promotionDialog = this.buildPromotionDialog();

    // move history panel, left empty on purpose (see renderMoveHistory)
    this.historyEl = el('aside', 'chess-history');
    this.historyEl.dataset.hook = 'move-history';
    this.historyEl.setAttribute('aria-label', t('chess-history-label'));
    this.historyEl.hidden = true;

    const boardWrap = el('div', 'chess-board-wrap');
    boardWrap.append(this.board, help);
    const panel = el('div', 'chess-panel');
    const actions = el('div', 'chess-actions');
    actions.append(this.resignButton);
    panel.append(this.statusEl, this.playersEl, this.promptEl, actions, this.resultEl);

    const layout = el('div', 'chess-layout');
    layout.append(boardWrap, panel, this.historyEl);
    this.block.replaceChildren(layout, this.announcer, this.promotionDialog);
  }

  buildPromotionDialog() {
    const dialog = el('dialog', 'chess-promotion');
    dialog.setAttribute('aria-labelledby', 'chess-promotion-heading');
    const heading = el('h3', '', this.t('chess-promotion-heading'));
    heading.id = 'chess-promotion-heading';
    const options = el('div', 'chess-promotion-options');
    PROMOTIONS.forEach((type) => {
      const button = el('button', 'chess-promotion-option');
      button.type = 'button';
      button.value = type;
      button.setAttribute('aria-label', this.t(`chess-promote-${type}`));
      options.append(button);
    });
    options.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (button) dialog.close(button.value);
    });
    dialog.append(heading, options);
    return dialog;
  }

  /* square names in screen order for the player's orientation */
  orderedSquares() {
    const ranks = this.color === 'b' ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const files = this.color === 'b' ? [...FILES].reverse() : FILES;
    return ranks.map((rank) => files.map((file) => `${file}${rank}`));
  }

  render() {
    const { t, chess } = this;
    const targets = this.selected
      ? new Set(chess.moves({ square: this.selected, verbose: true }).map((m) => m.to))
      : new Set();
    const last = this.game?.lastMove;
    const checkSquare = chess.inCheck()
      ? chess.board().flat().find((p) => p && p.type === 'k' && p.color === chess.turn())?.square
      : null;
    const myTurn = this.isMyTurn();

    const order = this.orderedSquares();
    [...this.board.children].forEach((row, r) => {
      [...row.children].forEach((cell, f) => {
        const square = order[r][f];
        const button = cell.firstElementChild;
        const piece = chess.get(square);
        button.dataset.square = square;
        button.className = 'chess-square';
        const fileIndex = FILES.indexOf(square[0]);
        // a1 is dark: file index + rank is odd on dark squares
        button.classList.add((fileIndex + Number(square[1])) % 2 === 1 ? 'is-dark' : 'is-light');
        const flags = [];
        if (square === this.selected) {
          button.classList.add('is-selected');
          flags.push(t('chess-selected'));
        }
        if (targets.has(square)) {
          button.classList.add(piece ? 'is-capture' : 'is-target');
          flags.push(t('chess-legal-target'));
        }
        if (last && (square === last.from || square === last.to)) {
          button.classList.add('is-last-move');
          flags.push(t('chess-last-move'));
        }
        if (square === checkSquare) {
          button.classList.add('is-check');
          flags.push(t('chess-status-check'));
        }
        const pieceName = piece ? t(`chess-piece-${piece.color}${piece.type}`) : t('chess-empty');
        button.setAttribute('aria-label', [t('chess-square', { square, piece: pieceName }), ...flags].join(', '));
        button.tabIndex = square === this.focusSquare ? 0 : -1;
        button.setAttribute('aria-disabled', myTurn ? 'false' : 'true');
        button.replaceChildren();
        if (piece) button.append(pieceSvg(piece));
        if (r === 7) button.append(el('span', 'chess-coord chess-coord-file', square[0]));
        if (f === 0) button.append(el('span', 'chess-coord chess-coord-rank', square[1]));
        button.querySelectorAll('.chess-coord').forEach((c) => c.setAttribute('aria-hidden', 'true'));
      });
    });
    this.board.classList.toggle('is-flipped', this.color === 'b');
    this.board.classList.toggle('is-locked', !myTurn);
    this.renderPanel();
    renderMoveHistory(this.historyEl, chess.history({ verbose: true }));
  }

  renderPanel() {
    const { t, game } = this;
    if (!game) return;
    const opponent = this.color === 'w' ? game.players.black : game.players.white;
    this.playersEl.replaceChildren(
      el('li', '', t(this.color === 'w' ? 'chess-you-are-white' : 'chess-you-are-black')),
      el('li', '', opponent ? t('chess-opponent', { name: opponent.firstName }) : t('chess-opponent-waiting')),
    );
    this.statusEl.textContent = this.statusText();
    this.resignButton.hidden = game.status === 'finished';
    const showPrompt = this.invitePrompt && this.color === 'w'
      && game.status === 'waiting' && game.moveCount > 0;
    this.promptEl.hidden = !showPrompt;
  }

  statusText() {
    const { t, game, chess } = this;
    if (game.status === 'finished') return this.outcomeText();
    if (game.status === 'waiting') {
      if (this.color === 'w' && game.moveCount === 0) return t('chess-status-opening');
      return t('chess-status-waiting-opponent');
    }
    if (this.isMyTurn()) return chess.inCheck() ? t('chess-status-your-move-check') : t('chess-status-your-move');
    const opponent = this.color === 'w' ? game.players.black : game.players.white;
    return t('chess-status-their-move', { name: opponent?.firstName || '' });
  }

  outcomeText() {
    const { t, game } = this;
    const { outcome, winner } = game.result || {};
    if (outcome === 'resign') return winner === this.color ? t('chess-outcome-resign-them') : t('chess-outcome-resign-you');
    if (outcome === 'checkmate') return winner === this.color ? t('chess-outcome-checkmate-win') : t('chess-outcome-checkmate-loss');
    return t(`chess-outcome-${outcome || 'draw'}`);
  }

  showResult() {
    const { t, game } = this;
    const { winner } = game.result || {};
    let field = 'resultDraw';
    if (winner) field = winner === this.color ? 'resultWin' : 'resultLoss';

    const heading = el('h3', 'chess-result-heading', this.outcomeText());
    heading.tabIndex = -1;
    const body = el('div', 'chess-result-content');
    // a game closed before anyone joined has no winner, loser or draw to talk about
    if (game.result?.outcome !== 'abandoned') {
      (this.content[field] || []).forEach((node) => body.append(node.cloneNode(true)));
    }
    // responsible drinking line: per-locale copy, always part of the result screen
    const responsible = el('p', 'chess-responsible', t('responsible-drinking'));
    const again = el('button', 'button primary chess-play-again', t('chess-play-again'));
    again.type = 'button';
    again.addEventListener('click', restartGame);
    this.resultEl.replaceChildren(heading, body, responsible, again);
    if (this.resultEl.hidden) {
      this.resultEl.hidden = false;
      heading.focus();
    }
  }

  announce(message) {
    this.announcer.textContent = '';
    // a fresh text node makes screen readers announce repeated messages too
    requestAnimationFrame(() => { this.announcer.textContent = message; });
  }

  /* ---------- game state ---------- */

  isMyTurn() {
    const { game } = this;
    if (!game || this.pending) return false;
    if (game.status === 'active') return this.chess.turn() === this.color;
    return game.status === 'waiting' && this.color === 'w' && game.moveCount === 0;
  }

  applyGame(game, { announce = true } = {}) {
    if (this.game && game.version < this.game.version) return;
    const previous = this.game;
    this.game = game;
    try {
      if (game.pgn) this.chess.loadPgn(game.pgn);
      else this.chess.load(game.fen);
    } catch {
      this.chess.load(game.fen);
    }

    const player = getPlayer();
    if (game.players.white?.playerId === player?.playerId) this.color = 'w';
    else if (game.players.black?.playerId === player?.playerId) this.color = 'b';
    if (!previous && this.color === 'b') this.focusSquare = 'e7';

    if (announce && previous && game.lastMove && game.version !== previous.version) {
      this.announceMove(game);
    }
    if (previous && !previous.players.black && game.players.black && this.color === 'w') {
      this.announce(this.t('chess-opponent-joined', { name: game.players.black.firstName }));
    }
    this.updateInvite();
    this.render();
    emit(EVENTS.UPDATED, { game });

    if (game.status === 'finished') {
      this.stopPolling();
      this.showResult();
      if (!previous || previous.status !== 'finished') emit(EVENTS.OVER, { result: game.result });
    } else {
      this.schedulePoll();
    }
  }

  announceMove(game) {
    const { t } = this;
    const history = this.chess.history({ verbose: true });
    const move = history[history.length - 1];
    if (!move || this.lastAnnounced === game.version) return;
    this.lastAnnounced = game.version;
    const mover = move.color === this.color ? t('chess-you') : (
      (move.color === 'w' ? game.players.white : game.players.black)?.firstName || ''
    );
    let message = t('chess-announce-move', {
      player: mover,
      piece: t(`chess-piece-${move.color}${move.piece}`),
      from: move.from,
      to: move.to,
    });
    if (this.chess.inCheck() && game.status !== 'finished') message = `${message} ${t('chess-status-check')}`;
    this.announce(message);
  }

  updateInvite() {
    const { game } = this;
    if (this.color !== 'w' || game.status !== 'waiting' || getInviteGameId() === game.gameId) return;
    // control: invite right away; challenger ("nudge" option): only after the opening move
    if (!this.invitePrompt || game.moveCount > 0) setInviteAvailable(game.gameId);
  }

  async start() {
    const { Chess } = this;
    if (this.started || !Chess) return;
    this.started = true;
    const { t } = this;
    const urlGameId = getGameIdFromUrl();
    const stored = getStoredGame();
    let game;
    try {
      if (urlGameId && stored?.gameId !== urlGameId) {
        this.statusEl.textContent = t('chess-status-joining');
        game = await joinGame(urlGameId);
      } else if (urlGameId || stored?.gameId) {
        game = await getGame(urlGameId || stored.gameId);
      } else {
        this.statusEl.textContent = t('chess-status-creating');
        game = await createGame({ locale: getLocale() });
      }
    } catch (error) {
      if (!urlGameId && stored?.gameId && error.code === 'NOT_FOUND') {
        clearGame();
        this.started = false;
        this.start();
        return;
      }
      this.showStartError(error);
      return;
    }
    this.lastAnnounced = game.version;
    this.applyGame(game, { announce: false });
    if (!this.color) {
      this.showStartError({ code: 'GAME_FULL' });
      return;
    }
    setStoredGame({ gameId: game.gameId, color: this.color });
    emit(EVENTS.CREATED, { game });
    this.unsubscribe = await subscribeToGame(game.gameId, (update) => this.applyGame(update));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.poll();
    });
  }

  showStartError(error) {
    const { t } = this;
    this.block.classList.add('is-error');
    const message = el('p', 'chess-error', t(errorKey(error)));
    const restart = el('button', 'button primary', t('chess-new-game'));
    restart.type = 'button';
    restart.addEventListener('click', restartGame);
    this.statusEl.replaceChildren(message);
    this.statusEl.after(restart);
    this.board.closest('.chess-board-wrap').hidden = true;
    this.resignButton.hidden = true;
  }

  /* ---------- polling ---------- */

  needsPolling() {
    return this.game && this.game.status !== 'finished' && !this.isMyTurn() && !this.pending;
  }

  schedulePoll() {
    clearTimeout(this.pollTimer);
    if (!this.needsPolling()) return;
    this.pollTimer = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
  }

  stopPolling() {
    clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  async poll() {
    clearTimeout(this.pollTimer);
    if (!this.needsPolling()) return;
    if (document.hidden) return; // resumes on visibilitychange
    try {
      this.applyGame(await getGame(this.game.gameId));
    } catch {
      this.schedulePoll();
    }
  }

  /* ---------- interaction ---------- */

  onKeydown(event) {
    const { key } = event;
    if (key === 'Escape') {
      if (this.selected) {
        this.selected = null;
        this.render();
      }
      return;
    }
    const order = this.orderedSquares();
    let r = order.findIndex((row) => row.includes(this.focusSquare));
    let f = order[r].indexOf(this.focusSquare);
    const moves = {
      ArrowUp: () => { r = Math.max(0, r - 1); },
      ArrowDown: () => { r = Math.min(7, r + 1); },
      ArrowLeft: () => { f = Math.max(0, f - 1); },
      ArrowRight: () => { f = Math.min(7, f + 1); },
      Home: () => { f = 0; },
      End: () => { f = 7; },
    };
    if (!moves[key]) return;
    event.preventDefault();
    moves[key]();
    this.focusSquare = order[r][f];
    this.board.querySelectorAll('.chess-square').forEach((button) => {
      button.tabIndex = button.dataset.square === this.focusSquare ? 0 : -1;
    });
    this.board.querySelector(`[data-square="${this.focusSquare}"]`).focus();
  }

  activate(square) {
    const { chess, t } = this;
    this.focusSquare = square;
    if (!this.isMyTurn()) {
      this.announce(this.game?.status === 'finished' ? this.outcomeText() : t('error-not-your-turn'));
      this.render();
      return;
    }
    const piece = chess.get(square);
    if (this.selected) {
      const from = this.selected;
      const candidates = chess.moves({ square: from, verbose: true })
        .filter((m) => m.to === square);
      if (candidates.length) {
        this.choosePromotion(candidates).then((promotion) => {
          if (promotion !== null) this.move(from, square, promotion);
        });
        return;
      }
    }
    if (piece && piece.color === this.color && chess.moves({ square, verbose: true }).length) {
      this.selected = square === this.selected ? null : square;
    } else {
      this.selected = null;
    }
    this.render();
    this.focusBoard();
  }

  focusBoard() {
    this.board.querySelector(`[data-square="${this.focusSquare}"]`)?.focus();
  }

  choosePromotion(candidates) {
    if (!candidates.some((m) => m.promotion)) return Promise.resolve(undefined);
    const dialog = this.promotionDialog;
    const [{ color }] = candidates;
    dialog.querySelectorAll('.chess-promotion-option').forEach((button) => {
      button.replaceChildren(pieceSvg({ color, type: button.value }));
    });
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => {
        resolve(PROMOTIONS.includes(dialog.returnValue) ? dialog.returnValue : null);
        if (!dialog.returnValue) {
          this.selected = null;
          this.render();
          this.focusBoard();
        }
      }, { once: true });
    });
  }

  async move(from, to, promotion) {
    const { chess, t } = this;
    const { version } = this.game;
    try {
      chess.move({ from, to, promotion });
    } catch {
      this.announce(t('error-illegal-move'));
      return;
    }
    // optimistic update while the server confirms
    this.selected = null;
    this.pending = true;
    this.render();
    this.focusBoard();
    try {
      const game = await makeMove(this.game.gameId, {
        from, to, promotion, expectedVersion: version,
      });
      this.pending = false;
      this.applyGame(game);
      const mine = chess.history({ verbose: true }).filter((m) => m.color === this.color);
      if (mine.length === 1 && !this.firstMoveSent) {
        this.firstMoveSent = true;
        emit(EVENTS.FIRST_MOVE, { gameId: game.gameId });
      }
    } catch (error) {
      chess.undo();
      this.pending = false;
      this.announce(t(errorKey(error)));
      this.render();
      try {
        this.applyGame(await getGame(this.game.gameId), { announce: false });
      } catch {
        this.schedulePoll();
      }
    }
  }

  async resign() {
    const { t } = this;
    if (!this.resignButton.classList.contains('is-confirming')) {
      this.resignButton.classList.add('is-confirming');
      this.resignButton.textContent = t('chess-resign-confirm');
      return;
    }
    this.resignButton.disabled = true;
    try {
      this.applyGame(await resignGame(this.game.gameId));
    } catch (error) {
      this.announce(t(errorKey(error)));
    } finally {
      this.resignButton.disabled = false;
      this.resignButton.classList.remove('is-confirming');
      this.resignButton.textContent = t('chess-resign');
    }
  }
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const content = readContent(block);
  const t = await fetchPlaceholders();
  const game = new ChessGame(block, t, content, null);

  const ready = () => isAgePassed() && !!getPlayer();
  const update = async () => {
    block.hidden = !ready();
    if (block.hidden) return;
    // chess.js is only fetched once the visitor can actually play
    if (!game.Chess) {
      const { Chess } = await import('../../scripts/vendor/chess.js');
      game.Chess = Chess;
      game.chess = new Chess();
    }
    game.start();
  };
  block.hidden = true;
  on(EVENTS.AGE_PASSED, update);
  on(EVENTS.REGISTERED, update);
  await update();
}

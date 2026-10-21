import { fetchPlaceholders } from '../../scripts/placeholders.js';
import {
  EVENTS, getLatestGame, getLatestResult, getPlayer, hasMarketingOptIn, isAgePassed, on,
} from '../../scripts/game-session.js';
import { startGameEvents, track } from '../../scripts/game-events.js';

/*
 * On-site marketing message for the current visit.
 * Authors add one item per audience; the block shows the best match, only to players who
 * passed the age gate and opted in to marketing. Nothing is remembered after the tab closes.
 */
const AUDIENCES = ['registered', 'waiting', 'won', 'lost', 'draw'];
const RESULT_AUDIENCE = { win: 'won', loss: 'lost', draw: 'draw' };

/* one authored row: [audience, text, link] (empty cells may be omitted) */
function readItems(block) {
  return [...block.children].map((row) => {
    const cells = [...row.children];
    const audienceCell = cells.find((c) => AUDIENCES.includes(c.textContent.trim()));
    const linkCell = cells.find((c) => c !== audienceCell && c.querySelector('a[href]')
      && c.textContent.trim() === c.querySelector('a').textContent.trim());
    const textCell = cells.find((c) => c !== audienceCell && c !== linkCell);
    return {
      audience: audienceCell?.textContent.trim() || 'registered',
      text: textCell ? [...textCell.childNodes] : [],
      link: linkCell?.querySelector('a') || null,
    };
  }).filter((item) => item.text.length || item.link);
}

/* replaces {firstName} in text nodes only, so authored markup is kept and nothing is injected */
function personalise(nodes, firstName) {
  const fragment = document.createDocumentFragment();
  nodes.forEach((node) => fragment.append(node.cloneNode(true)));
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  texts.forEach((text) => {
    text.textContent = text.textContent.replace(/\{firstName\}/g, firstName);
  });
  return fragment;
}

function ownFirstName(game) {
  const playerId = getPlayer()?.playerId;
  const me = [game?.players?.white, game?.players?.black].find((p) => p?.playerId === playerId);
  return me?.firstName || '';
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  startGameEvents();
  const items = readItems(block);
  const t = await fetchPlaceholders();

  const panel = document.createElement('div');
  panel.className = 'player-message-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', t('player-message-label'));
  block.replaceChildren(panel);
  block.hidden = true;

  // confirmation after following the unsubscribe link of a marketing email
  if (new URLSearchParams(window.location.search).get('unsubscribed') === '1') {
    const notice = document.createElement('p');
    notice.className = 'player-message-notice';
    notice.textContent = t('unsubscribed-confirmation');
    panel.replaceChildren(notice);
    block.hidden = false;
    return;
  }

  const state = { game: getLatestGame(), perspective: getLatestResult()?.perspective || null };
  const dismissed = new Set();
  const shown = new Set();

  const audience = () => {
    if (state.perspective) return RESULT_AUDIENCE[state.perspective];
    const { game } = state;
    if (game?.status === 'waiting' && game.moveCount > 0
      && game.players.white?.playerId === getPlayer()?.playerId) return 'waiting';
    return game ? 'registered' : null;
  };

  const render = () => {
    const current = audience();
    const item = items.find((i) => i.audience === current);
    const firstName = ownFirstName(state.game);
    const eligible = isAgePassed() && hasMarketingOptIn() && firstName;
    if (!eligible || !item || dismissed.has(current)) {
      block.hidden = true;
      return;
    }
    const body = document.createElement('div');
    body.className = 'player-message-body';
    body.append(personalise(item.text, firstName));
    const actions = document.createElement('div');
    actions.className = 'player-message-actions';
    if (item.link) {
      const link = item.link.cloneNode(true);
      link.className = 'button primary';
      link.addEventListener('click', () => track('message-clicked', { audience: current }));
      actions.append(link);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'player-message-close';
    close.setAttribute('aria-label', t('player-message-close'));
    close.textContent = '×';
    close.addEventListener('click', () => {
      dismissed.add(current);
      render();
    });
    const responsible = document.createElement('p');
    responsible.className = 'player-message-responsible';
    responsible.textContent = t('responsible-drinking');
    panel.replaceChildren(close, body, actions, responsible);
    block.hidden = false;
    if (!shown.has(current)) {
      shown.add(current);
      track('message-shown', { audience: current });
    }
  };

  on(EVENTS.UPDATED, ({ game }) => {
    state.game = game;
    if (game.status !== 'finished') state.perspective = null;
    render();
  });
  on(EVENTS.OVER, ({ perspective }) => {
    state.perspective = perspective;
    render();
  });
  on(EVENTS.REGISTERED, render);
  render();
}

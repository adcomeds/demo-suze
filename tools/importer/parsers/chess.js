/* eslint-disable */
/* global WebImporter */
/**
 * Parser for chess. Source: tools/importer/sources/chess-challenge/*.html
 * Source markup: <div data-block="chess" data-options="nudge|"><div data-field="resultWin">..</div>...</div>
 * xwalk model (blocks/chess/_chess.json): classes (block option "nudge"),
 * resultWin, resultLoss, resultDraw (richtext). Rows: resultWin, resultLoss, resultDraw.
 */
export default function parse(element, { document, options = '' }) {
  const cells = ['resultWin', 'resultLoss', 'resultDraw'].map((field) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    const source = element.querySelector(`[data-field="${field}"]`);
    if (source) [...source.childNodes].forEach((node) => frag.appendChild(node));
    return [frag];
  });
  const variant = (options || element.dataset.options || '').trim();
  const name = variant ? `chess (${variant})` : 'chess';
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name, cells }));
}

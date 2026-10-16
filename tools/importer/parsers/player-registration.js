/* eslint-disable */
/* global WebImporter */
/**
 * Parser for player-registration. Source: tools/importer/sources/chess-challenge/*.html
 * Source markup: <div data-block="player-registration"><div data-field="text">..</div><div data-field="termsLink"><a></a></div></div>
 * xwalk model (blocks/player-registration/_player-registration.json): text (richtext), termsLink (aem-content).
 * Rows: text, termsLink.
 */
export default function parse(element, { document }) {
  const cells = ['text', 'termsLink'].map((field) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    const source = element.querySelector(`[data-field="${field}"]`);
    if (source) [...source.childNodes].forEach((node) => frag.appendChild(node));
    return [frag];
  });
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'player-registration', cells }));
}

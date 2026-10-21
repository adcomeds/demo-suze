/* eslint-disable */
/* global WebImporter */
/**
 * Parser for player-message. Source: tools/importer/sources/chess-challenge/*.html
 * Source markup:
 *   <div data-block="player-message">
 *     <div data-item data-audience="registered|waiting|won|lost|draw">
 *       <div data-field="text"><p>...</p></div>
 *       <a href="/locale/...">Link text</a>
 *     </div>
 *   </div>
 * xwalk model (blocks/player-message/_player-message.json): container with player-message-item
 * items: audience (select), text (richtext), link + linkText (collapsed into the <a>).
 * One row per item: [audience, text, link].
 */
export default function parse(element, { document }) {
  const cells = [...element.querySelectorAll(':scope > [data-item]')].map((item) => {
    const audience = document.createDocumentFragment();
    audience.appendChild(document.createComment(' field:audience '));
    audience.appendChild(document.createTextNode(item.dataset.audience || 'registered'));

    const text = document.createDocumentFragment();
    text.appendChild(document.createComment(' field:text '));
    const source = item.querySelector('[data-field="text"]');
    if (source) [...source.childNodes].forEach((node) => text.appendChild(node));

    const link = document.createDocumentFragment();
    const a = item.querySelector(':scope > a[href]');
    if (a) {
      link.appendChild(document.createComment(' field:link '));
      link.appendChild(a);
    }
    return [audience, text, link];
  });
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'player-message', cells }));
}

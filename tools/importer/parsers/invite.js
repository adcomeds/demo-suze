/* eslint-disable */
/* global WebImporter */
/**
 * Parser for invite. Source: tools/importer/sources/chess-challenge/*.html
 * Source markup: <div data-block="invite"><p>intro</p></div>
 * xwalk model (blocks/invite/_invite.json): text (richtext). Rows: text.
 */
export default function parse(element, { document }) {
  const text = document.createDocumentFragment();
  text.appendChild(document.createComment(' field:text '));
  [...element.childNodes].forEach((node) => text.appendChild(node));
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'invite', cells: [[text]] }));
}

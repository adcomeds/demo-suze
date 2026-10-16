/* eslint-disable */
/* global WebImporter */
/**
 * Parser for age-gate. Source: tools/importer/sources/chess-challenge/*.html
 * Source markup: <div data-block="age-gate" data-options="dob|" data-minimum-age="18"><p>intro</p></div>
 * xwalk model (blocks/age-gate/_age-gate.json): classes (block option), minimumAge (number), text (richtext).
 * Rows: minimumAge, text.
 */
export default function parse(element, { document }) {
  const options = (element.dataset.options || '').trim();
  const age = document.createDocumentFragment();
  age.appendChild(document.createComment(' field:minimumAge '));
  age.appendChild(document.createTextNode(element.dataset.minimumAge || '18'));
  const text = document.createDocumentFragment();
  text.appendChild(document.createComment(' field:text '));
  [...element.childNodes].forEach((node) => text.appendChild(node));
  const name = options ? `age-gate (${options})` : 'age-gate';
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name, cells: [[age], [text]] }));
}

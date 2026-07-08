/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-frieze. Base: columns.
 * Source: https://www.suze.com/ (homepage section 2) and
 *         https://www.suze.com/product/suze-loriginale/ (product section 4 reuse: H3 title, no CTA).
 * Library convention: columns block — block-name row + content row with N columns; extra rows share column count.
 * Model (blocks/columns-frieze/_columns-frieze.json): core columns component (2 cols, 1 row).
 * Columns blocks use ONLY default content in cells — NO field:* hints (per hinting rules).
 * Layout: left column = image (kept as the only child so decorate() tags it as img-col);
 *         right column = frieze heading (H2) + optional H3 title + text paragraph + optional CTA.
 */
export default function parse(element, { document }) {
  // INPUT extraction (validated against block-context/columns-frieze/source.html)
  const frieze = element.querySelector('.suzeOriginalHome__frieze__infinite-frieze__title, .frieze h2, .frieze h3');
  const image = element.querySelector('.suzeOriginalHome__content__media img, img');
  const insert = element.querySelector('.suzeOriginalHome__content__insert');
  const scope = insert || element;
  const title = scope.querySelector('h3, h4');
  const text = scope.querySelector('.suzeOriginalHome__content__insert__text, p');
  const cta = element.querySelector('.suzeOriginalHome__content__insert a.cta, .suzeOriginalHome__content__insert a, a.cta');

  // Empty-block guard
  if (!image && !text) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Left column: image only (no comment — columns block)
  const imageCell = [];
  if (image) imageCell.push(image);

  // Right column: frieze + optional title + text + optional CTA (no comments — columns block)
  const contentCell = [];
  if (frieze) contentCell.push(frieze);
  if (title) contentCell.push(title);
  if (text) contentCell.push(text);
  if (cta) contentCell.push(cta);

  const cells = [];
  cells.push([imageCell, contentCell]); // single content row, 2 columns

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-frieze', cells });
  element.replaceWith(block);
}

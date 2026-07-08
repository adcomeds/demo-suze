/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero. Base: hero.
 * Source: https://www.suze.com/
 * Library convention: 3 rows total (block name row, background image row, content row).
 * xwalk model (blocks/hero/_hero.json): image (reference) + imageAlt (collapsed onto <img>), text (richtext).
 * Mapping: row 2 = background image (field:image), row 3 = content/title (field:text).
 */
export default function parse(element, { document }) {
  // INPUT extraction (validated against block-context/hero/source.html)
  const image = element.querySelector('.homepage__header__media img, img');
  const heading = element.querySelector('.homepage__header__insert__title, h1, h2');

  // Empty-block guard
  if (!image && !heading) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background image (field:image; imageAlt collapses into the <img alt> attribute)
  if (image) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(' field:image '));
    frag.appendChild(image);
    cells.push([frag]);
  } else {
    cells.push(['']);
  }

  // Row 3: content cell — title (field:text), styled as a Heading (H1)
  if (heading) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(' field:text '));
    frag.appendChild(heading);
    cells.push([frag]);
  } else {
    cells.push(['']);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}

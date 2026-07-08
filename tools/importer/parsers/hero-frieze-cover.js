/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-frieze-cover. Base: hero.
 * Source: https://www.suze.com/suze-story/ (section 1).
 * Library convention: hero — block-name row + background image row (row 2) + content row (row 3),
 *   never more than 3 rows total.
 * Model (blocks/hero-frieze-cover/_hero-frieze-cover.json): image (reference) + imageAlt (collapsed),
 *   text (richtext).
 * The corner svgs are DECORATIVE-ONLY (decorate() injects its own <span> ornaments; the model has
 *   no field for them) — they are excluded from the parsed output.
 * Rows (one column each): image (field:image), text (field:text) = H1 title + description paragraph.
 */
export default function parse(element, { document }) {
  // INPUT extraction (validated against block-context/hero-frieze-cover/source.html)
  const image = element.querySelector('.history__header__media img, .history__header__image, img:not(.history__header__insert__corner)');
  const heading = element.querySelector('.history__header__insert__title, h1, h2');
  const desc = element.querySelector('.history__header__insert__description, .history__header__insert p, p');

  // Empty-block guard
  if (!image && !heading) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background/cover image (field:image; imageAlt collapses into <img alt>)
  const imageFrag = document.createDocumentFragment();
  if (image) {
    imageFrag.appendChild(document.createComment(' field:image '));
    imageFrag.appendChild(image);
    cells.push([imageFrag]);
  } else {
    cells.push(['']);
  }

  // Row 3: text richtext (field:text) — H1 title + description (corner svgs excluded, decorative-only)
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));
  if (heading) textFrag.appendChild(heading.cloneNode(true));
  if (desc) textFrag.appendChild(desc.cloneNode(true));
  cells.push([textFrag]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-frieze-cover', cells });
  element.replaceWith(block);
}

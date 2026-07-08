/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-tasting-notes. Base: cards.
 * Model (blocks/cards-tasting-notes/_cards-tasting-notes.json): container "cards-tasting-notes"
 *   with child "card" items. Each card = EXACTLY 2 cells: cell 1 = image (reference/picture),
 *   cell 2 = richtext (`text`). Every row MUST have 2 cells (empty cell allowed) or xwalk
 *   md2jcr mapping fails.
 * Source: https://www.suze.com/product/suze-loriginale/ (section 2, .productSection) and
 *         https://www.suze.com/product/suze-tonic-0/ (2 notes).
 * The whole tasting section is modeled as this block:
 *   Row 1 (hero)  : [bottle image] [frieze heading H2]
 *   Row 2..N (note): [icon svg]     [<p><strong>label</strong> value</p>]
 *   Row last (outro): [empty]        [intro paragraph + Buy Now link]
 */
export default function parse(element, { document }) {
  const cells = [];

  // ---- Row 1: hero — bottle image + frieze heading ----
  const bottle = element.querySelector('.productSection__bottle, .productSection__content__img-box img');
  const frieze = element.querySelector('.productSection__frieze__infinite-frieze__title, .productSection__frieze h2, .frieze h2');
  const bottleFrag = document.createDocumentFragment();
  if (bottle) bottleFrag.appendChild(bottle.cloneNode(true));
  const headingFrag = document.createDocumentFragment();
  if (frieze) {
    const h2 = document.createElement('h2');
    h2.textContent = frieze.textContent.trim();
    headingFrag.appendChild(h2);
  }
  cells.push([bottleFrag, headingFrag]);

  // ---- Note rows: icon + label/value ----
  const items = Array.from(element.querySelectorAll(
    '.productSection__content__data-box__row, .productSection__list__item, .productSection__list li',
  ));
  items.forEach((item) => {
    const icon = item.querySelector(
      '.productSection__content__data-box__icon img, .productSection__list__item__icon, img',
    );
    const iconFrag = document.createDocumentFragment();
    if (icon) iconFrag.appendChild(icon.cloneNode(true));

    const label = item.querySelector(
      '.productSection__content__data-box__item__title, .productSection__list__item__label',
    );
    const value = item.querySelector(
      '.productSection__content__data-box__item__content, .productSection__list__item__value',
    );
    const p = document.createElement('p');
    if (label) {
      const strong = document.createElement('strong');
      strong.textContent = label.textContent.trim();
      p.appendChild(strong);
    }
    if (value) {
      if (label) p.appendChild(document.createTextNode(' '));
      p.appendChild(document.createTextNode(value.textContent.trim()));
    }
    cells.push([iconFrag, p]);
  });

  // ---- Outro row: empty cell + intro paragraph + Buy Now ----
  const intro = element.querySelector('.productSection__content__data-box__description, .productSection__content__text');
  const cta = element.querySelector('.productSection__content a.cta, .productSection__content a[href]');
  if (intro || cta) {
    const outroFrag = document.createDocumentFragment();
    if (intro) {
      const p = document.createElement('p');
      p.textContent = intro.textContent.trim();
      outroFrag.appendChild(p);
    }
    if (cta) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = cta.getAttribute('href') || '#';
      a.textContent = cta.textContent.trim();
      p.appendChild(a);
      outroFrag.appendChild(p);
    }
    cells.push([document.createDocumentFragment(), outroFrag]);
  }

  // Empty-block guard: nothing meaningful found
  if (cells.length <= 1 && items.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-tasting-notes', cells });
  element.replaceWith(block);
}

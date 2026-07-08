/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-flip. Base: cards.
 * Source: https://www.suze.com/ (homepage section 3) and product pages (section 3).
 * Library convention: cards container — one row per card; cell 1 = image (image/imageAlt),
 *   cell 2 = rich text (title/description/CTA) via the `text` field. Empty cells still included.
 * Model (blocks/cards-flip/_cards-flip.json): container "cards-flip" with child "card" items.
 *   card fields: image (reference) + text (richtext).
 * Text cell holds front title + front description, then back title + recipe rows (mini table)
 *   + serving detail + method + optional product link. Cards with no recipe (e.g. Suze Tonic Zero)
 *   simply omit the recipe portion. The section H2 is default content, excluded here.
 */
export default function parse(element, { document }) {
  const cards = Array.from(element.querySelectorAll('.flip-card'));

  // Empty-block guard
  if (cards.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  cards.forEach((card) => {
    const front = card.querySelector('.flip-card-front');
    const back = card.querySelector('.flip-card-back');

    // ---- Image cell (field:image) ----
    const image = card.querySelector('.flip-card__header-image, img');
    const imageFrag = document.createDocumentFragment();
    if (image) {
      imageFrag.appendChild(document.createComment(' field:image '));
      imageFrag.appendChild(image);
    }

    // ---- Text cell (field:text) — all textual front + back content ----
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));

    // Front: title (styled heading) + description
    if (front) {
      const frontTitle = front.querySelector('.flip-card__header-title');
      if (frontTitle) {
        const h = document.createElement('h3');
        h.textContent = frontTitle.textContent;
        textFrag.appendChild(h);
      }
      const frontDesc = front.querySelector('.flip-card__description');
      if (frontDesc) textFrag.appendChild(frontDesc.cloneNode(true));
    }

    // Back: title, recipe rows (as a mini table), serving detail, method, product link
    if (back) {
      const backTitle = back.querySelector('.flip-card__back-title');
      if (backTitle) {
        const h = document.createElement('h4');
        h.textContent = backTitle.textContent;
        textFrag.appendChild(h);
      }

      const recipe = back.querySelector('.flip-card__recipe');
      if (recipe) {
        const rows = Array.from(recipe.querySelectorAll('.flip-card__recipe__row'));
        if (rows.length) {
          const table = document.createElement('table');
          rows.forEach((row) => {
            const tr = document.createElement('tr');
            Array.from(row.querySelectorAll('p')).forEach((p) => {
              const td = document.createElement('td');
              td.textContent = p.textContent;
              tr.appendChild(td);
            });
            table.appendChild(tr);
          });
          textFrag.appendChild(table);
        }
        const detail = recipe.querySelector('.flip-card__recipe__detail');
        if (detail) textFrag.appendChild(detail.cloneNode(true));
      }

      // Method description (the back-face .flip-card__description, distinct from front)
      const backDesc = back.querySelector('.flip-card__description');
      if (backDesc) textFrag.appendChild(backDesc.cloneNode(true));

      // Product link only (drop the flip buttons)
      const productLink = back.querySelector('.flip-card__buttons a[href], a.cta[href]');
      if (productLink) {
        const p = document.createElement('p');
        p.appendChild(productLink.cloneNode(true));
        textFrag.appendChild(p);
      }
    }

    cells.push([imageFrag, textFrag]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-flip', cells });

  // Preserve the section-level heading (e.g. "How to drink it?" / "How to enjoy Suze?").
  // It lives as a direct child of the flip-card-section container, NOT inside any .flip-card.
  // Emit it as default content BEFORE the block so replaceWith() doesn't delete it.
  let sectionHeading = element.querySelector(':scope .flip-card-section > h2');
  if (!sectionHeading) {
    // Fallback: first h2 in the section that is not inside a .flip-card.
    sectionHeading = Array.from(element.querySelectorAll('h2'))
      .find((h) => !h.closest('.flip-card'));
  }
  if (sectionHeading) {
    element.replaceWith(sectionHeading.cloneNode(true), block);
  } else {
    element.replaceWith(block);
  }
}

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards Flip — "How to drink it?" flip cards.
 *
 * Authored as a flat sequence of explicit typed items (picked from the UE "+"
 * picker, not inferred from content shape): each Flip Card is immediately
 * followed by its Back Content item, which is immediately followed by 0+
 * Ingredient items, then the next Flip Card, and so on.
 *
 *   Flip Card    (image, heading, description)
 *   Back Content (heading, method, productLink)
 *   Ingredient   (quantity, ingredient) — belongs to the most recently seen
 *                Back Content
 *
 * (A nested container-within-container shape isn't used here because
 * aem.js's wrapTextNodes() flattens any block row-cell whose first child
 * isn't a recognized wrapper tag, which would corrupt a cell that itself
 * holds another nested container — a flat, explicitly-typed sequence avoids
 * that entirely.)
 */

function classifyRow(row) {
  if (row.dataset.aueModel) return row.dataset.aueModel;
  const cells = [...row.children];
  if (cells.length <= 2) return 'flip-card-ingredient';
  const hasPicture = cells[0] && cells[0].querySelector('picture, img');
  return hasPicture ? 'flip-card' : 'flip-card-back';
}

/** Build the recipe grid from ingredient rows, two cells per row. */
function buildRecipe(ingredientRows) {
  const container = document.createElement('div');
  container.className = 'flip-card-recipe';

  const cells = ingredientRows.map((row) => {
    const [quantityCell, ingredientCell] = [...row.children];
    const cell = document.createElement('div');
    cell.className = 'flip-card-recipe-cell';
    moveInstrumentation(row, cell);
    const qty = document.createElement('p');
    qty.className = 'flip-card-recipe-label';
    qty.textContent = quantityCell ? quantityCell.textContent.trim() : '';
    cell.append(qty);
    if (ingredientCell && ingredientCell.textContent.trim()) {
      const name = document.createElement('p');
      name.className = 'flip-card-recipe-desc';
      name.textContent = ingredientCell.textContent.trim();
      cell.append(name);
    }
    return cell;
  });

  for (let i = 0; i < cells.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'flip-card-recipe-row';
    row.append(cells[i]);
    if (cells[i + 1]) row.append(cells[i + 1]);
    container.append(row);
  }
  return container;
}

export default function decorate(block) {
  // ---- group the flat row sequence into cards ----
  const cards = [];
  let current = null;

  [...block.children].forEach((row) => {
    const type = classifyRow(row);
    if (type === 'flip-card') {
      current = { row, back: null, ingredientRows: [] };
      cards.push(current);
    } else if (type === 'flip-card-back' && current) {
      current.back = row;
    } else if (type === 'flip-card-ingredient' && current) {
      current.ingredientRows.push(row);
    }
  });

  const ul = document.createElement('ul');

  cards.forEach(({ row, back, ingredientRows }) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    const [imageCell, headingCell, descriptionCell] = [...row.children];
    let backHeadingCell = null;
    let methodCell = null;
    let productLinkCell = null;
    if (back) {
      [backHeadingCell, methodCell, productLinkCell] = [...back.children];
    }

    // ----- build faces -----
    const inner = document.createElement('div');
    inner.className = 'flip-card-inner';

    const front = document.createElement('div');
    front.className = 'flip-card-front';
    const backFace = document.createElement('div');
    backFace.className = 'flip-card-back';
    if (back) moveInstrumentation(back, backFace);

    // FRONT: image, title, description, flip button
    if (imageCell) {
      const pic = imageCell.querySelector('picture');
      if (pic) {
        pic.classList.add('flip-card-image');
        front.append(pic);
      }
    }
    if (headingCell && headingCell.textContent.trim()) {
      const title = document.createElement('p');
      title.className = 'flip-card-title';
      title.textContent = headingCell.textContent.trim();
      front.append(title);
    }
    if (descriptionCell && descriptionCell.textContent.trim()) {
      const desc = document.createElement('p');
      desc.className = 'flip-card-desc';
      desc.textContent = descriptionCell.textContent.trim();
      front.append(desc);
    }
    const flipBtn = document.createElement('button');
    flipBtn.type = 'button';
    flipBtn.className = 'flip-card-flip button';
    flipBtn.textContent = 'Flip the card';
    front.append(flipBtn);

    // BACK: back title, recipe grid, method, product link + flip back
    if (backHeadingCell && backHeadingCell.textContent.trim()) {
      const bt = document.createElement('p');
      bt.className = 'flip-card-back-title';
      bt.textContent = backHeadingCell.textContent.trim();
      backFace.append(bt);
    }
    if (ingredientRows.length) backFace.append(buildRecipe(ingredientRows));
    if (methodCell) {
      [...methodCell.children].forEach((p) => {
        p.classList.add('flip-card-detail');
        backFace.append(p);
      });
    }
    const backBtns = document.createElement('div');
    backBtns.className = 'flip-card-buttons';
    const productLink = productLinkCell ? productLinkCell.querySelector('a') : null;
    if (productLink) {
      productLink.classList.add('flip-card-product', 'button');
      backBtns.append(productLink);
    }
    const flipBack = document.createElement('button');
    flipBack.type = 'button';
    flipBack.className = 'flip-card-flip-back';
    flipBack.textContent = 'Flip back';
    backBtns.append(flipBack);
    backFace.append(backBtns);

    inner.append(front, backFace);
    li.append(inner);

    // Suze Tonic Zero (no recipe) shows the 0% badge
    if (!ingredientRows.length) li.classList.add('flip-card-zero');

    ul.append(li);
  });

  // optimise images
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    optimizedPic.classList.add('flip-card-image');
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(ul);

  // flip interaction — event delegation
  block.addEventListener('click', (e) => {
    const trigger = e.target.closest('.flip-card-flip, .flip-card-flip-back');
    if (!trigger) return;
    const li = trigger.closest('li');
    if (li) li.classList.toggle('is-flipped');
  });
}

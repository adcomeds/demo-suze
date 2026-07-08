import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards Flip — "How to drink it?" flip cards.
 *
 * Each card is authored as an image + a rich-text field holding, in order:
 *   - a heading (front title)
 *   - a paragraph (front description)
 *   - a heading (back title)
 *   - the recipe (short ingredient/quantity lines)
 *   - one or more method sentences
 *   - a product link
 *
 * The rich text does not survive publishing consistently: headings may be
 * wrapped in <p> (Universal Editor) or unwrapped (published), and the recipe
 * may be a <table>, nested <div>s, or flattened <p>s. So we normalise first and
 * classify by content shape rather than relying on exact markup.
 */

/** Normalise the body cell and return its headings + leaf paragraphs. */
function collectContent(bodyCell) {
  // unwrap headings that the rich text wrapped in a <p> (kept as-is in UE)
  bodyCell.querySelectorAll('p > h1, p > h2, p > h3, p > h4, p > h5, p > h6').forEach((h) => {
    h.parentElement.replaceWith(h);
  });
  const headings = [...bodyCell.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  // leaf paragraphs only — ignores the wrapper <div>/<p> around a nested recipe
  const leafParas = [...bodyCell.querySelectorAll('p')].filter(
    (p) => !p.querySelector('p, div, table, h1, h2, h3, h4, h5, h6'),
  );
  return { headings, leafParas };
}

/**
 * A method line is a full sentence (ends in punctuation, or more than two
 * words); recipe lines are short quantity/ingredient labels (one or two words).
 */
function isMethod(text) {
  return /[.!?]$/.test(text) || text.split(/\s+/).length > 2;
}

/**
 * Build the recipe grid from alternating quantity/ingredient lines
 * ([qty, ingredient, qty, ingredient, ...]). Each pair becomes a cell with the
 * quantity shown large above the ingredient name; cells are laid out two per row.
 */
function buildRecipe(items) {
  const container = document.createElement('div');
  container.className = 'flip-card-recipe';

  const cells = [];
  for (let i = 0; i < items.length; i += 2) {
    const cell = document.createElement('div');
    cell.className = 'flip-card-recipe-cell';
    const qty = document.createElement('p');
    qty.className = 'flip-card-recipe-label';
    qty.textContent = items[i];
    cell.append(qty);
    if (items[i + 1] !== undefined) {
      const ingredient = document.createElement('p');
      ingredient.className = 'flip-card-recipe-desc';
      ingredient.textContent = items[i + 1];
      cell.append(ingredient);
    }
    cells.push(cell);
  }

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
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    const cells = [...row.children];
    const imageCell = cells.find((c) => c.querySelector('picture, img'));
    const bodyCell = cells.find((c) => c !== imageCell) || cells[cells.length - 1];

    const { headings, leafParas } = bodyCell
      ? collectContent(bodyCell)
      : { headings: [], leafParas: [] };
    const frontTitle = headings[0] || null;
    const backTitle = headings[1] || null;

    // product link = last leaf paragraph containing an <a>
    const linkPara = [...leafParas].reverse().find((p) => p.querySelector('a'));
    const productLink = linkPara ? linkPara.querySelector('a') : null;

    // description = first content paragraph; then recipe lines + method sentences
    const contentParas = leafParas.filter((p) => p !== linkPara);
    const [description, ...rest] = contentParas;
    const recipeItems = [];
    const methodParas = [];
    rest.forEach((p) => {
      const text = p.textContent.trim();
      if (!text) return;
      if (isMethod(text)) methodParas.push(p);
      else recipeItems.push(text);
    });

    // ----- build faces -----
    const inner = document.createElement('div');
    inner.className = 'flip-card-inner';

    const front = document.createElement('div');
    front.className = 'flip-card-front';
    const back = document.createElement('div');
    back.className = 'flip-card-back';

    // FRONT: image, title, description, flip button
    if (imageCell) {
      const pic = imageCell.querySelector('picture');
      if (pic) {
        pic.classList.add('flip-card-image');
        front.append(pic);
      }
    }
    if (frontTitle) {
      const title = document.createElement('p');
      title.className = 'flip-card-title';
      title.textContent = frontTitle.textContent.trim();
      front.append(title);
    }
    if (description) {
      description.classList.add('flip-card-desc');
      front.append(description);
    }
    const flipBtn = document.createElement('button');
    flipBtn.type = 'button';
    flipBtn.className = 'flip-card-flip button';
    flipBtn.textContent = 'Flip the card';
    front.append(flipBtn);

    // BACK: back title, recipe grid, method, product link + flip back
    if (backTitle) {
      const bt = document.createElement('p');
      bt.className = 'flip-card-back-title';
      bt.textContent = backTitle.textContent.trim();
      back.append(bt);
    }
    if (recipeItems.length) back.append(buildRecipe(recipeItems));
    methodParas.forEach((p) => {
      p.classList.add('flip-card-detail');
      back.append(p);
    });
    const backBtns = document.createElement('div');
    backBtns.className = 'flip-card-buttons';
    if (productLink) {
      productLink.classList.add('flip-card-product', 'button');
      backBtns.append(productLink);
    }
    const flipBack = document.createElement('button');
    flipBack.type = 'button';
    flipBack.className = 'flip-card-flip-back';
    flipBack.textContent = 'Flip back';
    backBtns.append(flipBack);
    back.append(backBtns);

    inner.append(front, back);
    li.append(inner);

    // Suze Tonic Zero (no recipe) shows the 0% badge
    if (!recipeItems.length) li.classList.add('flip-card-zero');

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

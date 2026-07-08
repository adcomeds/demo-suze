import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Build a recipe container from the authored <table>.
 * Rows alternate: a "label" row (big numbers e.g. "1 part") and a
 * "description" row (ingredient names e.g. "Suze"). Cells map to left/right
 * columns. A single cell (colspan) becomes a full-width left value.
 */
function buildRecipe(table) {
  const container = document.createElement('div');
  container.className = 'flip-card-recipe';

  const rows = [...table.querySelectorAll('tr')];
  rows.forEach((tr, i) => {
    const cells = [...tr.children];
    const row = document.createElement('div');
    row.className = 'flip-card-recipe-row';
    // even rows (0,2,...) are quantity labels (big), odd rows are descriptions
    const isLabel = i % 2 === 0;
    const cellClass = isLabel ? 'flip-card-recipe-label' : 'flip-card-recipe-desc';
    cells.forEach((cell, ci) => {
      const p = document.createElement('p');
      p.className = cellClass + (ci === 1 ? ' right' : '');
      p.textContent = cell.textContent.trim();
      row.append(p);
    });
    container.append(row);
  });
  return container;
}

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    const cells = [...row.children];
    const imageCell = cells.find((c) => c.querySelector('picture'));
    const bodyCell = cells.find((c) => c !== imageCell) || cells[cells.length - 1];

    // Gather body pieces
    const nodes = bodyCell ? [...bodyCell.children] : [];
    const headings = nodes.filter((n) => /^H[1-6]$/.test(n.tagName));
    const frontTitle = headings[0] || null;
    const backTitle = headings[1] || null;
    const table = nodes.find((n) => n.tagName === 'TABLE');
    const paras = nodes.filter((n) => n.tagName === 'P');
    // last <p> containing an <a> is the product link
    const linkPara = [...paras].reverse().find((p) => p.querySelector('a'));
    const productLink = linkPara ? linkPara.querySelector('a') : null;
    // description = first paragraph; method paragraphs = the rest
    const description = paras.find((p) => p !== linkPara);
    const methodParas = paras.filter((p) => p !== linkPara && p !== description);

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

    // BACK: back title, recipe, method, product link + flip back
    if (backTitle) {
      const bt = document.createElement('p');
      bt.className = 'flip-card-back-title';
      bt.textContent = backTitle.textContent.trim();
      back.append(bt);
    }
    if (table) back.append(buildRecipe(table));
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

    // Suze Tonic Zero (no recipe table) shows the 0% badge
    if (!table) li.classList.add('flip-card-zero');

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

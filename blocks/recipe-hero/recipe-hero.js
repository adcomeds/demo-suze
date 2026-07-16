import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Recipe Hero
 * Full-bleed cocktail hero: large image + title/tagline + a meta strip of stats
 * (e.g. glassware, prep time, difficulty, servings).
 *
 * Authored as a container:
 *   row 0    = Content item (image, text)
 *   row 1..N = Stat items (label, value) — any number, in author-chosen order
 */
export default function decorate(block) {
  const [contentRow, ...statRows] = [...block.children];

  const frag = document.createDocumentFragment();

  // media
  const media = document.createElement('div');
  media.className = 'recipe-hero-media';

  // insert: title/tagline + meta strip
  const insert = document.createElement('div');
  insert.className = 'recipe-hero-insert';

  if (contentRow) {
    moveInstrumentation(contentRow, media);
    const cells = [...contentRow.children];
    const imageCell = cells.find((c) => c.querySelector('picture, img'));
    const textCell = cells.find((c) => c !== imageCell);

    if (imageCell) {
      while (imageCell.firstChild) media.append(imageCell.firstChild);
    }
    if (textCell) {
      const body = document.createElement('div');
      body.className = 'recipe-hero-text';
      while (textCell.firstChild) body.append(textCell.firstChild);
      insert.append(body);
    }
  }
  frag.append(media, insert);

  if (statRows.length) {
    const metaStrip = document.createElement('ul');
    metaStrip.className = 'recipe-hero-meta';
    statRows.forEach((row) => {
      const cells = [...row.children];
      const item = document.createElement('li');
      item.className = 'recipe-hero-meta-item';
      moveInstrumentation(row, item);

      const label = document.createElement('span');
      label.className = 'recipe-hero-meta-label';
      label.textContent = cells[0] ? cells[0].textContent.trim() : '';

      const value = document.createElement('span');
      value.className = 'recipe-hero-meta-value';
      value.textContent = cells[1] ? cells[1].textContent.trim() : '';

      item.append(label, value);
      metaStrip.append(item);
    });
    insert.append(metaStrip);
  }

  // optimize the hero image
  const img = media.querySelector('picture > img');
  if (img) {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, true, [{ width: '1200' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  }

  block.textContent = '';
  block.append(frag);
}

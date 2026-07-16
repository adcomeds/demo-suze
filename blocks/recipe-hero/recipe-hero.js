import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Recipe Hero
 * Full-bleed cocktail hero: large image + title/tagline + a meta strip
 * (glassware, prep time, difficulty, servings).
 *
 * Authored rows (recipe-hero model, in field order):
 *   row = image (picture)
 *   row = text  (h1 title + optional tagline)
 *   row = meta  (pipe-separated: "Old-Fashioned | 3 min | Easy | Serves 1")
 *
 * Rows are classified by content shape so a missing meta row degrades
 * gracefully. Meta labels are localized from the page language (derived from
 * the /recipes/<lang>/ path segment, falling back to <html lang>).
 */
const META_LABELS = {
  en: ['Glass', 'Time', 'Difficulty', 'Serves'],
  es: ['Vaso', 'Tiempo', 'Dificultad', 'Raciones'],
  fr: ['Verre', 'Temps', 'Difficulté', 'Personnes'],
};

function getLang() {
  const fromPath = window.location.pathname.match(/\/recipes\/([a-z]{2})\//);
  if (fromPath && META_LABELS[fromPath[1]]) return fromPath[1];
  const htmlLang = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
  return META_LABELS[htmlLang] ? htmlLang : 'en';
}

export default function decorate(block) {
  const labels = META_LABELS[getLang()];
  let imageRow = null;
  let textRow = null;
  const metaValues = [];

  // The decorated block is flat: block > div(row) > [content nodes].
  [...block.children].forEach((row) => {
    const text = row.textContent.trim();
    if (!imageRow && row.querySelector('picture, img')) {
      imageRow = row;
    } else if (text.includes('|')) {
      // meta row: pipe-separated "glass | time | difficulty | serves"
      text.split('|').forEach((part) => {
        const v = part.trim();
        if (v) metaValues.push(v);
      });
    } else if (!textRow && text) {
      // remaining text row = title + tagline
      textRow = row;
    }
  });

  const frag = document.createDocumentFragment();

  // media
  const media = document.createElement('div');
  media.className = 'recipe-hero-media';
  if (imageRow) {
    while (imageRow.firstChild) media.append(imageRow.firstChild);
  }
  frag.append(media);

  // insert: title/tagline + meta strip
  const insert = document.createElement('div');
  insert.className = 'recipe-hero-insert';
  if (textRow) {
    const body = document.createElement('div');
    body.className = 'recipe-hero-text';
    while (textRow.firstChild) body.append(textRow.firstChild);
    insert.append(body);
  }

  if (metaValues.length) {
    const metaStrip = document.createElement('ul');
    metaStrip.className = 'recipe-hero-meta';
    metaValues.forEach((value, i) => {
      const item = document.createElement('li');
      item.className = 'recipe-hero-meta-item';
      const label = document.createElement('span');
      label.className = 'recipe-hero-meta-label';
      label.textContent = labels[i] || '';
      const val = document.createElement('span');
      val.className = 'recipe-hero-meta-value';
      val.textContent = value;
      item.append(label, val);
      metaStrip.append(item);
    });
    insert.append(metaStrip);
  }
  frag.append(insert);

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

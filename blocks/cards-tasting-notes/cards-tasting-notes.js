import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards Tasting Notes — Suze "What does it taste like" product section.
 *
 * Authored as three explicit, distinct item types (picked from the UE "+"
 * picker, not inferred from content shape):
 *   - Bottle Hero  (image, imageAlt, heading)  -> bottle image + frieze heading
 *   - Tasting Note (icon, label, value)        -> icon tile + bold label + value
 *   - Outro        (intro, productLink)        -> intro paragraph + BUY NOW pill
 *
 * Any number of Tasting Note items may appear (e.g. tonic has fewer notes);
 * Bottle Hero and Outro are each expected once but are optional.
 */

/** Classify a row by its authored model (falls back to cell shape when the
 * data-aue-model instrumentation attribute isn't present, e.g. on delivery). */
function classifyRow(row) {
  if (row.dataset.aueModel) return row.dataset.aueModel;
  const cells = [...row.children];
  if (cells.length >= 3) return 'tasting-note-item';
  const hasPicture = cells.some((c) => c.querySelector('picture, img'));
  return hasPicture ? 'tasting-hero-item' : 'tasting-outro-item';
}

/** Build the animated marquee frieze band from a heading text. */
function buildFrieze(text) {
  const band = document.createElement('div');
  band.className = 'cards-tasting-notes-band';

  const track = document.createElement('div');
  track.className = 'cards-tasting-notes-track';

  // two copies of the text set so the -50% translate loops seamlessly
  for (let i = 0; i < 2; i += 1) {
    const set = document.createElement('div');
    set.className = 'cards-tasting-notes-set';
    set.setAttribute('aria-hidden', i > 0 ? 'true' : 'false');
    for (let j = 0; j < 3; j += 1) {
      const span = document.createElement('span');
      span.className = 'cards-tasting-notes-text';
      span.textContent = text;
      set.appendChild(span);
    }
    track.appendChild(set);
  }

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'cards-tasting-notes-pause';
  pauseBtn.setAttribute('aria-label', 'Pause');
  pauseBtn.innerHTML = '<span class="cards-tasting-notes-pause-icon" aria-hidden="true"></span><span class="cards-tasting-notes-pause-label">Pause</span>';
  pauseBtn.addEventListener('click', () => {
    const paused = track.classList.toggle('paused');
    pauseBtn.classList.toggle('is-paused', paused);
    const label = pauseBtn.querySelector('.cards-tasting-notes-pause-label');
    label.textContent = paused ? 'Play' : 'Pause';
    pauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  });

  band.appendChild(pauseBtn);
  band.appendChild(track);
  return band;
}

export default function decorate(block) {
  const rows = [...block.children];

  // buckets
  let headingText = '';
  let bottleRow = null;
  let bottleCell = null;
  const noteRows = [];
  let outroRow = null;

  rows.forEach((row) => {
    const type = classifyRow(row);
    const cells = [...row.children];
    if (type === 'tasting-hero-item') {
      const [imageCell, headingCell] = cells;
      headingText = headingCell ? headingCell.textContent.trim() : '';
      if (imageCell && imageCell.querySelector('picture, img')) {
        bottleRow = row;
        bottleCell = imageCell;
      }
    } else if (type === 'tasting-outro-item') {
      outroRow = row;
    } else {
      noteRows.push(row);
    }
  });

  // ---- build the new structure ----
  const frag = document.createDocumentFragment();

  // 1. frieze band (heading)
  if (headingText) {
    frag.appendChild(buildFrieze(headingText));
  }

  // 2. content wrapper: bottle image (with optional badge) + notes column
  const content = document.createElement('div');
  content.className = 'cards-tasting-notes-content';

  // bottle
  if (bottleCell) {
    const imgBox = document.createElement('div');
    imgBox.className = 'cards-tasting-notes-img-box';
    moveInstrumentation(bottleRow, imgBox);
    while (bottleCell.firstChild) imgBox.append(bottleCell.firstChild);
    // The tonic bottle image (suze_tonic_logo) already embeds the "0%" ring
    // badge, so we only tag the variant for any variant-specific styling.
    const bottleImg = imgBox.querySelector('img');
    if (bottleImg && /tonic/i.test(bottleImg.src + (bottleImg.alt || ''))) {
      imgBox.classList.add('cards-tasting-notes-img-box--tonic');
    }
    content.appendChild(imgBox);
  }

  // data box: notes list + outro
  const dataBox = document.createElement('div');
  dataBox.className = 'cards-tasting-notes-data-box';

  if (noteRows.length) {
    const ul = document.createElement('ul');
    ul.className = 'cards-tasting-notes-list';
    noteRows.forEach((row) => {
      const [iconCell, labelCell, valueCell] = [...row.children];
      const li = document.createElement('li');
      li.className = 'cards-tasting-notes-row';
      moveInstrumentation(row, li);

      const icon = document.createElement('div');
      icon.className = 'cards-tasting-notes-icon';
      if (iconCell) while (iconCell.firstChild) icon.append(iconCell.firstChild);

      const item = document.createElement('div');
      item.className = 'cards-tasting-notes-item';
      const p = document.createElement('p');
      const label = document.createElement('strong');
      label.textContent = labelCell ? `${labelCell.textContent.trim()} :` : '';
      p.append(label, ` ${valueCell ? valueCell.textContent.trim() : ''}`);
      item.append(p);

      li.append(icon, item);
      ul.append(li);
    });
    dataBox.appendChild(ul);
  }

  // outro (intro paragraph + BUY NOW button)
  if (outroRow) {
    const [introCell, linkCell] = [...outroRow.children];
    const outro = document.createElement('div');
    outro.className = 'cards-tasting-notes-outro';
    moveInstrumentation(outroRow, outro);
    if (introCell) while (introCell.firstChild) outro.append(introCell.firstChild);
    const productLink = linkCell ? linkCell.querySelector('a') : null;
    if (productLink) {
      productLink.classList.add('button');
      const buttonContainer = document.createElement('p');
      buttonContainer.className = 'button-container';
      buttonContainer.append(productLink);
      outro.append(buttonContainer);
    }
    dataBox.appendChild(outro);
  }

  content.appendChild(dataBox);
  frag.appendChild(content);

  // optimize small icon images inside the notes
  frag.querySelectorAll('.cards-tasting-notes-icon picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '60' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(frag);
}

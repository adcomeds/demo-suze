import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards Tasting Notes — Suze "What does it taste like" product section.
 *
 * The block is authored as a list of "Card" items (image + rich text). Cards
 * are not typed in the published markup, so each row is classified by the
 * shape of its text cell:
 *   - heading (h1-h6) -> the bottle card: image is the tall product bottle,
 *                        the heading becomes the animated white-outline frieze
 *   - <strong>/<b>    -> a tasting note: yellow icon tile + bold label + value
 *   - link only       -> the outro: intro paragraph + black "BUY NOW" pill
 *
 * Rows may be missing on some pages (e.g. tonic has fewer notes); each branch
 * guards gracefully.
 */

/**
 * Classify a card row by content shape (comments do not survive the xwalk
 * publish round-trip, so we key off the DOM, not markers):
 *   - hero  : text cell has a heading -> bottle image + frieze heading
 *   - note  : text cell has a <strong> label -> icon + label + value
 *   - outro : text cell has a link, no heading/strong -> intro + BUY NOW
 */
function classifyRow(row) {
  const cells = [...row.children];
  const textCell = cells[1] || cells[0];
  if (textCell && textCell.querySelector('h1, h2, h3, h4, h5, h6')) return 'hero';
  if (textCell && textCell.querySelector('strong, b')) return 'note';
  if (textCell && textCell.querySelector('a')) return 'outro';
  return 'note';
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
  let bottleCell = null;
  const noteRows = [];
  let outroCell = null;

  rows.forEach((row) => {
    const cells = [...row.children];
    const type = classifyRow(row);
    if (type === 'hero') {
      // bottle image + frieze heading
      const [firstCell] = cells;
      const h = (cells[1] || row).querySelector('h1, h2, h3, h4, h5, h6');
      headingText = (h ? h.textContent : row.textContent).trim();
      if (firstCell && firstCell.querySelector('picture, img')) bottleCell = firstCell;
    } else if (type === 'outro') {
      // intro paragraph + BUY NOW live in the text cell
      outroCell = cells[1] || cells[0] || row;
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
      const li = document.createElement('li');
      li.className = 'cards-tasting-notes-row';
      moveInstrumentation(row, li);
      while (row.firstElementChild) li.append(row.firstElementChild);
      // 2-cell note row: cell 1 = icon, cell 2 = label + value
      const kids = [...li.children];
      if (kids[0]) kids[0].className = 'cards-tasting-notes-icon';
      if (kids[1]) kids[1].className = 'cards-tasting-notes-item';
      ul.append(li);
    });
    dataBox.appendChild(ul);
  }

  // outro (intro paragraph + BUY NOW button)
  if (outroCell) {
    const outro = document.createElement('div');
    outro.className = 'cards-tasting-notes-outro';
    while (outroCell.firstChild) outro.append(outroCell.firstChild);
    const ctaLink = outro.querySelector('p > a');
    if (ctaLink && !ctaLink.classList.contains('button')) {
      ctaLink.classList.add('button');
      ctaLink.closest('p').classList.add('button-container');
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

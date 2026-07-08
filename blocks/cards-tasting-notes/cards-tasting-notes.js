import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards Tasting Notes — Suze "What does it taste like" product section.
 *
 * Authored as a container block with block-level fields plus repeatable
 * "Tasting Note" items (see _cards-tasting-notes.json):
 *   Block-level (each renders as a single-cell leading row, in model order):
 *     - heading      -> animated white-outline frieze marquee across the top
 *     - image (+alt) -> the tall product bottle image (center-left)
 *     - intro        -> intro paragraph in the outro
 *     - cta (+text)  -> black "BUY NOW" pill in the outro
 *   Item rows (3 cells each): icon image, label, value
 *     -> yellow rounded icon tile + bold label + value text
 *
 * Block-level rows are identified by their content (single cell: a picture is
 * the bottle, a link is the CTA, remaining text rows are heading then intro),
 * so empty/omitted fields degrade gracefully. Multi-cell rows are notes.
 */

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

  // Split rows: multi-cell rows are tasting-note items; single-cell rows are
  // block-level fields, classified by their content.
  let bottleCell = null;
  let ctaCell = null;
  const textCells = []; // single-cell text rows in order: [heading, intro]
  const noteRows = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      noteRows.push(row);
      return;
    }
    const cell = cells[0] || row;
    if (cell.querySelector('picture, img')) bottleCell = cell;
    else if (cell.querySelector('a')) ctaCell = cell;
    else textCells.push(cell);
  });

  const headingCell = textCells[0] || null;
  const introCell = textCells[1] || null;
  const headingText = headingCell ? headingCell.textContent.trim() : '';

  const frag = document.createDocumentFragment();

  // 1. frieze band (heading)
  if (headingText) frag.appendChild(buildFrieze(headingText));

  // 2. content wrapper: bottle image (with optional badge) + notes column
  const content = document.createElement('div');
  content.className = 'cards-tasting-notes-content';

  // bottle
  if (bottleCell && bottleCell.querySelector('picture, img')) {
    const imgBox = document.createElement('div');
    imgBox.className = 'cards-tasting-notes-img-box';
    while (bottleCell.firstChild) imgBox.append(bottleCell.firstChild);
    // The tonic bottle image already embeds the "0%" ring badge, so we only tag
    // the variant for any variant-specific styling.
    const bottleImg = imgBox.querySelector('img');
    if (bottleImg && /tonic/i.test(bottleImg.src + (bottleImg.alt || ''))) {
      imgBox.classList.add('cards-tasting-notes-img-box--tonic');
    }
    content.appendChild(imgBox);
  }

  // data box: notes list + outro
  const dataBox = document.createElement('div');
  dataBox.className = 'cards-tasting-notes-data-box';

  // notes list (item rows: icon, label, value)
  if (noteRows.length) {
    const ul = document.createElement('ul');
    ul.className = 'cards-tasting-notes-list';
    noteRows.forEach((row) => {
      const li = document.createElement('li');
      li.className = 'cards-tasting-notes-row';
      moveInstrumentation(row, li);

      const cells = [...row.children];
      const [iconCell, labelCell, valueCell] = cells;

      if (iconCell) {
        iconCell.className = 'cards-tasting-notes-icon';
        li.append(iconCell);
      }

      const item = document.createElement('div');
      item.className = 'cards-tasting-notes-item';
      const labelText = labelCell ? labelCell.textContent.trim() : '';
      if (labelText) {
        const strong = document.createElement('strong');
        strong.textContent = labelText;
        item.append(strong);
      }
      if (valueCell) {
        if (valueCell.firstElementChild) {
          while (valueCell.firstChild) item.append(valueCell.firstChild);
        } else if (valueCell.textContent.trim()) {
          const p = document.createElement('p');
          p.textContent = valueCell.textContent.trim();
          item.append(p);
        }
      }
      li.append(item);
      ul.append(li);
    });
    dataBox.appendChild(ul);
  }

  // outro (intro paragraph + BUY NOW button)
  if ((introCell && introCell.textContent.trim()) || ctaCell) {
    const outro = document.createElement('div');
    outro.className = 'cards-tasting-notes-outro';
    if (introCell) while (introCell.firstChild) outro.append(introCell.firstChild);
    const ctaLink = ctaCell ? ctaCell.querySelector('a') : null;
    if (ctaLink) {
      ctaLink.classList.add('button');
      const p = document.createElement('p');
      p.className = 'button-container';
      p.append(ctaLink);
      outro.append(p);
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

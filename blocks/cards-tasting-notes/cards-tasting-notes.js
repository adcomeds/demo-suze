import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards Tasting Notes — Suze "What does it taste like" product section.
 *
 * Authored as a container block whose children are one of three explicit
 * component types (see _cards-tasting-notes.json):
 *   - Bottle       -> Heading (frieze title) + Bottle Image
 *   - Tasting Note -> Icon + Label + Value   (repeatable)
 *   - Outro        -> Intro Text + Button Link
 *
 * Component types are not encoded in the published markup, so each row is
 * classified by the shape of its cells:
 *   - a row whose image is in cell 0 with >=3 cells -> Tasting Note (icon, label, value)
 *   - any other row containing an image             -> Bottle (heading, image)
 *   - a row with no image                           -> Outro (intro, button)
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

/** Classify an authored row into 'bottle' | 'note' | 'outro' by content shape. */
function classifyRow(row) {
  const cells = [...row.children];
  const hasImage = !!row.querySelector('picture, img');
  if (!hasImage) return 'outro';
  const imageInFirstCell = cells[0] && cells[0].querySelector('picture, img');
  if (imageInFirstCell && cells.length >= 3) return 'note';
  return 'bottle';
}

export default function decorate(block) {
  const rows = [...block.children];

  let headingText = '';
  let bottleCell = null;
  let bottleRow = null;
  const noteRows = [];
  let outroRow = null;

  rows.forEach((row) => {
    const type = classifyRow(row);
    const cells = [...row.children];
    if (type === 'bottle') {
      bottleRow = row;
      bottleCell = cells.find((c) => c.querySelector('picture, img')) || null;
      const headingCell = cells.find((c) => !c.querySelector('picture, img'));
      if (headingCell) headingText = headingCell.textContent.trim();
    } else if (type === 'note') {
      noteRows.push(row);
    } else {
      outroRow = row;
    }
  });

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
    if (bottleRow) moveInstrumentation(bottleRow, imgBox);
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
  if (outroRow) {
    const outro = document.createElement('div');
    outro.className = 'cards-tasting-notes-outro';
    moveInstrumentation(outroRow, outro);
    const cells = [...outroRow.children];
    const introCell = cells[0];
    const ctaCell = cells[1];
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

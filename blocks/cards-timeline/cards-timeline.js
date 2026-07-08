import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards Timeline
 * A chronological history timeline. Each entry (card) has a year label, an
 * image, a heading and a descriptive paragraph. A year-navigation list is
 * generated from the entries; clicking a year smooth-scrolls to its entry.
 * Entries alternate image-left / image-right down the timeline.
 *
 * Authored structure per row:
 *   div[0] = year label (field:year, e.g. <p>1885</p>)
 *   div[1] = image (field:image, <picture>)
 *   div[2] = text  (field:text, <h2>year</h2><p>...</p>)
 */
export default function decorate(block) {
  const nav = document.createElement('nav');
  nav.className = 'cards-timeline-nav';
  const navList = document.createElement('ul');
  navList.className = 'cards-timeline-nav-list';
  nav.append(navList);

  const list = document.createElement('ul');
  list.className = 'cards-timeline-list';

  [...block.children].forEach((row, index) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    li.className = 'cards-timeline-item';
    li.id = `year-${index + 1}`;
    li.classList.add(index % 2 === 0 ? 'image-left' : 'image-right');

    const cells = [...row.children];

    // Derive the year label from the dedicated year cell (falls back to heading).
    let year = `year-${index + 1}`;
    const yearCell = cells[0];
    if (yearCell) {
      const yc = yearCell.textContent.trim();
      if (yc) year = yc;
      yearCell.remove();
    }

    // Remaining cells: image + text.
    [...row.children].forEach((div) => {
      if (div.querySelector('picture, img')) {
        div.className = 'cards-timeline-item-image';
      } else {
        div.className = 'cards-timeline-item-body';
      }
      li.append(div);
    });

    // Fall back to heading text if there was no year cell.
    if (year.startsWith('year-')) {
      const heading = li.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) year = heading.textContent.trim();
    }

    const navItem = document.createElement('li');
    const navLink = document.createElement('a');
    navLink.href = `#year-${index + 1}`;
    navLink.className = 'cards-timeline-nav-link';
    navLink.textContent = year;
    navLink.addEventListener('click', (e) => {
      e.preventDefault();
      li.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    navItem.append(navLink);
    navList.append(navItem);

    list.append(li);
  });

  list.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '983' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(nav);
  block.append(list);
}

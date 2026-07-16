import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Recipe Steps
 * A numbered list of preparation steps. Each authored row is one step
 * (richtext). Renders as an ordered list with large brand-styled numbers.
 */
export default function decorate(block) {
  const list = document.createElement('ol');
  list.className = 'recipe-steps-list';

  [...block.children].forEach((row) => {
    const cell = row.firstElementChild || row;
    const item = document.createElement('li');
    item.className = 'recipe-steps-item';
    moveInstrumentation(row, item);

    const body = document.createElement('div');
    body.className = 'recipe-steps-body';
    while (cell.firstChild) body.append(cell.firstChild);
    item.append(body);
    list.append(item);
  });

  block.textContent = '';
  block.append(list);
}

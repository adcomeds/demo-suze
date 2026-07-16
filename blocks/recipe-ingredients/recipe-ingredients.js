import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Recipe Ingredients
 * A list of ingredient rows, each = quantity + ingredient name.
 *
 * Authored structure per row:
 *   div[0] = quantity   (e.g. "1 part")
 *   div[1] = ingredient (e.g. "Suze")
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'recipe-ingredients-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const item = document.createElement('li');
    item.className = 'recipe-ingredients-item';
    moveInstrumentation(row, item);

    const quantity = document.createElement('span');
    quantity.className = 'recipe-ingredients-qty';
    quantity.textContent = cells[0] ? cells[0].textContent.trim() : '';

    const name = document.createElement('span');
    name.className = 'recipe-ingredients-name';
    name.textContent = cells[1] ? cells[1].textContent.trim() : '';

    item.append(quantity, name);
    list.append(item);
  });

  block.textContent = '';
  block.append(list);
}

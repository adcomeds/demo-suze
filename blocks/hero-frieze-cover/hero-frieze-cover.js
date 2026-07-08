/**
 * Hero Frieze Cover
 * A full-bleed rounded cover image with an overlaid orange "frieze" insert band
 * anchored bottom-left, containing the title and a short description plus two
 * decorative corner ornaments that blend the band into the rounded image.
 * Source: .history__header on suze.com/suze-story.
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  const pictureRow = picture ? [...block.children].find((r) => r.contains(picture)) : null;

  // Build the rounded media card from the picture (a direct child of the block).
  const media = document.createElement('div');
  media.className = 'hero-frieze-cover-media';
  if (picture) media.append(picture);

  // Build the overlaid orange insert band from the remaining (text) content.
  const insert = document.createElement('div');
  insert.className = 'hero-frieze-cover-insert';

  [...block.children].forEach((row) => {
    // Skip the row that owned the picture (now moved into the media card).
    if (row === pictureRow) {
      row.remove();
      return;
    }
    while (row.firstElementChild) insert.append(row.firstElementChild);
    row.remove();
  });

  // Decorative concave corner ornaments that blend the orange band into the
  // rounded image (before = external top-left, after = notch at top-right).
  const before = document.createElement('span');
  before.className = 'hero-frieze-cover-corner before';
  before.setAttribute('aria-hidden', 'true');
  const after = document.createElement('span');
  after.className = 'hero-frieze-cover-corner after';
  after.setAttribute('aria-hidden', 'true');
  insert.prepend(before);
  insert.append(after);

  block.append(media);
  block.append(insert);
}

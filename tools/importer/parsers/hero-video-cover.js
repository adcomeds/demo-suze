/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-video-cover. Base: hero.
 * Library convention: hero — block-name row + background row + content row (<= 3 rows total).
 * Here the background is a video (this variant swaps the base image field for a `video` field),
 * so: row 2 = background video, row 3 = content. Total 3 rows incl. block name.
 * Source: https://www.suze.com/product/suze-loriginale/ (product section 1) and
 *         https://www.suze.com/product/suze-tonic-0/ (H1 only, no description, different video).
 * Model (blocks/hero-video-cover/_hero-video-cover.json):
 *   video (aem-content, background video URL), text (richtext).
 *   Video URL is taken from the <video><source src>; emitted as a link (decorate() reads the href).
 *   Text = H1 title + optional subtitle paragraph.
 */
export default function parse(element, { document }) {
  // INPUT extraction (validated against block-context/hero-video-cover/source.html)
  const source = element.querySelector('.product__header__video source[src], video source[src], video[src]');
  const videoUrl = source ? (source.getAttribute('src') || source.src) : '';
  const heading = element.querySelector('.product__header__insert__title, h1, h2');
  // Scope the description to the insert and exclude the mobile duplicate so we don't
  // accidentally capture the video "Pause" button text (a <p> earlier in DOM order).
  const desc = element.querySelector('.product__header__insert .product__header__insert__description:not(.mobile), .product__header__insert__description:not(.mobile)');

  // Empty-block guard
  if (!videoUrl && !heading) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background video URL (field:video) as a link (aem-content)
  const videoFrag = document.createDocumentFragment();
  videoFrag.appendChild(document.createComment(' field:video '));
  if (videoUrl) {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.textContent = videoUrl;
    videoFrag.appendChild(a);
  }
  cells.push([videoFrag]);

  // Row 3: text richtext (field:text) — H1 + optional subtitle
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));
  if (heading) textFrag.appendChild(heading.cloneNode(true));
  if (desc) textFrag.appendChild(desc.cloneNode(true));
  cells.push([textFrag]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-video-cover', cells });
  element.replaceWith(block);
}

/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-cover-player. Base: hero.
 * Source: https://www.suze.com/ (homepage section 4) and
 *         https://www.suze.com/product/suze-loriginale/ (product section 5 reuse: H3 title, no frieze, no CTA).
 * Library base (hero) is image + content; this variant EXTENDS the model with an authorable
 * `video` field (see blocks/hero-cover-player/_hero-cover-player.json), so it emits an extra row.
 * Model fields: image (reference, poster) + imageAlt (collapsed), video (aem-content link), text (richtext).
 * Rows (one column each): image, video, text.
 *   Optional frieze heading (H2) and optional CTA are folded into the `text` richtext cell.
 *   The video URL is taken from the play button's data-video attribute.
 */
export default function parse(element, { document }) {
  // INPUT extraction (validated against block-context/hero-cover-player/source.html)
  const frieze = element.querySelector('.coverPlayer__frieze__infinite-frieze__title, .frieze h2, .frieze h3');
  const poster = element.querySelector('.coverPlayer__content__media__image, .coverPlayer__content__media img, img');
  // Video URL: prefer the play button's data-video, else any descendant that
  // exposes a YouTube URL (data-src / iframe src) within this section.
  const playBtn = element.querySelector('.coverPlayer__content__show-video[data-video], [data-video]');
  let videoUrl = playBtn ? playBtn.getAttribute('data-video') : '';
  if (!videoUrl) {
    const ytSrc = element.querySelector('[data-src*="youtu"], iframe[src*="youtu"], a[href*="youtu"]');
    if (ytSrc) {
      videoUrl = ytSrc.getAttribute('data-src')
        || ytSrc.getAttribute('src')
        || ytSrc.getAttribute('href')
        || '';
    }
  }
  const insert = element.querySelector('.coverPlayer__content__insert');
  const scope = insert || element;
  const title = scope.querySelector('h3, h4');
  const desc = scope.querySelector('.coverPlayer__content__insert__description, p');
  const cta = element.querySelector('.coverPlayer__content__insert a.cta, .coverPlayer__content__insert a, a.cta');

  // Empty-block guard
  if (!poster && !desc) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row: poster image (field:image; imageAlt collapses into the <img alt>)
  const imageFrag = document.createDocumentFragment();
  if (poster) {
    imageFrag.appendChild(document.createComment(' field:image '));
    imageFrag.appendChild(poster);
    cells.push([imageFrag]);
  } else {
    cells.push(['']);
  }

  // Row: video URL (field:video) as a link (aem-content)
  const videoFrag = document.createDocumentFragment();
  videoFrag.appendChild(document.createComment(' field:video '));
  if (videoUrl) {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.textContent = videoUrl;
    videoFrag.appendChild(a);
  }
  cells.push([videoFrag]);

  // Row: text richtext (field:text) — optional frieze heading + optional title + description + optional CTA
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));
  if (frieze) {
    const h = document.createElement('h2');
    h.textContent = frieze.textContent;
    textFrag.appendChild(h);
  }
  if (title) textFrag.appendChild(title.cloneNode(true));
  if (desc) textFrag.appendChild(desc.cloneNode(true));
  if (cta) {
    const p = document.createElement('p');
    p.appendChild(cta.cloneNode(true));
    textFrag.appendChild(p);
  }
  cells.push([textFrag]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-cover-player', cells });

  // Preserve a genuine section-level heading (e.g. product section 5 "Suze's elaboration").
  // Such a heading is an <h2> that sits at the section/coverPlayer wrapper level — it is NOT
  // inside the coverPlayer's inner content or frieze wrappers (which hold the block's own
  // title/frieze). The homepage section 4 has no such heading (its "Suze story" is the frieze),
  // so this only fires when a real section-level H2 exists.
  const sectionHeading = Array.from(element.querySelectorAll('h2')).find((h) => (
    !h.closest('[class*="coverPlayer__content"], [class*="coverPlayer__frieze"]')
    && !h.closest('[class*="frieze"]')
  ));
  if (sectionHeading) {
    element.replaceWith(sectionHeading.cloneNode(true), block);
  } else {
    element.replaceWith(block);
  }
}

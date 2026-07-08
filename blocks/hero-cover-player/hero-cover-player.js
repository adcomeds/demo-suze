/**
 * Hero Cover Player ("Suze story" cover-player)
 * Structure authored as three rows:
 *   1. image cell  -> poster (founder image, contains the yellow maze / name / 1889 baked in)
 *   2. video cell  -> a link whose href is the YouTube URL
 *   3. text cell   -> h2 (frieze marquee text) + intro paragraph + CTA link
 *
 * Renders:
 *   - an animated marquee "frieze" band from the h2 (columns-frieze visual pattern)
 *   - a yellow media panel with the poster and a centered circular play button that
 *     swaps in the embedded YouTube video on click
 *   - an orange "insert" text box overlapping the panel, with the intro + black pill CTA
 *   - a "Read the text version" link beneath the panel
 */
export default function decorate(block) {
  const rows = [...block.children];

  // ---- Identify the cells -------------------------------------------------
  const videoAnchor = [...block.querySelectorAll('a')].find((a) => (
    /youtube\.com|youtu\.be|vimeo\.com|\.mp4($|\?)/i.test(a.href)
  ));
  const videoUrl = videoAnchor ? videoAnchor.href : '';

  const picture = block.querySelector('picture');
  const heading = block.querySelector('h1, h2, h3');

  // Text row = the row that holds the heading (frieze text).
  const textRow = rows.find((r) => r.contains(heading));
  const textCell = textRow ? textRow.querySelector(':scope > div') || textRow : null;

  // ---- Build the frieze band ----------------------------------------------
  if (heading) {
    const text = heading.textContent.trim();

    const band = document.createElement('div');
    band.className = 'hero-cover-player-band';

    const track = document.createElement('div');
    track.className = 'hero-cover-player-track';

    for (let i = 0; i < 2; i += 1) {
      const set = document.createElement('div');
      set.className = 'hero-cover-player-set';
      set.setAttribute('aria-hidden', i > 0 ? 'true' : 'false');
      for (let j = 0; j < 3; j += 1) {
        const span = document.createElement('span');
        span.className = 'hero-cover-player-text';
        span.textContent = text;
        set.appendChild(span);
      }
      track.appendChild(set);
    }

    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'hero-cover-player-pause';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.innerHTML = '<span class="hero-cover-player-pause-icon" aria-hidden="true"></span><span class="hero-cover-player-pause-label">Pause</span>';
    pauseBtn.addEventListener('click', () => {
      const paused = track.classList.toggle('paused');
      pauseBtn.classList.toggle('is-paused', paused);
      const label = pauseBtn.querySelector('.hero-cover-player-pause-label');
      label.textContent = paused ? 'Play' : 'Pause';
      pauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    });

    band.appendChild(pauseBtn);
    band.appendChild(track);

    // keep a visually-hidden heading for a11y
    heading.classList.add('hero-cover-player-sr-heading');
    block.insertBefore(band, block.firstElementChild);
  }

  // ---- Build the content wrapper (media panel + insert) -------------------
  const content = document.createElement('div');
  content.className = 'hero-cover-player-content';

  // Media panel (yellow) with the poster + play button.
  const media = document.createElement('div');
  media.className = 'hero-cover-player-media';

  const toEmbed = (url) => {
    const yt = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{6,15})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
    return url;
  };

  if (picture) {
    picture.classList.add('hero-cover-player-poster');
    media.appendChild(picture);
  }

  if (videoUrl && picture) {
    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'hero-cover-player-play';
    playButton.setAttribute('aria-label', 'Play video');
    playButton.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.className = 'hero-cover-player-iframe';
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.src = toEmbed(videoUrl);
      picture.replaceWith(iframe);
      playButton.remove();
    });
    media.appendChild(playButton);
  }

  // Insert box (orange) with intro paragraph + CTA.
  const insert = document.createElement('div');
  insert.className = 'hero-cover-player-insert';

  if (textCell) {
    [...textCell.children].forEach((el) => {
      if (el === heading) return;
      const anchor = el.matches('a') ? el : el.querySelector('a');
      if (anchor && anchor !== videoAnchor) {
        anchor.classList.add('button');
        insert.appendChild(el);
      } else if (el.tagName === 'P') {
        el.classList.add('hero-cover-player-description');
        insert.appendChild(el);
      } else {
        insert.appendChild(el);
      }
    });
  }

  content.append(media, insert);

  // "Read the text version" link (optional; only if authored, otherwise omit).
  // Reuse the CTA anchor's description target if present.
  const readVersion = document.createElement('button');
  readVersion.type = 'button';
  readVersion.className = 'hero-cover-player-read-text';
  readVersion.textContent = 'Read the text version';
  const description = insert.querySelector('.hero-cover-player-description');
  readVersion.addEventListener('click', () => {
    if (description) description.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ---- Replace the authored rows with the composed structure --------------
  // Remove the now-consumed video row and the original text/image rows.
  rows.forEach((r) => {
    if (r.classList && r.classList.contains('hero-cover-player-band')) return;
    r.remove();
  });

  block.appendChild(content);
  block.appendChild(readVersion);
}

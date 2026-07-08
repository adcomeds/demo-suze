/**
 * Hero Video Cover
 * A full-bleed rounded cover with an autoplay/loop/muted background video and
 * an overlaid orange "insert" panel (title + description) anchored bottom-left,
 * plus a Pause/Play toggle for the background video.
 *
 * Authored structure (2 cells):
 *   cell 1 (video field): <p><a href="...mov">...</a></p>  OR plain text URL
 *   cell 2 (text field):  <h1>...</h1><p>...</p>
 */
export default function decorate(block) {
  const rows = [...block.children];

  // --- Locate the authored video URL ---
  const videoAnchor = [...block.querySelectorAll('a')].find((a) => (
    /\.(mp4|mov|webm)($|\?)|youtube\.com|youtu\.be|vimeo\.com/i.test(a.href)
  ));
  let videoUrl = videoAnchor ? videoAnchor.href : '';
  if (!videoUrl) {
    const textUrl = [...block.querySelectorAll('p')]
      .map((p) => p.textContent.trim())
      .find((t) => /^https?:\/\/\S+\.(mp4|mov|webm)(\?\S*)?$/i.test(t));
    if (textUrl) videoUrl = textUrl;
  }

  // --- Identify the text cell (holds h1 + description) ---
  const textCell = [...block.querySelectorAll(':scope > div > div')]
    .find((cell) => cell.querySelector('h1, h2, p') && !cell.querySelector('a'));

  // --- Remove the raw video reference row (direct child of block) ---
  const videoRow = videoAnchor
    ? rows.find((r) => r.contains(videoAnchor))
    : rows.find((r) => r.textContent.trim() === videoUrl);
  if (videoRow && videoRow.parentElement === block) videoRow.remove();

  // --- Build the rounded media cover with a background video ---
  const media = document.createElement('div');
  media.className = 'hero-video-cover-media';

  if (videoUrl) {
    const video = document.createElement('video');
    video.className = 'hero-video-cover-video';
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'auto');

    const source = document.createElement('source');
    source.src = videoUrl;
    source.type = /\.webm(\?|$)/i.test(videoUrl) ? 'video/webm' : 'video/mp4';
    video.append(source);
    media.append(video);
    video.play?.().catch(() => {});

    // --- Pause / Play toggle button ---
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hero-video-cover-toggle';
    button.setAttribute('aria-label', 'Pause');
    button.innerHTML = '<span class="hero-video-cover-toggle-icon" aria-hidden="true"></span><span class="hero-video-cover-toggle-label">Pause</span>';

    const setState = (playing) => {
      button.classList.toggle('is-paused', !playing);
      const label = playing ? 'Pause' : 'Play';
      button.setAttribute('aria-label', label);
      button.querySelector('.hero-video-cover-toggle-label').textContent = label;
    };

    button.addEventListener('click', () => {
      if (video.paused) {
        video.play?.().catch(() => {});
        setState(true);
      } else {
        video.pause();
        setState(false);
      }
    });

    media.append(button);
  }

  block.prepend(media);

  // --- Style the overlaid text as the orange "insert" panel ---
  if (textCell) {
    textCell.classList.add('hero-video-cover-insert');
  }
}

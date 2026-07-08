export default function decorate(block) {
  const row = block.firstElementChild;
  const cols = row ? [...row.children] : [];
  block.classList.add(`columns-frieze-${cols.length}-cols`);

  // setup image columns
  cols.forEach((col) => {
    const pic = col.querySelector('picture');
    if (pic) {
      const picWrapper = pic.closest('div');
      if (picWrapper && picWrapper.children.length === 1) {
        picWrapper.classList.add('columns-frieze-img-col');
      }
    }
  });

  // ensure the standalone CTA link renders as a button (black pill)
  const textCol = cols.find((c) => c.querySelector('h2, p'));
  const ctaLink = textCol && textCol.querySelector('p > a');
  if (ctaLink && !ctaLink.classList.contains('button')) {
    ctaLink.classList.add('button');
    ctaLink.closest('p').classList.add('button-container');
  }

  // build the animated marquee frieze band from the heading text
  const heading = block.querySelector('h2');
  if (heading) {
    const text = heading.textContent.trim();

    const band = document.createElement('div');
    band.className = 'columns-frieze-band';

    const track = document.createElement('div');
    track.className = 'columns-frieze-track play';

    // two copies of the text set so the -50% translate loops seamlessly
    for (let i = 0; i < 2; i += 1) {
      const set = document.createElement('div');
      set.className = 'columns-frieze-set';
      set.setAttribute('aria-hidden', i > 0 ? 'true' : 'false');
      // repeat the text enough times to fill a set wider than the viewport
      for (let j = 0; j < 3; j += 1) {
        const span = document.createElement('span');
        span.className = 'columns-frieze-text';
        span.textContent = text;
        set.appendChild(span);
      }
      track.appendChild(set);
    }

    // pause / play control
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'columns-frieze-pause';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.innerHTML = '<span class="columns-frieze-pause-icon" aria-hidden="true"></span><span class="columns-frieze-pause-label">Pause</span>';
    pauseBtn.addEventListener('click', () => {
      const paused = track.classList.toggle('paused');
      pauseBtn.classList.toggle('is-paused', paused);
      const label = pauseBtn.querySelector('.columns-frieze-pause-label');
      label.textContent = paused ? 'Play' : 'Pause';
      pauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    });

    band.appendChild(pauseBtn);
    band.appendChild(track);

    // replace the visible heading with the band (keep a visually-hidden h2 for a11y)
    heading.classList.add('columns-frieze-sr-heading');
    heading.setAttribute('aria-hidden', 'false');
    heading.style.position = 'absolute';
    heading.style.width = '1px';
    heading.style.height = '1px';
    heading.style.overflow = 'hidden';
    heading.style.clip = 'rect(0 0 0 0)';
    heading.style.clipPath = 'inset(50%)';
    heading.style.whiteSpace = 'nowrap';

    // insert band at the very top of the block
    block.insertBefore(band, block.firstElementChild);
  }
}

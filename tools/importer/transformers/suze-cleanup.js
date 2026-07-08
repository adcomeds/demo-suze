/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Suze site-wide cleanup.
 *
 * Removes non-authorable site chrome and interstitials so the import contains
 * only page-level authorable content (the <main> wrapper: div.homepage /
 * div.product / div.history and their <section> content).
 *
 * All selectors are taken from the captured Suze DOM / migration metadata:
 *  - Age gate overlay:        #pr_age_gate            (metadata.json accessNotes.ageGate)
 *  - Didomi cookie consent:   #didomi-host, .didomi-* (metadata.json accessNotes.cookieConsent)
 *  - Site header / nav:       header.header
 *  - Site footer:             footer.footer
 *  - Language switcher:       .language-switcher, [class*="lang-switch"]
 *  - Modals container:        #modals, .modal
 *
 * The #modals / .modal nodes hold the cover-player video URLs, but those URLs
 * are already captured inline in the block source HTML (data-video attributes)
 * and in metadata.json's video mapping, so the modal nodes themselves are
 * non-authorable and safe to remove.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // The cover-player YouTube URL lives inside the section's video modal
    // (.modal.video > .youtube-iframe[data-src="https://youtu.be/..."]). The
    // modal chrome itself is non-authorable and removed below, but we need the
    // URL for the hero-cover-player `video` field, so hoist the youtube-iframe
    // up to its containing <section> before the modal is stripped.
    element.querySelectorAll('.youtube-iframe[data-src*="youtu"]').forEach((yt) => {
      const section = yt.closest('section');
      if (section) section.appendChild(yt);
    });

    // Interstitials / overlays that block or pollute block parsing.
    WebImporter.DOMUtils.remove(element, [
      '#pr_age_gate',            // age-gate overlay
      '#didomi-host',            // Didomi cookie consent host
      '[id^="didomi"]',          // Didomi injected nodes
      '[class^="didomi"]',       // Didomi styling containers
      '[class*="didomi-"]',      // Didomi utility classes
      '#modals',                 // modal container (video URLs captured inline)
      '.modal',                  // individual modal nodes (video / text-version)
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable global site chrome.
    WebImporter.DOMUtils.remove(element, [
      'header.header',                 // site header / nav
      'footer.footer',                 // site footer
      '.language-switcher',            // language switcher widget
      '[class*="lang-switch"]',        // language switcher (alt naming)
      'noscript',
      'link',
      'iframe',
    ]);
  }
}

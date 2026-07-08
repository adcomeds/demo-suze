/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Suze section breaks + section metadata.
 *
 * Driven by payload.template.sections (from page-templates.json). Every Suze
 * template has 2+ sections, each mapping to one EDS section:
 *   - homepage:     4 sections (home-3 "How to drink it?" -> style "orange")
 *   - product-page: 5 sections (prod-3 "How to enjoy Suze?" and
 *                               prod-5 "Suze's elaboration" -> style "orange")
 *   - suze-story:   2 sections (no styles)
 *
 * For each section (processed in reverse so DOM insertions don't shift the
 * elements still to be located):
 *   - If section.style is set, append a Section Metadata block after the
 *     section element (style row).
 *   - If the section is not the first, insert an <hr> section break before it.
 *
 * Section selectors come from the captured Suze DOM (page-templates.json /
 * page-structure.json). Selectors may be a string or an array of fallback
 * selectors (suze-story provides both a "#main >" and a "main .history >"
 * variant) — the first matching selector wins.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

function tryQuery(scope, sel) {
  if (!sel) return null;
  try {
    return scope.querySelector(sel);
  } catch (e) {
    return null;
  }
}

function resolveSectionElement(element, selector) {
  const selectors = Array.isArray(selector) ? selector : [selector];
  for (const sel of selectors) {
    if (!sel) continue;

    // Template selectors are anchored at #main (e.g.
    // "#main > div.homepage > section.section:nth-child(1)"). The transformer
    // receives the <main> element itself, so #main is not a descendant match.
    // Build main-relative variants:
    //   1. ":scope > div.homepage > section..." (strip the "#main >" anchor)
    //   2. the tail after the wrapper div ("section.section:nth-child(1)")
    //      searched under main (looser, survives extra wrappers).
    const scopeVariant = sel.replace(/^#?main\s*>?\s*/i, ':scope > ');
    const stripped = sel.replace(/^#?main\s*>?\s*/i, '');
    // Tail after the first "> section" so we match the section regardless of
    // the intermediate wrapper (div.homepage / div.product / div.history).
    const sectionTailMatch = stripped.match(/(section[^>]*(?:>.*)?)$/i);
    const sectionTail = sectionTailMatch ? sectionTailMatch[1].trim() : null;

    const candidates = [sel, scopeVariant, stripped, sectionTail];
    for (const candidate of candidates) {
      const found = tryQuery(element, candidate);
      if (found) return found;
    }
  }
  return null;
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];
    if (sections.length < 2) return;

    const document = element.ownerDocument;

    // Reverse order so inserting <hr>/metadata before earlier work doesn't
    // invalidate selectors for sections not yet processed.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const sectionEl = resolveSectionElement(element, section.selector);
      if (!sectionEl) continue;

      // Section Metadata block for styled sections.
      if (section.style) {
        const metaBlock = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        sectionEl.after(metaBlock);
      }

      // Section break before every non-first section.
      if (i > 0) {
        sectionEl.before(document.createElement('hr'));
      }
    }
  }
}

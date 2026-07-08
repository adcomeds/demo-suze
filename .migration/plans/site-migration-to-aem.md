# Suze.com → AEM Edge Delivery Services Migration Plan

## Overview
Migrate four pages from `www.suze.com` into this AEM Edge Delivery Services **crosswalk (xwalk / Universal Editor)** project, with pixel-perfect fidelity to the source, external source images/videos used as-is, maximum reuse of existing blocks, and all text authorable.

**Pages in scope:**
1. `https://www.suze.com/` — Homepage
2. `https://www.suze.com/product/suze-loriginale/` — Product detail page (standard content migration)
3. `https://www.suze.com/product/suze-tonic-0/` — Product detail page (standard content migration)
4. `https://www.suze.com/suze-story/` — Brand story page

**Plus:** Header (nav) and Footer built from suze.com — the current repo versions are still AEM boilerplate and will be replaced.

## Key Findings & Decisions
- **`docs/migration-learnings.yaml` does not exist** anywhere in the repo — proceeding without it, per your direction.
- **Current homepage, header, and footer are AEM boilerplate** (Lorem Ipsum) — the homepage will be migrated from scratch as part of this work.
- **Project type:** xwalk / Universal Editor project (`xwalk.json` present, `aem-boilerplate-xwalk` base). Blocks need JCR-compatible component models (`_{block}.json`) so all content is Universal-Editor authorable.
- **Existing blocks available for reuse:** `hero`, `cards`, `columns`, `fragment`, `header`, `footer`.
- **Product pages:** treated as standard content pages (authorable blocks, external images, no commerce backend).
- **Backend:** `fstab.yaml` mounts AEM Cloud author; preview org/site is `adcomeds` / `demo-suze`.

## Approach
1. **Scrape first, never guess.** For every page, scrape the live source and extract exact computed styles (fonts, colors, spacing, breakpoints), DOM structure, and asset URLs before writing any CSS. External source image/video URLs are used as-is.
2. **Catalog templates & sections.** Analyze all 4 pages to identify shared section patterns and group into page templates so blocks are reused consistently across pages.
3. **Reuse before creating.** Map each section to an existing block (`hero`, `cards`, `columns`) where it fits; create new blocks (with variants) only when no existing block matches.
4. **Content-driven development.** Build/adjust blocks against real scraped content, verify in local preview, and visually critique against the source until pixel-accurate.
5. **Authorability.** Every block gets/updates its `_{block}.json` model so all text and images are editable in Universal Editor. Run `npm run build:json` after model changes.
6. **Import infrastructure.** Generate parsers/transformers and run the bundled import script to produce content HTML (never hand-write content files).

## Sequence of Work
1. **Setup** — Start local dev server (`aem up`), confirm preview renders.
2. **Site scope / catalog** — Discover structure of the 4 URLs, catalog templates & block palette.
3. **Header & Footer** — Scrape suze.com global nav + footer; instrument header (desktop/mobile/megamenu as needed) and footer; replace boilerplate versions.
4. **Homepage** — Scrape → analyze sections → map to blocks → build/adjust blocks + CSS → import content → preview → visual critique vs source.
5. **Suze Story page** — Same per-page flow; reuse blocks from homepage.
6. **Product page: L'Originale** — Same flow; establish reusable "product" block variants.
7. **Product page: Tonic 0** — Reuse product variants from L'Originale; adjust content only.
8. **Cross-page consistency pass** — Ensure shared blocks/design tokens are consistent; run lint (`npm run lint`), rebuild JSON.
9. **Full visual QA** — Pixel-perfect comparison of all 4 pages + header/footer against source; iterate on discrepancies.
10. **Verify authorability** — Confirm all text/images are editable via Universal Editor models.

## Checklist

### Setup & Analysis
- [ ] Start local dev server and confirm preview renders
- [ ] Run site scope / template catalog across all 4 URLs
- [ ] Survey existing block palette (hero, cards, columns, fragment) for reuse

### Global (Header & Footer)
- [ ] Scrape suze.com header/nav — extract computed styles, structure, behaviors
- [ ] Scrape suze.com footer — extract computed styles and links
- [ ] Instrument header block (desktop + mobile, megamenu if present); replace boilerplate nav
- [ ] Instrument footer block; replace boilerplate footer
- [ ] Verify header/footer render pixel-accurately in preview

### Homepage (suze.com/)
- [ ] Scrape homepage; extract exact styles, fonts, colors, spacing, assets
- [ ] Analyze sections; map to existing blocks vs. new blocks needed
- [ ] Build/adjust blocks + CSS from computed styles (reuse where possible)
- [ ] Update block models (`_{block}.json`) for full authorability; run `build:json`
- [ ] Generate import parsers/transformers; run bundled import to create content
- [ ] Preview + visual critique vs source; iterate to pixel-perfect

### Suze Story (suze.com/suze-story/)
- [ ] Scrape page; extract exact styles and assets
- [ ] Analyze sections; reuse homepage blocks; identify any new blocks
- [ ] Build/adjust blocks + CSS; update models; run `build:json`
- [ ] Import content; preview + visual critique to pixel-perfect

### Product — L'Originale (suze.com/product/suze-loriginale/)
- [ ] Scrape PDP; extract exact styles and assets
- [ ] Analyze sections; establish reusable product block variants
- [ ] Build/adjust blocks + CSS; update models; run `build:json`
- [ ] Import content; preview + visual critique to pixel-perfect

### Product — Tonic 0 (suze.com/product/suze-tonic-0/)
- [ ] Scrape PDP; extract exact styles and assets
- [ ] Reuse L'Originale product variants; adjust content/assets only
- [ ] Import content; preview + visual critique to pixel-perfect

### Finalization
- [ ] Cross-page consistency pass on shared blocks & design tokens
- [ ] Run `npm run lint` (and `lint:fix`) — resolve issues
- [ ] Rebuild aggregated JSON (`npm run build:json`)
- [ ] Full-site visual QA of all 4 pages + header/footer vs source
- [ ] Confirm every text/image field is authorable in Universal Editor

---
*Execution requires Execute mode. Approve this plan to begin — I'll start with the dev server, then scope/catalog the four pages, and work through the checklist page by page, scraping and matching source styles before writing any CSS.*

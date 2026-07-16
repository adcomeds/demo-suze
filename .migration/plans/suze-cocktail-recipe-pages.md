# Suze Cocktail Recipe Pages — Migration Plan

## Goal
Create a `content/recipes/` folder with **4 cocktail recipe pages** — Suze White Negroni, Suze Alianza, Suze Sour, and Suze Tonic — using purpose-built custom blocks that fit a cocktail-recipe layout. Pages will be enriched with sensible recipe metadata (glassware, prep time, difficulty, garnish, servings). No landing page or nav change (per your choice).

## Source data (from the L'Originale product page + reasonable enrichment)
| Cocktail | Image | Ingredients | Method | Enriched meta (inferred) |
|----------|-------|-------------|--------|--------------------------|
| **Suze White Negroni** | `06_SUZE_COCKTAIL_WHITE-NEGRONI-...jpg` | 1 part Suze · 1 part Lillet Blanc · 1 part Plymouth Gin · grapefruit zest | Stir over ice; Old-Fashioned glass; garnish grapefruit zest | Glass: Old-Fashioned · 3 min · Easy · Serves 1 |
| **Suze Alianza** | `07_SUZE_COCKTAIL_ALIANZA-1-...jpg` | 1 part Suze · 1 part Lillet Rosé · 1 part Mezcal · grapefruit zest | Stir over ice; cocktail glass; garnish grapefruit zest | Glass: Cocktail · 3 min · Easy · Serves 1 |
| **Suze Sour** | `05_SUZE_COCKTAIL_SOUR-...jpg` | 1 part Suze · ½ part lemon syrup · ½ part sugar syrup · 1 egg white | Dry/wet shake; cocktail glass | Glass: Coupe · 5 min · Medium · Serves 1 |
| **Suze Tonic** | `02_SUZE_BOUTEILLE_DRINK_2-2-...jpg` | 1 part Suze · 2 parts Tonic · lemon wedge | Build over ice; highball; garnish lemon wedge | Glass: Highball · 2 min · Easy · Serves 1 |

All images reference the external `https://www.suze.com/...` URLs as-is (consistent with existing pages).

## New custom blocks (xwalk-modeled)
Three recipe-specific blocks, each with a `_<block>.json` model. Unique model ids to avoid the `card` collision issue seen earlier.

1. **`recipe-hero`** — top of page: large cocktail image + name (H1) + tagline/description + a meta strip (glass · time · difficulty · servings).
   - Model fields: `image`, `imageAlt`, `text` (richtext: H1 + tagline), `glass`, `time`, `difficulty`, `servings`.
2. **`recipe-ingredients`** — a titled list of ingredients, each row = quantity + ingredient (repeatable items). Item model id `ingredient-item`.
   - Container fields: none; item fields: `quantity`, `ingredient`.
3. **`recipe-steps`** — a titled, numbered list of preparation steps (repeatable). Item model id `step-item`.
   - Item field: `text` (richtext step).

Each block gets `blockname.js` (decoration), `blockname.css` (Suze brand styling: orange bg, yellow accent cards, Obviously font, pill accents), and `_blockname.json` (UE model). CSS reuses the existing design tokens (`--brand-orange`, `--brand-yellow`, `--brand-black`, `--heading-font-family`).

## Page structure (each of the 4 pages)
```
recipe-hero        → image + name + tagline + meta strip
H2 "Ingredients"   → default content heading
recipe-ingredients → quantity/ingredient rows
H2 "Method"        → default content heading
recipe-steps       → numbered preparation steps
```
Plus a `metadata` block per page (Title, Description, nav=/content/nav, footer=/content/footer) matching the existing pages, so the shared Suze header/footer render.

## Files to create
- `content/recipes/suze-white-negroni.plain.html`
- `content/recipes/suze-alianza.plain.html`
- `content/recipes/suze-sour.plain.html`
- `content/recipes/suze-tonic.plain.html`
- `blocks/recipe-hero/{recipe-hero.js,recipe-hero.css,_recipe-hero.json}`
- `blocks/recipe-ingredients/{recipe-ingredients.js,recipe-ingredients.css,_recipe-ingredients.json}`
- `blocks/recipe-steps/{recipe-steps.js,recipe-steps.css,_recipe-steps.json}`

## Verification
- `npm run build:json` to aggregate the new component models/definitions/filters (confirm unique model ids: `recipe-hero`, `ingredient-item`, `step-item` — no clash with existing `card`/`flip-card`/etc.).
- `npm run lint` (JS + CSS) — resolve any issues.
- Preview each page at `http://localhost:3000/content/recipes/<slug>` via the local dev server; verify hero, ingredients, and steps render with Suze styling and the shared header/footer load.

## Checklist
- [ ] Create `blocks/recipe-hero/` (js + css + _json model: image, text, glass, time, difficulty, servings)
- [ ] Create `blocks/recipe-ingredients/` (js + css + _json model: repeatable quantity/ingredient items)
- [ ] Create `blocks/recipe-steps/` (js + css + _json model: repeatable numbered steps)
- [ ] Create `content/recipes/suze-white-negroni.plain.html` (hero + ingredients + method + metadata)
- [ ] Create `content/recipes/suze-alianza.plain.html`
- [ ] Create `content/recipes/suze-sour.plain.html`
- [ ] Create `content/recipes/suze-tonic.plain.html`
- [ ] Run `npm run build:json`; confirm unique model ids, no collisions
- [ ] Run `npm run lint` (js + css); fix issues
- [ ] Preview all 4 pages in local dev server; verify blocks + shared header/footer render correctly

---
*Execution requires Execute mode. Approve this plan and I'll build the 3 custom blocks and 4 recipe pages, then validate with build:json, lint, and a local preview of each page.*

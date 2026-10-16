# Suze Chess Challenge: gamified, multilingual, A/B-tested experience

> Status: **approved to build, but I can't start yet.** This session is still in plan mode, which only lets me read and plan. Switch to **Execute mode** and send any message, and I'll work through the checklist from the top:
> 1. **Turn on the modern-web-guidance plugin**, then pause. It loads with your next message.
> 2. **Build everything else on the next turn**, without stopping. I'll only stop if the rum-conversion plugin doesn't work with the current `aem.js`, or before I commit, push or open a PR.

## 1. What I found in the repo, and the decisions you made

| Topic | Finding | Decision |
|---|---|---|
| Content source | Universal Editor (xwalk) on AEM author (`fstab.yaml`). Pages and sheets are authored in AEM. | New blocks get `_block.json` models. Sheets are AEM spreadsheets. |
| Locales | Path pattern `/<country>/<lang>/` (`getLocaleRoot()` / `getLocalePrefix()` in `scripts/scripts.js`). `<html lang>` is hardcoded to `en`. | **masters/en** (primary), **us/es** (secondary), **fr/fr** (machine-translated, flagged for review). Set `lang` from the locale. |
| Experimentation | `plugins/experimentation` is **AEM Experimentation v1.2.0**. It's already wired up with `mobile`/`desktop` audiences and the UE overlay. | **Keep the existing plugin.** Don't install aem-experience-decisioning. |
| Conversions | The plugin docs say any click counts as a conversion unless the `aem-rum-conversion` plugin is present. That plugin isn't installed. | Install `aem-rum-conversion`. Read its wiki for the exact metadata keys before writing any metadata. |
| Variant path | Experiment pages already follow `/experiments/<country>/<lang>/<page>/<exp-id>/<variant>`, and nav/footer resolve from that locale. | **One challenger per locale**, e.g. `/experiments/masters/en/chess-challenge/exp-chess-001/challenger`. |
| Placeholders | `aem.js` doesn't export `fetchPlaceholders`, and there's no config-sheet pattern. | New small helpers: `scripts/placeholders.js` and a config reader. |
| Chess engine | There's no chess library in the repo today. | **Use [chess.js](https://github.com/jhlywa/chess.js/)** for rules, move validation, check, game-over detection and history (section 3a). |
| Forms / modal | Neither block exists. | Custom blocks only. No AEM Forms. |
| Design tokens | `--brand-orange`, `--brand-yellow`, `--brand-black`, the `obviously` font, black pill `.button` variants, `.section.orange`. | Reuse them all. No new palette. |
| API contract | The brief had placeholder text, so I drafted one. | **Approved** (section 2). This is the contract to share with the backend team. It doesn't change from here. |
| AEM authoring | Spreadsheets and page properties live in AEM author. | **I try first. You do anything I can't publish**, following a step-by-step hand-off guide (section 5b). |
| Extra guidance | The *modern-web-guidance* plugin isn't on (there's no `.agents/settings.json` yet). | **Approved.** First step in Execute mode: create `.agents/settings.json` with `{"enabledPlugins": {"modern-web-guidance@excat-extended": true}}`. Its guidance then feeds the accessibility and performance checks. |

## 2. API contract (approved)

- **Base:** `{game-api-base}`. JSON in and out.
- **Auth:** `Authorization: Bearer <token>`, using the token from `registerPlayer`.
- **Errors:** `{ "error": { "code", "message" } }`.
  - Codes: `VALIDATION`, `UNAUTHORIZED`, `NOT_FOUND`, `GAME_FULL`, `NOT_YOUR_TURN`, `ILLEGAL_MOVE`, `STALE_VERSION`, `RATE_LIMITED`.
  - The client maps each code to a localized `error-<code>` placeholder and never shows `message`.

| Fn in `game-api.js` | HTTP | Request | Response |
|---|---|---|---|
| `registerPlayer` | `POST /players` | `{ firstName, email, locale, consents: { terms: true, marketing: bool }, termsVersion }` | `{ playerId, token }` |
| `createGame` | `POST /games` | `{ locale }` | `Game` (caller is white, `status: "waiting"`) |
| `getGame` | `GET /games/{gameId}` | n/a | `Game` |
| `joinGame` | `POST /games/{gameId}/join` | n/a | `Game` (caller is black, `status: "active"`) |
| `makeMove` | `POST /games/{gameId}/moves` | `{ from, to, promotion?, expectedVersion }` | `Game`. Returns 422 `ILLEGAL_MOVE` or 409 `STALE_VERSION`. |
| `resignGame` | `POST /games/{gameId}/resign` | n/a | `Game` |
| `sendInvite` | `POST /games/{gameId}/invites` | `{ email, locale }` | `{ inviteId, gameUrl }` |

`Game` shape:

```
{ gameId, status: "waiting"|"active"|"finished",
  fen, pgn, turn: "w"|"b", version, moveCount, updatedAt,
  lastMove: { from, to, san } | null,
  players: { white: { playerId, firstName }, black: { playerId, firstName } | null },
  result: { outcome: "checkmate"|"stalemate"|"draw"|"resign"|"abandoned", winner: "w"|"b"|null } | null }
```

- `gameUrl` is always `/<country>/<lang>/chess-challenge?game=<gameId>`.
- The backend validates every move with the **same pinned chess.js version** as the front end and the mock.
- The board position comes from `fen`. `pgn` lets the client rebuild the move list with `loadPgn()`.
- The contract is saved as `docs/game-api-contract.md` for the backend team.

## 3. Architecture

```
.agents/settings.json  enables modern-web-guidance
scripts/
  game-api.js          one async fn per endpoint; picks real vs mock
  game-api-mock.js     localStorage store, chess.js validation, ~300 ms latency, storage events
  game-session.js      sessionStorage (age gate result, playerId, token, gameId) + CustomEvents
  placeholders.js      fetch `${getLocalePrefix()}/placeholders.json`, cached, camelCase keys
  vendor/chess.js      chess.js ESM build, pinned version, licence header kept
blocks/
  age-gate/            age-gate.js|css + _age-gate.json
  player-registration/ player-registration.js|css + _player-registration.json
  chess/               chess.js|css + _chess.json (+ piece SVGs, optimized)
  invite/              invite.js|css + _invite.json
plugins/rum-conversion/  (added per its README)
docs/game-api-contract.md
migration-work/game-sheets/  sheet tables + AEM hand-off guide
```

### 3a. Using chess.js (https://github.com/jhlywa/chess.js/)

- **Scope:** rules only, with no UI. That suits our plain DOM/SVG board. It covers:
  - legal moves, including castling, en passant and promotion
  - check, checkmate, stalemate and draws
  - FEN and PGN
  - move history
- **Vendoring:** copy the published ESM file (`dist/esm/chess.js`, latest stable 1.x, exact version pinned) to `scripts/vendor/chess.js`.
  - The licence header stays in place.
  - The file is added to `.eslintignore`.
  - There's no npm runtime dependency and no build step.
- **Licence:** expected to be **BSD-2-Clause**. I'll confirm it at the pinned tag and record it in the README.
- **One shared copy:** the `chess` block and `game-api-mock.js` import the same file.
- **Lazy loading:** only a dynamic `import()` inside the block's `decorate`, or the mock, loads it. It's never in the eager phase.
- **APIs the block uses:**
  - `load(fen)` / `loadPgn(pgn)` to sync with each `Game` from the API
  - `moves({ square, verbose: true })` for legal-target highlighting and the promotion picker
  - `move()` to validate before `makeMove`, and `undo()` to roll back after an error
  - `inCheck()`, `isCheckmate()`, `isStalemate()`, `isDraw()` and `isGameOver()` for highlights and announcements. The API `result` still has the final say.
  - `board()` and `get(square)` to render pieces and build `aria-label`s
  - `history({ verbose: true })` for the move-history hook
- **No board UI library:** chessboard.js and similar need jQuery or heavy CSS.

### How mode is chosen (`game-api.js`)

- It reads `game-api-base` from a site-level **`/game-config`** sheet (`key | value`), fetched once.
- It uses the mock when that value is empty or the URL has `?mock=1`.
  - The `?mock=1` choice is kept in sessionStorage for that tab.
  - Invite links get `&mock=1` appended.
- Pointing the value at a real URL needs no code change.

### Block coordination

Blocks don't import each other. They talk through `game-session.js` events:

- `game:age-passed` makes registration visible.
- `game:registered` makes the chess block run `createGame`, or `joinGame` when `?game=` is in the URL.
- `game:created` makes the invite block visible while the game is `waiting`.
- `game:first-move` triggers the challenger invite prompt.
- `game:over` shows the result screen.

### Performance (Lighthouse 100)

- Section 1 of each game page is the existing `hero` block, which is the LCP element.
- All four new blocks sit in section 2 or later, so they load lazily. Nothing new is added to `loadEager`.
- chess.js and the mock are dynamic imports.
- The board reserves its space with `aspect-ratio: 1`, and the piece SVGs are optimized.
- I'll check the build against modern-web-guidance for current performance and accessibility practice.
- Still to check: the CSP in `head.html` (strict-dynamic) has to allow the dynamic imports and the `fetch` calls to the API host.

### Privacy (no PII in RUM or the console)

- Only the age gate outcome is stored, never the date of birth.
- sessionStorage holds only `playerId`, `token` and `gameId`.
- Email and name never go into a URL, storage or the console.
- Game code has no `console.log` calls, and the game link carries only `gameId`.
- No tracking is added beyond the experimentation and RUM conversion plugins.

## 4. Block specs

### `age-gate`

- **Authored fields:** `mode` (`yes-no` | `dob`) and `minimumAge`, set on each locale page.
- Copy comes from placeholders.
- The result goes in sessionStorage, per locale.
- A failed check shows a localized refusal, and the game stays hidden for the rest of the session.
- Labelled native controls, focus management and an `aria-live` error area.

### `player-registration`

- **Fields:** first name and email.
- **Consent:** two unchecked checkboxes.
  - **Game terms** is required. The terms link is an authored `aem-content` field.
  - **Brand marketing** is optional.
- **Submit:** localized validation runs first, then `registerPlayer` is called, then `playerId` and `token` go into sessionStorage.
- The submit button is disabled while the request is in flight. Errors map to placeholder keys.

### `chess`

- **Authored fields:**
  - `invitePrompt` (boolean, the challenger switch)
  - `resultWin`, `resultLoss`, `resultDraw` (richtext)
  - `responsibleDrinking` (richtext, always shown on the result screen)
- **Engine:** one `Chess` instance, re-synced from every `Game` the API returns.
- **Board:** a DOM grid of 64 `button`s with SVG pieces, flipped for black.
  - Legal targets, the last move and check are highlighted.
  - There's a promotion picker.
- **Keyboard:**
  - `role="grid"` with roving tabindex.
  - Arrow keys move between squares, Enter or Space selects and then moves, and Escape cancels.
  - Each square has a localized `aria-label`, e.g. "e4, white knight".
  - An `aria-live` region announces moves, check and the result.
- **Polling:**
  - `getGame` runs every 3 s, but only while it's the opponent's turn or the game is `waiting`.
  - It pauses when the tab is hidden and fetches immediately when the tab is visible again.
  - It stops when the game is finished.
  - In mock mode, a `storage` event triggers an instant refresh.
- **Moves:**
  - chess.js validates the move, and the board updates optimistically.
  - `makeMove` is sent with `expectedVersion`.
  - On a 409 or 422, the board rolls back with `undo()` and the latest game is reloaded.
- **Resign** button, which calls `resignGame`.
- **Challenger prompt:** with `invitePrompt` on, an "Invite a friend" panel appears after the player's first move. Its CTA moves focus to the invite block.
- **Move history (left unbuilt on purpose):**
  - An empty `<aside class="chess-history" data-hook="move-history" hidden>`.
  - A `// TODO(live-demo): renderMoveHistory(historyEl, chess.history({ verbose: true }))` hook runs after every board update.
  - Both are documented in the block and the README.

### `invite`

- **Field:** friend's email.
- The send button has the stable selector **`#chess-invite-send`** (also `data-conversion="chess-invite"`) and calls `sendInvite`.
- **Mock mode:** a dismissible panel shows the game link.
  - It has a copy button and an open link.
  - The open link uses `target="_blank" rel="noopener"`, so the new tab doesn't inherit the host's session.
- The block hides once an opponent has joined.

### Invitee flow

The invitee opens `?game=`, passes the age gate and registers with their own consent. `joinGame` then assigns them black. A game that's already full shows `error-game-full`.

## 5. Content

| Item | masters/en | us/es | fr/fr |
|---|---|---|---|
| Control page `/<loc>/chess-challenge` | yes | yes | yes |
| Challenger `/experiments/<loc>/chess-challenge/exp-chess-001/challenger` (identical, `invitePrompt` on) | yes | yes | yes |
| `placeholders` sheet: all UI strings, piece and square names, errors, a11y labels | full | full | machine-translated, `review` column = "MT: needs review" |
| `game-email` sheet: `invite-email-subject` and `invite-email-body`, with `{inviterFirstName}` and `{gameUrl}` tokens. Transactional only, no promotion, includes a responsible drinking line. | full | full | machine-translated, flagged |
| Site `/game-config` sheet (`game-api-base` empty, so mock mode) | n/a | n/a | n/a |
| Bulk `metadata` sheet: `/experiments/**`, `robots: noindex,nofollow` | n/a | n/a | n/a |

- **No em dash** in any copy. A grep check runs over the sheets and pages.
- **Pages** are created with the project's import script and bulk-import runner. The experiment page properties go in at the same time.

### 5a. Experiment metadata (control page properties)

- **Page model:** add experiment and conversion fields to `models/_page.json` so authors can edit them in Universal Editor.
- **Values:**
  - `experiment`: `exp-chess-001`
  - `experiment-variants`: the challenger URL for that locale
  - `experiment-split`: `50`
  - `experiment-status`: `Active`
- **Conversion:** a click on `#chess-invite-send`. The exact rum-conversion keys come from its wiki and are recorded in the README.
  - **Risk:** the plugin was built for an older `sampleRUM`. If it doesn't work with the current `aem.js`, I'll stop and ask you before picking a fallback.
- **Mobile-only audience:** off by default (`experiment-audience` empty). Setting it to `mobile` switches it on, using the audience already defined in `scripts.js`.

### 5b. Who does the AEM authoring

- **I try first.** In Execute mode I'll create the pages, the page properties and the four spreadsheets, using the import pipeline and whatever publishing access this workspace has.
- **You finish anything I can't.** If something can't be created or published from here (most likely the AEM spreadsheets), I'll tell you exactly which items. I'll also leave a hand-off guide at `migration-work/game-sheets/README.md` with:
  - each sheet's AEM path, template (Placeholders or Metadata) and ready-to-paste rows
  - the page properties to set on each control page, field by field
  - the publish order: sheets first, then challenger pages, then control pages
  - a quick check for each item: the `.json` URL to open on preview and what it should return
- **Not blocking:** until the sheets are live, local testing uses draft copies, so the build and the two-tab demo can go ahead.

## 6. README additions

- Local dev, including `--html-folder drafts`
- Mock mode (empty `game-api-base` or `?mock=1`) and the two-tab demo
- Switching to the real API with no code change
- A link to `docs/game-api-contract.md`
- **chess.js:** source, pinned version, BSD-2-Clause licence and attribution, how to upgrade it in step with the backend, and why there's no board UI library
- Placeholders keys and how to add a locale
- Experiment setup: paths, split, conversion keys, the mobile audience switch and noindex
- The `TODO(live-demo)` move-history hook
- A link to the AEM hand-off guide

## Checklist

- [x] Agree the API contract (approved)
- [x] Decide who does the AEM authoring (I try first, you finish anything left)
- [x] Approve the modern-web-guidance plugin
- [x] Get the go-ahead to implement
- [ ] **Switch to Execute mode (you)**
- [ ] Create `.agents/settings.json` with `{"enabledPlugins": {"modern-web-guidance@excat-extended": true}}`, confirm it, then pause until your next message so the plugin can load
- [ ] Create branch `feature/chess-challenge` (leave the modified `.migration/project.json` alone)
- [ ] Save the approved contract to `docs/game-api-contract.md`
- [ ] Look up the `aem-rum-conversion` README and wiki; record the exact conversion metadata keys and check it works with the current `aem.js`
- [ ] Pick the latest stable chess.js 1.x release and confirm the BSD-2-Clause licence at that tag
- [ ] Copy the chess.js ESM build to `scripts/vendor/chess.js` with its licence header; pin the version; add it to `.eslintignore`
- [ ] Check that the copied chess.js imports cleanly in the browser with no build step, and note its size
- [ ] Add `scripts/placeholders.js`, and set `<html lang>` from the locale in `scripts/scripts.js`
- [ ] Add `scripts/game-session.js` (sessionStorage and events)
- [ ] Add `scripts/game-api.js` (config lookup, mock switch, error mapping) per the approved contract
- [ ] Add `scripts/game-api-mock.js` (localStorage, shared chess.js validation, FEN/PGN storage, 300 ms latency, `storage` events, invite link panel data)
- [ ] Build the `age-gate` block, its model and CSS
- [ ] Build the `player-registration` block, its model and CSS
- [ ] Build the `chess` block on chess.js: lazy `import()`, board, highlighting, promotion, keyboard/ARIA, polling with visibility pause, rollback with `undo()`, result screen, resign, `invitePrompt` option, `TODO(live-demo)` history hook
- [ ] Build the `invite` block with `#chess-invite-send` and the mock link panel
- [ ] Check the four blocks against modern-web-guidance (accessibility, forms, performance) and fix any gaps
- [ ] Add the new blocks to the `models/_section.json` filter; add experiment and conversion fields to `models/_page.json`; run `npm run build:json`
- [ ] Install `plugins/rum-conversion` per its README and load it alongside experimentation (nothing added to the eager phase)
- [ ] Write placeholders and game-email copy for masters/en and us/es, machine-translate fr/fr with review flags, and run the no-em-dash check
- [ ] Prepare the `/game-config` and bulk `metadata` (`/experiments/**` noindex,nofollow) sheet tables
- [ ] Create local draft test pages and draft sheet copies for local dev
- [ ] Create the control and challenger pages per locale through the import pipeline, with experiment properties on the control pages
- [ ] Try to create and publish the four AEM spreadsheets; list anything that fails or needs author access
- [ ] Write `migration-work/game-sheets/README.md` (paths, templates, rows, page properties, publish order, checks) and tell you exactly what's left for you
- [ ] Test in two tabs with the mock: create, invite, join as black, castling, en passant and promotion, play to checkmate and resign, result screen
- [ ] Try an illegal move, a stale-version move and an out-of-turn move; confirm the mock rejects them and the board rolls back
- [ ] Switch locale and confirm every string changes; check keyboard-only play and the screen reader labels
- [ ] Check the experiment overlay on preview and switching between control and challenger, with and without `?experiment=` (after the sheets and properties are published)
- [ ] Inspect the console and RUM network calls for PII (none expected)
- [ ] Run `npm run lint`, then Lighthouse mobile and desktop on the control page (target 100); confirm chess.js isn't requested before the lazy phase
- [ ] Update the README
- [ ] Ask you before committing, pushing or opening a PR (with a feature-preview link)

## Open items

None. Every decision is made. Switch to Execute mode and send any message to start.

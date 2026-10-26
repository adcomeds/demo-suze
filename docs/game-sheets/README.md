# Chess challenge: AEM authoring hand-off

Everything below lives in AEM author (`/content/suze`) and is edited in the Sites console or
Universal Editor. The copy is kept in `docs/game-sheets/*.source.json`. Run `npm run sheets:build`
to get paste-ready CSV files in `docs/game-sheets/out/`. That command also fails on em dashes,
missing translations and placeholder keys the blocks use but the sheets lack.

## 1. Spreadsheets (create, paste, publish)

Create each one in the Sites console with **Create > Spreadsheet**. Open the matching CSV in
Excel or Numbers and paste the rows, header row included.

| AEM path | Template | Paste from | Delivered as |
|---|---|---|---|
| `/content/suze/masters/en/placeholders` (blueprint, rolled out to `us/en`) | Placeholders | `out/masters-en/placeholders.csv` | `/us/en/placeholders.json` |
| `/content/suze/us/es/placeholders` | Placeholders | `out/us-es/placeholders.csv` | `/us/es/placeholders.json` |
| `/content/suze/fr/fr/placeholders` | Placeholders | `out/fr-fr/placeholders.csv` | `/fr/fr/placeholders.json` |
| `/content/suze/masters/en/game-email` (blueprint, rolled out to `us/en`) | Placeholders | `out/masters-en/game-email.csv` | `/us/en/game-email.json` |
| `/content/suze/us/es/game-email` | Placeholders | `out/us-es/game-email.csv` | `/us/es/game-email.json` |
| `/content/suze/fr/fr/game-email` | Placeholders | `out/fr-fr/game-email.csv` | `/fr/fr/game-email.json` |
| `/content/suze/game-config` | Placeholders | `out/game-config.csv` | `/game-config.json` |
| `/content/suze/metadata` (bulk metadata; add the row if the sheet exists) | Metadata | `out/metadata.csv` | `/metadata.json` |

Notes:

- The `Review` column is extra and ignored by the site. For fr/fr it reads `MT: needs review`:
  the French copy is machine translated and must be reviewed before go-live.
- `game-config` has `Key` and `Value` columns. The Placeholders template uses `Key` and `Text`,
  and the site reads either.
- Leave `game-api-base` empty to run the in-browser mock. Set it to the App Builder base URL
  (no trailing slash) to use the real backend. No code change is needed either way.
- The spreadsheets must be mapped to their `.json` delivery paths in the site's path mapping
  (`paths.json` or the site configuration). Check each "Delivered as" URL on
  `https://main--demo-suze--adcomeds.aem.page/` after publishing.

### Update 2026-10-21: new rows to add

The sheets already exist. Add these rows and publish again (`npm run sheets:build` regenerates
the CSV files):

| Sheet | New keys |
|---|---|
| `placeholders` (each locale) | `player-message-label`, `player-message-close`, `unsubscribed-confirmation` |
| `game-email` (each locale) | `followup-win-subject`, `followup-win-body`, `followup-loss-subject`, `followup-loss-body`, `followup-draw-subject`, `followup-draw-body` |

The rows are at the end of the matching CSV files in `out/<locale>/`.

## 2. Pages

The import created six pages with block content and properties already set:

| Page | Path | Page properties |
|---|---|---|
| Blueprint (en) | `/content/suze/masters/en/chess-challenge` | Title, Description only. Not published, no experiment. |
| Control (en) | `/content/suze/us/en/chess-challenge` (live copy of the blueprint) | experiment properties below, set locally (cancel inheritance) |
| Control (es) | `/content/suze/us/es/chess-challenge` | experiment properties below |
| Control (fr) | `/content/suze/fr/fr/chess-challenge` | experiment properties below |
| Challenger (en) | `/content/suze/experiments/us/en/chess-challenge/exp-chess-001/challenger` | Title, Description |
| Challenger (es) | `/content/suze/experiments/us/es/chess-challenge/exp-chess-001/challenger` | Title, Description |
| Challenger (fr) | `/content/suze/experiments/fr/fr/chess-challenge/exp-chess-001/challenger` | Title, Description |

Experiment properties on each control page:

| Field | Value |
|---|---|
| Experiment ID (`experiment`) | `exp-chess-001` |
| Experiment Variants (`experiment-variants`) | `/experiments/<locale>/chess-challenge/exp-chess-001/challenger` |
| Experiment Split (`experiment-split`) | `50` |
| Experiment Status (`experiment-status`) | `Active` |
| Experiment Audience (`experiment-audience`) | empty (everyone). Choose **Mobile only** to switch on the mobile audience |
| Conversion Element (`conversion-element`) | `Form` |

Section properties: the section that holds the **Invite** block has **Conversion Name** set to
`chess-invite`, on both the control and the challenger pages. With that set, only the invite form
counts as a conversion. The age gate and registration forms do not.

Block settings per locale:

| Locale | Age Gate: Age check | Legal drinking age |
|---|---|---|
| masters/en (blueprint) | Yes / no confirmation | 18 |
| us/en | Date of birth (cancel inheritance on the block) | 21 |
| us/es | Date of birth | 21 |
| fr/fr | Yes / no confirmation | 18 |

On the challenger pages the **Chess** block has the option *Show an "Invite a friend" prompt after
the opening move* switched on. Nothing else differs from the control.

**Player Message block (added 2026-10-21):** each control and challenger page has a
**Player Message** block after the Chess block, with five **Message** items. Each item has a
*Show to* value (`registered`, `waiting`, `won`, `lost`, `draw`), the message text (with
`{firstName}`) and a link to Suze Tonic 0%, Suze L'Originale or the Suze story in the same locale.
The re-imported AEM versions of the six pages include it.

## 3. Publish order

1. Spreadsheets (placeholders, game-email, game-config, metadata)
2. Challenger pages
3. Control pages

## 4. Checks after publishing

- Every "Delivered as" URL in section 1 returns JSON with a `data` array.
- `https://main--demo-suze--adcomeds.aem.page/experiments/us/en/chess-challenge/exp-chess-001/challenger`
  is served with `<meta name="robots" content="noindex,nofollow">`.
- The control page head has `meta name="experiment"` and `meta name="conversion-element"`.
- `?experiment=exp-chess-001/challenger` on a control page shows the challenger content.
- The experimentation overlay in Universal Editor lists `exp-chess-001`.

## 5. Still to provide

- **Game terms pages:** `/<locale>/chess-challenge-terms` are linked from the registration form
  and must be written by legal.
- **French review:** all fr/fr copy (sheets and page text) is machine translated.
- **Backend:** the backend reads the `game-email` sheet for the invite email. The opening-move
  rule in `docs/game-api-contract.md` needs backend confirmation.

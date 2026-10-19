# Suze Chess Challenge architecture

How the chess challenge is put together: authoring in AEM, delivery through Edge Delivery
Services, the game in the visitor's browser, and the App Builder backend. GitHub renders these
Mermaid diagrams directly.

See also:
- [`docs/game-api-contract.md`](game-api-contract.md): the API contract
- [`docs/game-sheets/README.md`](game-sheets/README.md): the AEM hand-off guide
- [`docs/backend-app-builder-prompt.md`](backend-app-builder-prompt.md): the backend brief

## 1. System overview

```mermaid
flowchart TB
  subgraph Authoring["Authoring (AEM author + Universal Editor)"]
    Pages["Pages per locale<br/>control: /locale/chess-challenge<br/>challenger: /experiments/locale/..."]
    Sheets["Spreadsheets<br/>placeholders · game-email<br/>game-config · metadata"]
  end

  subgraph Code["Code"]
    GH["GitHub<br/>adcomeds/demo-suze"]
  end

  subgraph EDS["Edge Delivery Services"]
    Admin["admin.hlx.page<br/>preview / publish"]
    CDN["aem.page / aem.live<br/>HTML, JSON sheets, code"]
  end

  subgraph Browser["Visitor browser"]
    Blocks["Blocks<br/>age-gate · player-registration<br/>chess · invite"]
    Session["game-session.js<br/>sessionStorage + events"]
    Api["game-api.js<br/>single API client"]
    Mock["game-api-mock.js<br/>localStorage + chess.js"]
    Exp["Experimentation plugin<br/>+ rum-conversion"]
  end

  subgraph AB["Adobe App Builder · project Chess (AGS955)"]
    Action["Web action chess/game-api<br/>chess.js 1.4.0 validation"]
    State[("aio-lib-state<br/>players · token hashes · games")]
  end

  SMTP["Own SMTP server<br/>(log mode until configured)"]
  Inbox["Friend's inbox"]
  subgraph Obs["Measurement"]
    RUM["RUM / OpTel<br/>no personal data"]
  end

  Pages --> Admin
  Sheets --> Admin
  Admin --> CDN
  GH -- "Code Sync" --> CDN
  CDN --> Blocks
  Blocks --> Session
  Blocks --> Api
  Blocks --> Exp
  Api -- "game-api-base empty or ?mock=1" --> Mock
  Api -- "HTTPS, Bearer token, CORS" --> Action
  Action --> State
  Action -- "reads game-email.json" --> CDN
  Action -- "invite email" --> SMTP
  SMTP --> Inbox
  Exp -- "experiment + convert checkpoints" --> RUM
```

## 2. Game flow (host and invited friend)

The App Builder backend is shown. The in-browser mock behaves the same way, with `localStorage`
in place of `aio-lib-state` and no email.

```mermaid
sequenceDiagram
  autonumber
  actor Host
  participant Site as Site (browser)
  participant API as App Builder game-api
  participant Store as aio-lib-state
  participant Mail as SMTP
  actor Friend

  Host->>Site: Passes age gate (outcome kept in sessionStorage)
  Host->>Site: Registers: first name, email, consents
  Site->>API: POST /players
  API->>Store: Save player and token hash
  API-->>Site: playerId + token
  Site->>API: POST /games
  API-->>Site: Game (host plays white, status waiting)
  Host->>Site: Plays the opening move
  Site->>API: POST /games/ID/moves (expectedVersion)
  Host->>Site: Invites a friend by email
  Site->>API: POST /games/ID/invites
  API->>Mail: Invite email (copy from the game-email sheet)
  API-->>Site: gameUrl, shown in the link panel
  Mail-->>Friend: Link to /locale/chess-challenge?game=ID
  Friend->>Site: Opens link, passes age gate, registers
  Site->>API: POST /games/ID/join (friend plays black)
  loop Every 3 s while it is the opponent's turn (paused when the tab is hidden)
    Site->>API: GET /games/ID
  end
  Note over Site,API: Moves continue until checkmate, stalemate, draw or resignation
  Site-->>Host: Result screen + responsible drinking line
  Site-->>Friend: Result screen + responsible drinking line
```

## 3. A/B experiment and conversion

```mermaid
flowchart TD
  V["Visitor opens /locale/chess-challenge"] --> E{"Experimentation plugin<br/>exp-chess-001 · 50/50<br/>optional mobile-only audience"}
  E -- "control" --> C["Control content<br/>invite form shown once the game exists"]
  E -- "challenger" --> X["Challenger content from /experiments/...<br/>chess option nudge:<br/>invite prompt after the opening move"]
  C --> I["Invite form submitted<br/>button chess-invite-send"]
  X --> I
  I --> R["rum-conversion<br/>convert checkpoint chess-invite"]
  R --> RUM["RUM / OpTel experiment report"]
  N["/experiments/** set to noindex,nofollow<br/>by the bulk metadata sheet"] -.-> X
```

## Legend

- **Mock vs real API:** with `game-api-base` empty, or `?mock=1` in the URL, everything runs in the browser and two tabs can play each other. Otherwise the site calls App Builder. That's currently Stage: `https://129433-chess-stage.adobeioruntime.net/api/v1/web/chess/game-api`.
- **Personal data:** the browser stores only `playerId`, the token, `gameId` and the age gate outcome, in `sessionStorage`. Names and emails never go into URLs, logs or RUM.
- **Copy:** editorial text is in the blocks, interface text is in the per-locale `placeholders` sheets, and the email copy is in the `game-email` sheets.

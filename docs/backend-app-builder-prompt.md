# Prompt: implement the Suze Chess Challenge backend on Adobe App Builder

Copy everything below the line into a coding agent (or hand it to a developer) working in a
**new, empty repository** for the App Builder app. It is self-contained.

---

## Role and goal

You are building the backend for the **Suze Chess Challenge**, a turn-based, two-player chess
game embedded in an AEM Edge Delivery Services site (`https://main--demo-suze--adcomeds.aem.live`,
GitHub `adcomeds/demo-suze`). The front end is finished and live. It currently runs against an
in-browser mock. Your job is to build an **Adobe App Builder** app (Adobe I/O Runtime actions,
Node.js) that implements the API contract below **exactly**, so the site can switch from the mock
to your API with no front-end change.

This is for a live client demo. Prefer simple, robust and well tested over clever.

## Hard constraints

- **App Builder only:** Adobe I/O Runtime web actions, Node.js 22, scaffolded with `aio app init`
  (no UI, no extensions), deployed with `aio app deploy`. No other cloud.
- **Do not change the contract**: paths, field names, status codes, error codes, the `Game` shape.
  If something looks wrong, implement it as written and list it under "Questions" at the end.
- **No Adobe marketing or tracking products:** no AJO, AEP, Target, Analytics or Campaign. No
  third-party email services: send email only through the project's **own SMTP server** (see
  "Invite email").
- **Personal data:** never log first names, email addresses or tokens. Log only codes, ids and
  timings. Email addresses are used only for registration records and to send the invite. The
  invitee address is never stored.
- **chess.js 1.4.0**, pinned exactly (`"chess.js": "1.4.0"`, BSD-2-Clause). The front end and the
  mock use this exact version, so legality must match.

## Reference implementation

The front end ships a complete in-browser implementation of this contract. Treat it as the
behavioural reference, and match it unless the contract says otherwise:

- `https://github.com/adcomeds/demo-suze/blob/main/scripts/game-api-mock.js`: all rules (validation,
  opening move, join, resign, invite limits, result detection)
- `https://github.com/adcomeds/demo-suze/blob/main/scripts/game-api.js`: how the client calls you
  (paths, headers, `credentials: 'omit'`, `cache: 'no-store'`, error parsing)
- `https://github.com/adcomeds/demo-suze/blob/main/docs/game-api-contract.md`: the contract (copied below)

Read the mock before writing code. Port its handler logic, keeping the same names where sensible.

## API contract

- **Base URL:** whatever URL you give the site. It is put in the site's `game-config` sheet as
  `game-api-base`, with no trailing slash. The client appends the paths below to it.
- **Format:** requests and responses are JSON (`Content-Type: application/json`).
- **Auth:** every call except `registerPlayer` sends `Authorization: Bearer <token>`, using the
  token returned by `registerPlayer`.

### Errors

Every non-2xx response has this body. `message` is free text for logs and is never shown to users.

```json
{ "error": { "code": "ILLEGAL_MOVE", "message": "..." } }
```

| Code | HTTP | When |
|---|---|---|
| `VALIDATION` | 400 | Missing or malformed fields, terms not accepted, bad email, unknown locale |
| `UNAUTHORIZED` | 401 | Missing, invalid or expired token |
| `NOT_FOUND` | 404 | Unknown `gameId` |
| `GAME_FULL` | 409 | `joinGame` on a game that already has a black player, or is no longer `waiting` |
| `NOT_YOUR_TURN` | 409 | `makeMove` by the player who is not to move, or by a non-player; `resign` or `invite` by a non-player |
| `STALE_VERSION` | 409 | `makeMove` with an `expectedVersion` that is not the current `version` |
| `ILLEGAL_MOVE` | 422 | Move rejected by chess.js, or the game is `finished` |
| `RATE_LIMITED` | 429 | More than 5 invites for one game, or too many registrations from one client |

Unknown routes return 404 `NOT_FOUND`. Unexpected failures return 500 with code `UNKNOWN`.

### Endpoints

| Function | Method and path | Request body | Response |
|---|---|---|---|
| `registerPlayer` | `POST /players` | `{ firstName, email, locale, consents: { terms: true, marketing: boolean }, termsVersion }` | `201 { playerId, token }` |
| `createGame` | `POST /games` | `{ locale }` | `201 Game` (caller is white, `status: "waiting"`, `version: 0`) |
| `getGame` | `GET /games/{gameId}` | none | `200 Game` |
| `joinGame` | `POST /games/{gameId}/join` | none | `200 Game` (caller is black, `status: "active"`) |
| `makeMove` | `POST /games/{gameId}/moves` | `{ from, to, promotion?, expectedVersion }` | `200 Game` |
| `resignGame` | `POST /games/{gameId}/resign` | none | `200 Game` |
| `sendInvite` | `POST /games/{gameId}/invites` | `{ email, locale }` | `201 { inviteId, gameUrl }` |

The client treats any 2xx as success, so 200 or 201 both work. Use the values above.

### Game object

```json
{
  "gameId": "g_8f2k1x0a9b",
  "status": "waiting | active | finished",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "pgn": "1. e4",
  "turn": "w | b",
  "version": 1,
  "moveCount": 1,
  "updatedAt": "2026-10-16T10:00:00.000Z",
  "lastMove": { "from": "e2", "to": "e4", "san": "e4" },
  "players": {
    "white": { "playerId": "p_1", "firstName": "Alex" },
    "black": null
  },
  "result": null
}
```

Derive `fen`, `pgn`, `turn`, `moveCount` and `lastMove` from a `Chess` instance rebuilt from the
stored PGN, like `toPublic()` in the mock. Never return internal fields (invite counters, emails,
tokens). `players.*` only ever contains `playerId` and `firstName`.

### Rules

**Validation**
- **`firstName`:** 1 to 50 characters after trimming.
- **`email`:** must match `^[^\s@]+@[^\s@]+\.[^\s@]+$` and be at most 254 characters.
- **`consents.terms`:** must be `true`.
- **`consents.marketing`:** stored as a boolean, defaulting to `false`.
- **`locale`:** must be one of `masters/en`, `us/es`, `fr/fr`. Make the list configurable.
- **`promotion`:** one of `q`, `r`, `b`, `n`.
- **`gameId`:** matches `^[\w-]{1,64}$`, otherwise `NOT_FOUND`.

**Opening move**
- While a game is `waiting`, white may play exactly one move, so the host can move first and then
  invite a friend.
- With one move already played on a `waiting` game, any further move returns `NOT_YOUR_TURN`.
- `joinGame` switches the game to `active`, and black replies from there.

**`makeMove` checks, in order**
1. Game exists, otherwise `NOT_FOUND`.
2. Game is not `finished`, otherwise `ILLEGAL_MOVE`.
3. Opening-move rule above.
4. Caller is a player and it is their colour's turn, otherwise `NOT_YOUR_TURN`.
5. `expectedVersion` equals the current `version`, otherwise `STALE_VERSION`.
6. chess.js accepts `{ from, to, promotion }`. `move()` throws on an illegal move, which maps to `ILLEGAL_MOVE`.
7. On success, detect the result (see "Game end") and save.

**`joinGame`**
- Joining a game you already play in (white or black) returns the game unchanged.
- Otherwise, if the game already has a black player or is not `waiting`, return `GAME_FULL`.

**Game end**
- Checkmate: `{ outcome: "checkmate", winner: <side that moved> }`.
- Stalemate: `{ outcome: "stalemate", winner: null }`.
- Any other chess.js draw (`isDraw()`: 50-move rule, insufficient material, threefold
  repetition): `{ outcome: "draw", winner: null }`.
- When any of these happens, set `status: "finished"`.

**`resignGame`**
- The caller must be a player.
- A `finished` game is returned unchanged.
- On a `waiting` game the result is `{ outcome: "abandoned", winner: null }`.
- On an `active` game the result is `{ outcome: "resign", winner: <opponent> }`.

**`version`**
- Starts at `0` on create.
- Increases by 1 on every join, move and resign. A no-op join does not change it.
- `updatedAt` is an ISO timestamp, refreshed on every change.

**`sendInvite`**
- Only white (the host) may invite, otherwise `NOT_YOUR_TURN`.
- At most 5 invites per game, otherwise `RATE_LIMITED`.
- The game must not be `finished`.
- Returns `gameUrl` as the **relative** path `/<locale>/chess-challenge?game=<gameId>`. The client
  resolves it against its own origin.

**`getGame`**
- Any authenticated player may read any game, because the invitee reads it before joining.
- This endpoint is polled about every 3 seconds per open tab, so keep it fast: one storage read and
  no writes.

## Architecture

### Actions and routing

Use **one public web action**, `chess/game-api`, that routes on `__ow_method` and `__ow_path`.
That way the base URL is simply
`https://<namespace>.adobeioruntime.net/api/v1/web/chess/game-api` and the client can append
`/players`, `/games/{id}/moves` and so on.

In `app.config.yaml`:
- `web: 'yes'` and `raw-http: false`. The body parameters arrive merged into params.
- `require-adobe-auth: false`, because the players are anonymous site visitors.
- `web-custom-options: true`, so you answer CORS preflights yourself.

Keep the router thin. Put one module per operation in `actions/game-api/handlers/`, and the shared
helpers (`errors.js`, `auth.js`, `store.js`, `chess-rules.js`, `email.js`, `cors.js`) next to it.

### CORS

Answer `OPTIONS` with 204. On every response:
- Set `Access-Control-Allow-Origin` to the request `Origin` when it matches the allow-list.
- Send `Access-Control-Allow-Headers: Authorization, Content-Type, Accept`,
  `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Max-Age: 600` and `Vary: Origin`.

The allow-list is configurable through the `ALLOWED_ORIGINS` input and defaults to:
- `https://*--demo-suze--adcomeds.aem.page`
- `https://*--demo-suze--adcomeds.aem.live`
- `http://localhost:3000`

Support the `*` wildcard for the branch part of the host only.

### Storage

Use `@adobe/aio-lib-state`, which needs no extra infrastructure:

| Key | Value | TTL |
|---|---|---|
| `player.<playerId>` | `{ playerId, firstName, email, locale, consents, termsVersion, createdAt }` | 30 days |
| `token.<sha256(token)>` | `playerId` | 24 hours. Store only the hash, never the raw token. |
| `game.<gameId>` | `{ gameId, locale, status, pgn, version, players, result, invites, createdAt, updatedAt }` | 7 days, refreshed on write |

- **Ids:** prefix with `p_`, `g_` and `i_`, plus 10 or more random URL-safe characters from `crypto`.
- **Tokens:** 32 random bytes encoded as base64url.
- **Keys:** check the key naming rules of the aio-lib-state version you install and adjust the
  separator if needed.
- **Concurrent writes:** aio-lib-state has no transactions. Guard move writes with the version
  check: read, validate `expectedVersion`, write, then re-read once and return `STALE_VERSION` if
  another write won the race. This is acceptable for a demo. Note the limitation in the README.

### Invite email (own SMTP server)

Build `email.js` as a small adapter with two providers, selected by the `EMAIL_PROVIDER` input:

| Provider | Behaviour |
|---|---|
| `smtp` | Sends through **nodemailer** with `SMTP_HOST`, `SMTP_PORT` (default 587, STARTTLS), `SMTP_SECURE` (true for 465), `SMTP_USER`, `SMTP_PASS` and `EMAIL_FROM` (for example `"Suze Chess Challenge" <no-reply@yourdomain>`). |
| `log` | Development only. Sends nothing and logs only `invite sent (dry run) game=<gameId> locale=<locale>`, never the address or the body. |

Keep the interface `send({ to, subject, text })` so another provider can be added later without
touching the handler.

The copy comes from the site, never from code:
1. Fetch `${SITE_ORIGIN}/${locale}/game-email.json`. `SITE_ORIGIN` defaults to
   `https://main--demo-suze--adcomeds.aem.live`.
2. Read the rows `{ Key, Text }` with the keys `invite-email-subject` and `invite-email-body`.
3. Cache the sheet in memory for 5 minutes.

Build the message:
- Replace `{inviterFirstName}` with the host's first name and `{gameUrl}` with the **absolute** URL
  `${SITE_ORIGIN}/${locale}/chess-challenge?game=<gameId>`.
- Send a plain-text email. The body uses `\n` for line breaks. Do not add any content.

Failures:
- If the sheet fetch fails, return 500 `UNKNOWN` and send nothing.
- If SMTP fails, return 500 `UNKNOWN`. Do not count the attempt against the 5-invite limit.

Before you finish, confirm in the I/O Runtime documentation that outbound SMTP on the chosen port
(587 or 465) is allowed from Runtime actions, and note the result in the README.

### Configuration

All configuration goes through `.env` and `app.config.yaml` inputs. Commit `.env.example`, never
`.env`. The inputs are:

`ALLOWED_ORIGINS`, `SITE_ORIGIN`, `LOCALES`, `EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `TOKEN_TTL_HOURS`, `MAX_INVITES_PER_GAME`
(default 5) and `LOG_LEVEL`.

### Rate limiting (light, demo grade)

- **Invites:** use the per-game counter on the game record.
- **Registrations:** at most 20 per hour per client. Key on a hash of the
  `x-forwarded-for` header, stored in State with a 1 hour TTL.

## Tests (required)

Use Jest and `aio app test`, and mock `@adobe/aio-lib-state` and nodemailer.

**Contract tests per endpoint**
- Happy path, with the exact response shape (no extra fields).
- Every error code in the table, with its HTTP status.
- CORS: preflight, allowed origin and rejected origin.

**Game scenarios**
- Opening move while `waiting`, then a second move rejected with `NOT_YOUR_TURN`.
- Join, then black replies.
- Stale `expectedVersion`.
- Moving the opponent's piece.
- Promotion to a knight.
- Castling and en passant.
- Scholar's mate (1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#), giving `checkmate`, winner `w`.
- A stalemate position, giving `stalemate`.
- Resign on `waiting` (`abandoned`) and on `active` (`resign`).
- A sixth invite (`RATE_LIMITED`).
- `GAME_FULL` for a third player.

**Privacy test**
- No log line contains the test email addresses or first names.

**End-to-end smoke script**
- Add `scripts/smoke.sh`, which uses curl against a deployed URL to register two players, play the
  Scholar's mate and print the final `result`.

## Deliverables

1. **The App Builder project:** `app.config.yaml`, `actions/game-api/**`, tests, `.env.example`
   and `scripts/smoke.sh`.
2. **A README** covering:
   - setup and deployment (`aio login`, `aio app use`, `aio app deploy`)
   - every input
   - how to switch email between `log` and `smtp`
   - the SMTP-from-Runtime check
   - the storage TTLs and the concurrency limitation
   - the final base URL
3. **The deployed Stage workspace URL**, written as the value to put in the site sheet:
   `game-api-base = https://<namespace>.adobeioruntime.net/api/v1/web/chess/game-api`
4. **A "Questions" section** listing anything in the contract you had to interpret.

## How the site switches over (for your information, not your task)

1. Someone sets `game-api-base` in the AEM spreadsheet `/content/suze/game-config` and publishes it.
2. From then on the site calls your API. Appending `?mock=1` to a page still forces the in-browser
   mock, which gives a fallback during the demo.
3. With the real API, the site shows "Invite sent" and no longer shows the game link on screen, so
   the invite email must actually arrive for the friend to join.

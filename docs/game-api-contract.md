# Chess Challenge game API contract

Status: **approved** (v1.0), with the **v1.1 additions** below for consumer data capture and
marketing messaging (2026-10-21, to be implemented by the backend). Shared between the front end (this repo) and the App Builder backend team.
Changes need sign-off from both sides. The front end only talks to this API through
`scripts/game-api.js`; `scripts/game-api-mock.js` implements the same contract in the browser.

## Conventions

- Base URL: the `game-api-base` value of the site `/game-config` sheet (no trailing slash).
- Requests and responses are JSON (`Content-Type: application/json`).
- Auth: every call except `registerPlayer` sends `Authorization: Bearer <token>`,
  using the token returned by `registerPlayer`.
- CORS: the API must allow the site origins (`*.aem.page`, `*.aem.live`, the production
  domain and `http://localhost:3000`) with the `Authorization` and `Content-Type` headers.
- Moves are validated server side with **chess.js 1.4.0** (the same version vendored in
  `scripts/vendor/chess.js`), so client, mock and backend agree on legality.

## Errors

Non-2xx responses return:

```json
{ "error": { "code": "ILLEGAL_MOVE", "message": "free text for logs, never shown to users" } }
```

| Code | HTTP | When |
|---|---|---|
| `VALIDATION` | 400 | Missing or malformed fields, terms not accepted |
| `UNAUTHORIZED` | 401 | Missing, invalid or expired token |
| `NOT_FOUND` | 404 | Unknown `gameId` |
| `GAME_FULL` | 409 | `joinGame` on a game that already has a black player |
| `NOT_YOUR_TURN` | 409 | `makeMove` by the player who is not to move, or by a non-player |
| `STALE_VERSION` | 409 | `makeMove` with an `expectedVersion` that is not the current `version` |
| `ILLEGAL_MOVE` | 422 | Move rejected by chess.js, or game not playable (see "Opening move") |
| `RATE_LIMITED` | 429 | Too many requests (for example invites) |

The front end maps `code` to the localized placeholder `error-<code>` (lower case, for
example `error-illegal-move`) and never displays `message`.

## Endpoints

| Function | Method and path | Request body | Response |
|---|---|---|---|
| `registerPlayer` | `POST /players` | `{ firstName, email, locale, consents: { terms: true, marketing: boolean }, termsVersion }` | `{ playerId, token }` |
| `createGame` | `POST /games` | `{ locale }` | `Game`, caller is white, `status: "waiting"` |
| `getGame` | `GET /games/{gameId}` | none | `Game` |
| `joinGame` | `POST /games/{gameId}/join` | none | `Game`, caller is black, `status: "active"`. Joining a game you already play in returns the game unchanged. |
| `makeMove` | `POST /games/{gameId}/moves` | `{ from, to, promotion?, expectedVersion }` | `Game` |
| `resignGame` | `POST /games/{gameId}/resign` | none | `Game`, `status: "finished"`, `result.outcome: "resign"` |
| `sendInvite` | `POST /games/{gameId}/invites` | `{ email, locale }` | `{ inviteId, gameUrl }` |
| `recordEvent` (v1.1) | `POST /events` | `{ type, data, at }` | `202 { accepted: true }` |

Notes:

- `locale` is the site locale path without slashes around it, for example `masters/en`, `us/es`, `fr/fr`.
- `consents.terms` must be `true`; `consents.marketing` is stored as given and is never pre-ticked.
- `promotion` is one of `q`, `r`, `b`, `n`.
- **Opening move (change agreed 2026-10-16, backend to confirm):** while a game is
  `waiting`, white may play exactly one move (the opening move) so the host can move
  first and then invite a friend to reply. Any other move on a `waiting` game returns
  `NOT_YOUR_TURN` (it is black's turn) or `ILLEGAL_MOVE`. `joinGame` still switches the
  game to `active`, and black replies from there.
- `sendInvite` sends the transactional invite email using the `game-email` sheet of the
  given locale (`/<locale>/game-email.json`, keys `invite-email-subject` and
  `invite-email-body`, tokens `{inviterFirstName}` and `{gameUrl}`). The invitee email is
  used only to send that message.

## Game object

```json
{
  "gameId": "g_8f2k1x",
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

- `version` starts at `0` and increases by one on every state change (join, move, resign).
- `result` is `null` until the game is finished, then
  `{ "outcome": "checkmate | stalemate | draw | resign | abandoned", "winner": "w | b | null" }`.
- `gameUrl` is always `/<locale>/chess-challenge?game=<gameId>`.

## v1.1 additions: consumer data capture and marketing messaging

All additions are backwards compatible. A v1.0 backend that ignores them keeps the site working.

### `registerPlayer`: consent context

The request may include an optional `context`:

```json
{ "context": { "page": "/fr/fr/chess-challenge", "experiment": "exp-chess-001", "variant": "challenger-1" } }
```

The backend stores a consent record for each player:

```json
{
  "terms": { "granted": true, "at": "<ISO>", "version": "<termsVersion>" },
  "marketing": { "granted": false, "at": "<ISO>", "source": "registration", "page": "...", "variant": "..." }
}
```

### `recordEvent`: site events

`POST /events` (Bearer token) with `{ type, data, at }`:
- `type` is one of `registered`, `game-created`, `game-joined`, `first-move`, `invite-sent`,
  `opponent-joined`, `game-finished`, `message-shown`, `message-clicked` (unknown types: `VALIDATION`).
- `data` never contains personal data: `gameId`, `outcome`, `result` (`win|loss|draw`),
  `audience`, `marketingOptIn`, `locale`, `page`, `experiment`, `variant`.
- The response is `202 { "accepted": true }`. The site sends events fire-and-forget and ignores
  any failure.

The same events are pushed in the browser to `window.adobeDataLayer` as
`{ event: "chess:<type>", eventInfo: data }`.

### Connectors (backend only)

Captured profiles and events are passed to pluggable connectors, configured with
`CONNECTORS=log,webhook`:
- **`log`:** logs what would be sent, with no personal data in the log line.
- **`webhook`:** `POST`s a JSON envelope to `WEBHOOK_URL`, signed with an HMAC-SHA256 header
  (`X-Chess-Signature`) using `WEBHOOK_SECRET`.
- **Consent rules:**
  - The profile (first name, email, locale, consents) is forwarded only when `marketing.granted`
    is `true`.
  - Events are always forwarded with a pseudonymous `playerId`, and never with an email or name.

### Post-game follow-up email (backend only, marketing)

- **Trigger:** when a game becomes `finished` with `checkmate`, `stalemate`, `draw` or `resign`.
  An `abandoned` game sends nothing.
- **Recipients:** each player whose `marketing.granted` is `true`, at most one email per player per
  game.
- **Copy:** the `game-email` sheet of the player's locale.
  - Keys: `followup-win-*`, `followup-loss-*` and `followup-draw-*` (`-subject` / `-body`).
  - Tokens: `{firstName}`, `{opponentFirstName}`, `{rematchUrl}` (`<SITE_ORIGIN>/<locale>/chess-challenge`)
    and `{unsubscribeUrl}`.
- **Delivery:** sent through the same email adapter as the invite. In `log` mode nothing is sent.

### Unsubscribe (backend only)

`GET /unsubscribe?t=<token>`:
- `t` is an HMAC-signed playerId with no expiry.
- The backend sets `marketing.granted = false` (keeping the time and source `unsubscribe`), then
  redirects (302) to `<SITE_ORIGIN>/<locale>/chess-challenge?unsubscribed=1`.
- The site shows a confirmation there (placeholder `unsubscribed-confirmation`).
- An invalid token still redirects, with no change.


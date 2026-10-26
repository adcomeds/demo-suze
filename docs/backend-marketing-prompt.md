# Prompt: add consumer data capture and marketing messaging to the chess backend

Copy everything below the line into a coding agent (or hand it to a developer) working in the
**existing App Builder repository** for the Chess project (org AGS955, web action
`chess/game-api`, Stage URL `https://129433-chess-stage.adobeioruntime.net/api/v1/web/chess/game-api`).
This builds on the first brief (`docs/backend-app-builder-prompt.md`).

---

## Goal

Extend the deployed chess game API with the **v1.1 additions** of the contract
(`https://github.com/adcomeds/demo-suze/blob/main/docs/game-api-contract.md`, section "v1.1
additions"):

1. **Consent record**: store a proper consent record for each player at registration.
2. **`POST /events`**: record site events.
3. **Connectors**: pass captured profiles and events to pluggable connectors (`log`, `webhook`),
   so the demo can show data arriving at a third party.
4. **Follow-up email**: after a game ends, send a marketing follow-up email to players who opted
   in, through the project's own SMTP server.
5. **`GET /unsubscribe`**: a link in every marketing email that turns the marketing opt-in off.

This is a demo for Pernod Ricard. The only products are AEM (the site) and App Builder: no Adobe
Experience Platform, Journey Optimizer, Target or Analytics, and no third-party email or CDP
services. Single opt-in is accepted for the demo. Note in the README that double opt-in is needed
for production, in fr/fr at least.

## Hard constraints (unchanged from the first brief)

- **No breaking changes.** Don't change any existing endpoint, field, status or error code. Every
  addition is optional for the client.
- **Logs:** never log first names, emails, tokens or webhook payloads. Log only ids, types, codes
  and timings.
- **chess.js 1.4.0** stays pinned.
- **Email** goes only through the existing adapter (`EMAIL_PROVIDER=log|smtp`, `SMTP_*`, `EMAIL_FROM`).
- **Copy** comes from the site's `game-email` sheets, never from code.

## 1. Consent record

When `POST /players` succeeds, store this on the player record:

```json
"consents": {
  "terms": { "granted": true, "at": "<ISO>", "version": "<termsVersion>" },
  "marketing": { "granted": <bool>, "at": "<ISO>", "source": "registration",
                 "page": "<context.page>", "experiment": "<context.experiment>", "variant": "<context.variant>" }
}
```

- `context` is optional in the request. Accept it when it's missing.
- Validate `context.page` as a path of at most 200 characters, and `experiment`/`variant` as
  `^[\w-]{1,64}$`. Ignore invalid values rather than failing.
- **Retention:** players with `marketing.granted: true` keep their record for 365 days. Others keep
  the current 30 days.
- **Connectors:** emit `profile.created` (see section 3).

## 2. `POST /events`

- **Auth:** Bearer token. Body `{ type, data, at }`.
- **Allowed `type` values:** `registered`, `game-created`, `game-joined`, `first-move`,
  `invite-sent`, `opponent-joined`, `game-finished`, `message-shown`, `message-clicked`.
  - Anything else returns 400 `VALIDATION`.
- **`data`:** keep only these keys, with string, boolean or number values:
  - `gameId`, `color`, `outcome`, `result`, `audience`, `marketingOptIn`
  - `locale`, `page`, `experiment`, `variant`
  - Drop everything else silently. This guarantees no personal data gets through.
- **Storage:** store the last 500 events in State (`events.<yyyy-mm-dd>` lists, 30-day TTL) for
  the demo.
- **Connectors:** emit `event.recorded` with `{ playerId, type, data, at }`.
- **Response:** `202 { "accepted": true }`.
- **Rate limit:** at most 120 events per player per hour, otherwise 429 `RATE_LIMITED`.

## 3. Connectors

Build `connectors.js` with the interface `send(kind, payload)`, where `kind` is one of
`profile.created`, `profile.updated`, `event.recorded` or `email.sent`.

Enable connectors through the `CONNECTORS` input, a comma-separated list (default `log`):

| Connector | Behaviour |
|---|---|
| `log` | Logs `connector=log kind=<kind> playerId=<id>`, never the payload. |
| `webhook` | `POST`s to `WEBHOOK_URL` with JSON `{ "kind", "sentAt", "payload" }` and header `X-Chess-Signature: sha256=<hex HMAC of the raw body with WEBHOOK_SECRET>`. Use a 3 s timeout, one retry, and never block or fail the API response (fire after the response is built, and catch everything). |

**Consent rules**, enforced in one place before any connector runs:
- `profile.*`: forward `{ playerId, firstName, email, locale, consents }` only when
  `consents.marketing.granted` is `true`. Otherwise forward `{ playerId, locale, consents }` only.
- `event.recorded`: always `{ playerId, type, data, at }`, with no email and no name.
- `email.sent`: `{ playerId, template, locale, gameId }`, with no address.

For the live demo, `WEBHOOK_URL` can point at a request inspector, for example webhook.site.
Document how to switch it on and off.

## 4. Post-game follow-up email (marketing)

**When:**
- Hook into the code path where a game becomes `finished`: `makeMove` reaching checkmate,
  stalemate or a draw, and `resignGame`.
- `abandoned` games send nothing.

**Recipients and idempotency:**
- Each player whose `consents.marketing.granted` is `true` at that moment gets one email.
- Store `followupSent: { <playerId>: <ISO> }` on the game, so each player gets at most one email
  per game, even with retries.

**Template choice:**
- winner: `followup-win`, loser: `followup-loss`
- stalemate or draw: `followup-draw`
- resign: the resigning player is the loser.

**Copy:**
- Fetch `${SITE_ORIGIN}/${locale}/game-email.json` (cache it for 5 minutes, as for the invite) and
  read `followup-<x>-subject` and `followup-<x>-body`.
- Tokens:
  - `{firstName}`: the recipient's first name
  - `{opponentFirstName}`: the other player's first name
  - `{rematchUrl}`: `${SITE_ORIGIN}/${locale}/chess-challenge`
  - `{unsubscribeUrl}`: see section 5
- Plain text, `\n` line breaks, no added content.

**Sending:**
- Use the existing email adapter. In `log` mode, log only `followup (dry run) game=<id> template=<x> locale=<l>`.
- Don't delay or fail the move or resign response: send after the response is built and catch all
  errors.
- Emit `email.sent` to the connectors.

## 5. `GET /unsubscribe?t=<token>`

- **Token:** `base64url(playerId + "." + HMAC-SHA256(playerId, UNSUBSCRIBE_SECRET))`, with no
  expiry.
- **Public:** no Bearer token. Allow plain GET from email clients (it's a link, so no CORS is
  needed).
- **Valid token:**
  - set `consents.marketing = { granted: false, at: <now>, source: "unsubscribe" }`
  - emit `profile.updated`
  - respond `302 Location: ${SITE_ORIGIN}/${player.locale}/chess-challenge?unsubscribed=1`
- **Invalid token or unknown player:** respond `302` to
  `${SITE_ORIGIN}/us/en/chess-challenge?unsubscribed=1` and change nothing. Don't reveal
  whether the player exists.
- **Preflight:** answer `OPTIONS` like the other routes, even though it isn't needed.

## New inputs

Add these to `.env.example` and `app.config.yaml`:
- `CONNECTORS` (default `log`)
- `WEBHOOK_URL`
- `WEBHOOK_SECRET`
- `UNSUBSCRIBE_SECRET` (required: fail fast at start-up if it's missing)
- `MARKETING_RETENTION_DAYS` (default 365)

## Tests (required)

- **Consent:** the record is stored with and without `context`, and invalid context values are
  ignored.
- **Events:** allowed types are accepted with 202, unknown types get `VALIDATION`, unknown `data`
  keys are dropped, and the rate limit returns 429.
- **Connectors:**
  - the profile is forwarded only with marketing consent
  - the webhook body is signed correctly
  - a webhook failure never fails the API call
  - the log connector prints no PII
- **Follow-up:**
  - Scholar's mate sends `followup-win` to an opted-in white player and nothing to a non-opted-in
    black player
  - resign maps to loss for the resigning player
  - `abandoned` sends nothing
  - a second finish event sends nothing again (idempotent)
  - `log` mode sends nothing
- **Unsubscribe:** a valid token flips the opt-in and redirects to the player's locale, and a
  tampered token redirects without any change.
- **Privacy:** a log-scan test asserts that no email address or first name appears in any log line
  across all scenarios.
- **Smoke script:** extend `scripts/smoke.sh` to register an opted-in player, finish a game, and
  print the connector log lines.

## Deliverables

1. **The code:** the changes above, with tests passing (`aio app test`), deployed to the Stage
   workspace (`aio app deploy`).
2. **README:** the new inputs, the connector behaviour and consent rules, how to point the webhook
   at a test inspector for the demo, the unsubscribe token format, and the production notes
   (double opt-in, data retention, export and erasure requests).
3. **Questions:** list anything in the contract you had to interpret.

## For your information (front end, already built)

- **Events:** the site pushes the same events to `window.adobeDataLayer` and calls `POST /events`
  fire-and-forget for registered players. Failures are ignored.
- **Consent context:** the registration form sends `context` (page, experiment and variant).
- **On-site messages:** these come from the AEM `player-message` block (no backend involvement),
  and are shown only to players who opted in.
- **Unsubscribe:** the site shows the unsubscribe confirmation when the URL has `?unsubscribed=1`.
- **Copy:** the follow-up email copy is in the `game-email` sheets (keys `followup-win-*`,
  `followup-loss-*`, `followup-draw-*`). Authors must add those rows in AEM and publish; see
  `docs/game-sheets/out/<locale>/game-email.csv`.

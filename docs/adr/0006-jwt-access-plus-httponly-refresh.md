# ADR-0006 — JWT access token + httpOnly refresh cookie

**Status:** accepted

## Context

A browser SPA needs a credential it can attach to API calls without exposing a
long-lived token to JavaScript.

## Decision

A short-lived JWT access token held in memory, and a refresh token in an httpOnly
cookie. `/auth/refresh` returns the new access token **and** the viewer's `userId` and
`role` in the body. CORS runs with `credentials: true`.

## Consequences

- XSS cannot read the refresh token.
- `credentials: true` is load-bearing — without it the browser discards the refresh
  response, so the CORS config cannot be "simplified".
- The access token dies while a tab is open, so the client refreshes **before** sending
  an expired one. It cannot wait for a 401, because public routes are `@OptionalAuth()`
  and answer an expired token with 200-anonymous.
- The refresh response body is authoritative about identity, with the token parsed as a
  fallback when the body omits `userId` or carries a role this client does not know —
  and only while both describe the same person, since taking the token wholesale would
  silently swap the viewer. A refresh that yields neither ends the session rather than
  storing a token with no identity, which reported a signed-in viewer as anonymous
  everywhere.
- Only two things end a session: a 401 from `/auth/refresh`, and a refresh that answered
  with nothing usable. Clearing on any failure signed viewers out over transient network
  errors.
- Expiry is measured against the server's `Date` header, not the device clock. Without
  that, a machine whose clock is wrong reads every token as expired and refreshes on
  every request forever.

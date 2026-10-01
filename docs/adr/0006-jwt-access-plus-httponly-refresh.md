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
- Identity comes from the refresh response body, not from parsing the token. Parsing was
  tried and produced a half-session — a valid token with no `userId` — whenever the
  payload didn't decode.
- Only a 401 from `/auth/refresh` ends a session. Clearing on any failure signed viewers
  out over transient network errors.

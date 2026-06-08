# Goodbye Endpoint — Specification

## Objective
Extend the existing `hello-world-api` project with a second endpoint, `GET /goodbye`, that returns a JSON farewell message. Mirror the structure, conventions, and test style of the original `GET /hello` endpoint. Add Jest + supertest coverage for both the default and named-query cases.

## Stack & Dependencies (reuse)
No new runtime or dev dependencies are introduced. Reuse the existing stack from [hello-world-api.md](./hello-world-api.md):
- **Runtime:** Node.js (>= 18)
- **Framework:** Express (^4.19.x)
- **Test runner:** Jest (^29.x)
- **HTTP assertions:** supertest (^7.x)

`package.json` is unchanged (no new scripts, no new deps).

## Module Contracts (diff)

### `src/app.js` (modify)
- Register an additional handler: `GET /goodbye`.
- The existing fallback 404 handler must remain registered **last**, so unknown routes continue to return `{"error":"Not Found"}` with status `404`.
- Still does **not** call `app.listen`.

### `src/server.js` (no change)
- Unchanged. Continues to import `./app` and bind to `PORT`.

## Endpoint Specification

### `GET /goodbye`
- **Query params:**
  - `name` (optional, string)
- **Response:** `200 OK`, `Content-Type: application/json`
- **Body:**
  - No `name` (or empty string): `{"message":"Goodbye, World!"}`
  - With `name=Foo`: `{"message":"Goodbye, Foo!"}`
- Name value is interpolated as-is (no sanitization required for this scope), matching the `GET /hello` behavior.

### Any other route / method
- Unchanged from the existing spec: `404 Not Found`, JSON body `{"error":"Not Found"}`.

## Test Specification (additions)

**Decision:** Add a new file `tests/goodbye.test.js` rather than extending `tests/hello.test.js`. Justification: the existing project layout has one test file per endpoint concept, and keeping `/goodbye` tests isolated preserves clean per-endpoint failure signal and mirrors the one-file-per-endpoint convention implied by `hello.test.js`.

### `tests/goodbye.test.js`
Use `const request = require('supertest'); const app = require('../src/app');`.

Required test cases:
1. `GET /goodbye` → status `200`, body equals `{ message: 'Goodbye, World!' }`.
2. `GET /goodbye?name=Foo` → status `200`, body equals `{ message: 'Goodbye, Foo!' }`.

The existing 404 test in `tests/hello.test.js` continues to cover unknown-route handling; no duplicate 404 test is needed here.

## Acceptance Criteria
- [ ] `npm install` completes without errors (no dependency changes expected).
- [ ] `npm test` runs Jest and all tests pass (existing 3 from `hello.test.js` + new 2 from `goodbye.test.js` = 5 total).
- [ ] `npm start` starts a server on port 3000 (or `$PORT`); `curl localhost:3000/goodbye` returns `{"message":"Goodbye, World!"}`.
- [ ] `curl "localhost:3000/goodbye?name=Foo"` returns `{"message":"Goodbye, Foo!"}`.
- [ ] `curl -i localhost:3000/goodbye` returns HTTP 200 with `Content-Type: application/json`.
- [ ] `curl -i localhost:3000/unknown` still returns HTTP 404 with JSON `{"error":"Not Found"}` (regression check).
- [ ] `curl localhost:3000/hello` still returns `{"message":"Hello, World!"}` (regression check).
- [ ] `app.js` still does not bind a port (importable in tests without side effects).

## File List
- `src/app.js` (modify — add `GET /goodbye` handler before the 404 fallback)
- `tests/goodbye.test.js` (new)

## Out of Scope
- Authentication, logging middleware, input validation/sanitization, CORS, Dockerfile, CI config, TypeScript.
- Changes to `GET /hello`, `src/server.js`, or `package.json`.
- Localization of the farewell message.

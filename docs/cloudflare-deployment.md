# Cloudflare Pages/Workers deployment notes

Daedalus-Main now includes a stateless import shell that can run on Cloudflare.

## What is included

- Worker-compatible request handler at `/src/import-shell.js`
- Worker entrypoint at `/src/worker.js`
- Stateless import route: `GET /import` and `POST /import` (also available on `/`)
- Local app shell runner: `npm start`

## Cloudflare Workers

1. Point your Worker entry to `src/worker.js`.
2. Ensure requests are routed to the Worker.
3. No KV, D1, R2, Durable Objects, or external databases are required.

## Cloudflare Pages Functions

1. Reuse `handleImportShellRequest` from `src/import-shell.js` in your Pages Function route.
2. Route `/` and `/import` to that function.
3. Keep persistence disabled unless explicitly enabled later.

## Stateless boundary

- The import shell parses and compiles the uploaded/pasted package in-request only.
- No package, twin, or customer data is written to storage.
- No Google OAuth integration is included.
- No portal, PDF, or physics/simulation features are included.

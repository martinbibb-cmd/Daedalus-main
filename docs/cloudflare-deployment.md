# Cloudflare Pages/Workers deployment notes

Daedalus-Main now includes a stateless import shell that can run on Cloudflare.

This Cloudflare deployment is the current demo/import-shell/control-plane deployment. It is not the future production evidence-processing backend.

The production deployment boundary is defined in [Deployment Architecture](DEPLOYMENT_ARCHITECTURE.md). Future production evidence processing is Cloudflare front door plus private processing and private twin storage.

## What is included

- Worker-compatible request handler at `/src/import-shell.js`
- Worker entrypoint at `/src/worker.js`
- Stateless import route: `GET /import` and `POST /import` (also available on `/`)
- Local app shell runner: `npm start`

## Deployment role

Cloudflare Pages and Workers host the public UI/demo/import shell and API gateway/control-plane surface.

R2, D1, and Queues may be added later only within the bounded roles defined in the deployment architecture:

- R2 for large capture artifacts where explicitly configured.
- D1 for lightweight edge metadata only.
- Queues for asynchronous processing triggers.

Raw sensitive evidence processing, transcription, diarisation, LLM extraction, evidence graph construction, twin compilation, physics, method/rationale generation, and Postgres/twin storage belong on the private VM or controlled server backend.

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
- Raw customer evidence must not be treated as safely processed in a Cloudflare-only demo.
- Sensitive survey evidence should prefer a local or private LLM route.
- Cloud providers may be added later behind provider interfaces only.

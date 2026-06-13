# Daedalus Deployment Architecture

This document defines the intended production deployment architecture before any Cloudflare deployment work is performed.

It is an architecture boundary, not an implementation plan. It does not add storage logic, processing logic, runtime behaviour, or secrets.

## Summary

Daedalus production deployment is split into:

* Cloudflare as the public front door, UI shell, import/demo surface, API gateway, and lightweight edge control plane.
* A private VM or controlled server as the sensitive evidence-processing backend and twin store.

The current Cloudflare deployment target is a demo/import-shell/control-plane deployment. It must not be treated as the complete production evidence backend.

Future production evidence processing should use Cloudflare as the front door in front of private processing and private persistence.

## Cloudflare Responsibilities

Cloudflare may host and coordinate public, low-state deployment surfaces:

* Cloudflare Pages hosts the UI, demo, import shell, and portal only.
* A Cloudflare Worker acts as the API gateway and control plane.
* Cloudflare R2 stores large capture artifacts where explicitly configured.
* Cloudflare D1 stores lightweight edge metadata only.
* Cloudflare Queues may trigger asynchronous processing jobs.

Cloudflare should not be the place where raw sensitive customer evidence is treated as safely processed simply because a demo can upload, import, or view data.

## Private Backend Responsibilities

A private VM or other controlled server handles sensitive evidence processing and durable production twin storage.

The private backend owns:

* raw sensitive evidence processing
* transcription
* diarisation
* LLM extraction
* evidence graph construction
* twin compilation
* physics processing
* method and rationale generation
* Postgres or equivalent twin store

This backend is the production evidence-processing backend. It is separate from the Cloudflare-hosted UI shell and control plane.

## Privacy Boundary

Raw customer evidence must not be treated as safely processed in a Cloudflare-only demo.

Sensitive survey evidence should prefer a local or private LLM route. That route may run on the private VM or another controlled environment with explicit operational controls.

Cloud LLM or processing providers may be added later only behind provider interfaces. Adding a provider must not collapse the boundary between the Cloudflare front door and the private evidence-processing backend.

## Deployment Modes

### Current Cloudflare Deployment

The current Cloudflare deployment is a demo, import-shell, and control-plane deployment.

It may demonstrate import/view workflows and coordinate calls, but it is not the production evidence-processing backend and should not imply that raw customer evidence has been privately processed.

### Future Production Deployment

The future production deployment is:

```text
Customer/user
  -> Cloudflare Pages UI/demo/import shell/portal
  -> Cloudflare Worker API gateway/control plane
  -> private VM or controlled server
  -> private processing pipeline
  -> Postgres/twin store
```

R2, D1, and Queues may support this flow only within their bounded roles:

* R2 for large capture artifacts where configured.
* D1 for lightweight edge metadata only.
* Queues for asynchronous job triggers.

## Non-Goals

This document does not:

* change product behaviour
* add storage logic
* add processing logic
* add secrets
* select a Cloudflare account, project, or binding
* define provider-specific LLM integrations
* define a database schema

## Decision Record

The deployment boundary is recorded in [ADR-0001](adr/ADR-0001-deployment-boundary.md).

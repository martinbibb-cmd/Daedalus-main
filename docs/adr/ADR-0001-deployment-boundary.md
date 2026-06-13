# ADR-0001: Deployment Boundary

## Status

Accepted

## Context

Daedalus needs a production deployment architecture before Cloudflare deployment work begins.

Cloudflare is appropriate for the public UI shell, demo/import experience, portal, API gateway, control plane, lightweight edge metadata, large configured capture artifacts, and asynchronous job triggers.

Sensitive customer evidence processing has different privacy and operational requirements. Raw evidence, transcription, diarisation, LLM extraction, evidence graphs, twin compilation, physics, rationale generation, and durable twin persistence should run in a controlled private environment.

## Decision

Cloudflare is the public front door and deployment shell.

A private server or VM is the sensitive evidence-processing backend.

## Consequences

The current Cloudflare deployment is a demo/import-shell/control-plane deployment, not the full production evidence backend.

Raw customer evidence must not be treated as safely processed in a Cloudflare-only demo.

Sensitive survey evidence should prefer a local or private LLM route.

Future cloud processing providers may be added only behind provider interfaces.

This decision does not add runtime behaviour, storage logic, processing logic, or secrets.

# Daedalus-Main

Daedalus-Main exists to understand and explain reality.

Before any physics engines, visualisations, portals, PDF outputs, or user interfaces are implemented, this repository defines the constitutional rules and core architectural shape for Daedalus Main.

## Purpose

Daedalus Main is responsible for:

* Importing DaedalusPackage payloads
* Compiling House, System, and Home twins into a Unified Property Twin
* Preserving uncertainty and provenance
* Modelling physical behaviour
* Comparing services delivered by system configurations
* Explaining outcomes through visualisation, portal, PDF, and engineer handover

Daedalus Main is not responsible for:

* Capturing evidence
* Altering captured evidence
* Making recommendations
* Ranking options
* Scoring options
* Determining suitability
* Quoting
* Pricing
* Sales workflows
* CRM workflows

## Architecture Documents

* [Daedalus Main Architecture Constitution & AI Guardrails](docs/architecture-constitution.md)
* [Daedalus Main Core Architecture Foundation](docs/core-architecture-foundation.md)
* [Architecture Assumptions](docs/architecture-assumptions.md)
* [Architecture Fixtures](docs/architecture-fixtures/README.md)

## Initial Main Import Pipeline

The first executable Main pipeline now supports:

* importing a `DaedalusPackage` v3 payload
* validating package structure and provenance
* compiling house, system, and home twins into an initial unified property twin model
* preserving evidence, relationships, uncertainty, and provenance links

## Commands

* `npm run build`
* `npm test`
* `npm start`

## Cloudflare-ready import shell

Daedalus-Main now includes a basic stateless web import shell for uploading or pasting a `DaedalusPackage` JSON and compiling a twin summary.

- Route: `/import` (also available on `/`)
- Warning shown in UI: "This package is processed locally/in-session unless storage is later enabled."
- Validation errors are rendered as structured path/code/message/value rows
- No persistence, OAuth, portal, PDF, or physics features are enabled in this shell

See [Cloudflare deployment notes](docs/cloudflare-deployment.md).

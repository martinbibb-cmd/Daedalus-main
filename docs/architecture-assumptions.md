# Architecture Assumptions

This document tracks the active architectural assumptions for Atlas Mind DAE before implementation begins.

Each assumption is falsifiable. The architecture-fixtures directory contains executable-style fixtures that test each assumption.

## Assumptions

### A1 — Scan remains capture-first

Scan captures evidence. Scan does not interpret evidence.

Scan may tag observations using the approved tag set. Scan does not resolve, calculate, recommend, or judge.

**Approved Scan output tags:**

* boiler
* cylinder
* flue
* gas meter
* risk
* customer goal
* photo evidence
* video evidence
* voice evidence
* surveyor note

**Not allowed in Scan output:**

* resolved product SKU
* inferred manufacturer or model unless explicitly entered by the surveyor
* calculated heat loss
* recommendations
* pricing
* suitability decisions
* customer journey copy

### A2 — Contracts stores observed truth and signed outputs

Contracts is the store of record for:

* observations captured in the field
* measurements taken directly
* customer-stated information
* provenance of all the above
* signed outputs promoted from Mind

### A3 — Contracts does not store inferred understanding by default

Inferred values produced by Mind remain in Mind unless explicitly promoted.

Promotion requires a deliberate architectural decision and must satisfy the Locus Promotion Rule defined in `core-architecture-foundation.md`.

### A4 — Identity resolution belongs in Mind during Alpha

Locus, Timeline, and Snapshot are Mind-only analytical constructs until practical implementation demonstrates clear operational value that cannot be achieved within Mind alone.

Contracts stores visit packages as observations. Mind assembles identity from those observations.

### A5 — Locus, Timeline, and Snapshot are not promoted until earned

These constructs must not be added to Contracts schema ahead of demonstrated need.

### A6 — Simulation Core may be required but must earn implementation

Simple sequential calculations may satisfy many scenarios. Coupled simulation must be demonstrated to be necessary before the Simulation Core is built.

### A7 — Twins are representations, not root entities

A twin is built from evidence. It is not the source of truth. The source of truth remains in Contracts.

### A8 — Unknown is valid

An observation may be unknown. An asset may have an unknown manufacturer, model, or condition.

Unknown is a valid and complete state. It must not be rejected or replaced with a default.

### A9 — Provenance is mandatory

Every piece of data in Contracts must carry provenance. Evidence without provenance is not valid evidence.

## Fixture Index

| Assumption | Fixture |
|---|---|
| A1 — Scan capture-first | [Fixture 01 — Scan Raw Capture](architecture-fixtures/fixture-01-scan-raw-capture.md) |
| A2, A3 — Contracts boundary | [Fixture 02 — Contracts Boundary](architecture-fixtures/fixture-02-contracts-boundary.md) |
| A8, A9 — Unknown and provenance | [Fixture 03 — Unknown Preservation](architecture-fixtures/fixture-03-unknown-preservation.md) |
| A6 — Simulation Core coupling | [Fixture 04 — Simulation Core Coupling](architecture-fixtures/fixture-04-simulation-core-coupling.md) |
| A4, A5 — Scenario branching and Contracts isolation | [Fixture 05 — Scenario Branching](architecture-fixtures/fixture-05-scenario-branching.md) |

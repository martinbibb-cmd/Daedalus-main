# Architecture Assumptions

This document tracks the active architectural assumptions for Daedalus-Main before implementation begins.

Each assumption is falsifiable. The architecture-fixtures directory contains executable-style fixtures that test each assumption.

## Assumptions

### A1 — Daedalus Capture remains capture-first

Daedalus Capture captures evidence. Daedalus Capture does not interpret evidence.

Daedalus Capture may tag observations using the approved tag set. Daedalus Capture does not resolve, calculate, recommend, rank, score, or judge.

**Approved Daedalus Capture output tags:**

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

**Not allowed in Daedalus Capture output:**

* resolved product SKU
* inferred manufacturer or model unless explicitly entered by the surveyor
* calculated heat loss
* recommendation or decision fields
* pricing
* suitability decisions
* customer journey copy

### A2 — Daedalus Contracts stores observed truth and signed outputs

Daedalus Contracts is the store of record for:

* observations captured in the field
* measurements taken directly
* customer-stated information
* provenance of all the above
* signed outputs promoted from Daedalus Main

### A3 — Daedalus Contracts does not store inferred understanding by default

Inferred values produced by Daedalus Main remain in Daedalus Main unless explicitly promoted.

Promotion requires a deliberate architectural decision and must satisfy the Locus Promotion Rule defined in `core-architecture-foundation.md`.

### A4 — Identity resolution belongs in Daedalus Main during Alpha

Locus, Timeline, and Snapshot are Daedalus Main analytical constructs until practical implementation demonstrates clear operational value that cannot be achieved within Daedalus Main alone.

Daedalus Contracts stores DaedalusPackage observations. Daedalus Main assembles identity from those observations.

### A5 — Locus, Timeline, and Snapshot are not promoted until earned

These constructs must not be added to Daedalus Contracts schema ahead of demonstrated need.

### A6 — Physics engine coupling may be required but must earn implementation

Simple sequential calculations may satisfy many scenarios. Coupled modelling must be demonstrated to be necessary before model orchestration for coupled execution is built.

### A7 — Twins are representations, not root entities

A twin is built from evidence. It is not the source of truth. The source of truth remains in Daedalus Contracts.

### A8 — Unknown is valid

An observation may be unknown. An asset may have an unknown manufacturer, model, or condition.

Unknown is a valid and complete state. It must not be rejected or replaced with a default.

### A9 — Provenance is mandatory

Every piece of data in Daedalus Contracts must carry provenance. Evidence without provenance is not valid evidence.

### A10 — Service comparison must not become recommendation

Daedalus Main may compare delivered services between configurations, but must not rank, score, prescribe, or select a best option.

## Fixture Index

| Assumption | Fixture |
|---|---|
| A1 — Daedalus Capture capture-first | [Fixture 01 — Daedalus Capture Raw Package](architecture-fixtures/fixture-01-scan-raw-capture.md) |
| A2, A3 — Daedalus Contracts boundary | [Fixture 02 — Daedalus Contracts Boundary](architecture-fixtures/fixture-02-contracts-boundary.md) |
| A8, A9 — Unknown and provenance | [Fixture 03 — Unknown Preservation](architecture-fixtures/fixture-03-unknown-preservation.md) |
| A6 — Physics coupling | [Fixture 04 — Physics Coupling Earned Through Behaviour](architecture-fixtures/fixture-04-simulation-core-coupling.md) |
| A3, A4, A5 — Service branching and Contracts isolation | [Fixture 05 — Service Comparison Branching](architecture-fixtures/fixture-05-scenario-branching.md) |
| A10 — No recommendation outputs | [Fixture 06 — No Recommendation Output](architecture-fixtures/fixture-06-no-recommendation.md) |

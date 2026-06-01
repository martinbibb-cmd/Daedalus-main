# Architecture Fixtures

Executable-style fixtures that test the Atlas Mind architectural assumptions before implementation begins.

Each fixture defines a concrete scenario with input JSON, expected output JSON, and explicit pass and fail conditions.

These fixtures exist to catch architectural drift. When Scan produces real JSON output, each fixture must be evaluated against actual data.

## Fixtures

| Fixture | Assumption tested | Status |
|---|---|---|
| [Fixture 01 — Scan Raw Capture](fixture-01-scan-raw-capture.md) | Scan remains capture-first | Pending real Scan output |
| [Fixture 02 — Contracts Boundary](fixture-02-contracts-boundary.md) | Contracts preserves observed truth | Pending real Scan output |
| [Fixture 03 — Unknown Preservation](fixture-03-unknown-preservation.md) | Unknown is valid | Pending real Scan output |
| [Fixture 04 — Simulation Core Coupling](fixture-04-simulation-core-coupling.md) | Simulation Core must earn implementation | Pending engine implementation |
| [Fixture 05 — Scenario Branching](fixture-05-scenario-branching.md) | Scenarios do not pollute Contracts | Pending Mind implementation |

## Rules

Each fixture must include:

* Scenario description
* Input JSON
* Expected output JSON
* Pass condition
* Fail condition
* Architectural impact
* Assumptions tested

## Next Step

Get Scan running. Export real JSON. Evaluate each fixture against actual output.

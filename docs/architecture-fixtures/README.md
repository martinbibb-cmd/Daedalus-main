# Architecture Fixtures

Executable-style fixtures that test the Daedalus Main architectural assumptions before implementation begins.

Each fixture defines a concrete scenario with input JSON, expected output JSON, and explicit pass and fail conditions.

These fixtures exist to catch architectural drift. When Daedalus Capture produces real JSON output, each fixture must be evaluated against actual data.

## Fixtures

| Fixture | Assumption tested | Status |
|---|---|---|
| [Fixture 01 — Daedalus Capture Raw Package](fixture-01-scan-raw-capture.md) | Daedalus Capture remains capture-first | Pending real Daedalus Capture output |
| [Fixture 02 — Daedalus Contracts Boundary](fixture-02-contracts-boundary.md) | Daedalus Contracts preserves observed truth | Pending real Daedalus Capture output |
| [Fixture 03 — Unknown Preservation](fixture-03-unknown-preservation.md) | Unknown is valid | Pending real Daedalus Capture output |
| [Fixture 04 — Physics Coupling Earned Through Behaviour](fixture-04-simulation-core-coupling.md) | Physics coupling must earn implementation | Pending physics implementation |
| [Fixture 05 — Service Comparison Branching](fixture-05-scenario-branching.md) | Service comparison does not pollute Daedalus Contracts | Pending Daedalus Main implementation |
| [Fixture 06 — No Recommendation Output](fixture-06-no-recommendation.md) | Service comparison without recommendation | Pending Daedalus Main implementation |

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

Get Daedalus Capture running. Export real JSON. Evaluate each fixture against actual output.

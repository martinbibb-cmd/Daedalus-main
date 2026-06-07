# Fixture 02 — Daedalus Contracts Boundary

## Assumptions Tested

* A2 — Daedalus Contracts stores observed truth and signed outputs
* A3 — Daedalus Contracts does not store inferred understanding by default

## Scenario

A surveyor visits a property and records the external wall construction as unknown and unverified. The surveyor does not have access to the wall cavity and cannot confirm insulation.

Daedalus Main later processes energy bills and infers that the property likely has uninsulated solid walls based on consumption patterns.

The observed Daedalus Contracts record must remain unchanged. The Daedalus Main inference must exist only in Daedalus Main output and must not overwrite or supplement the Daedalus Contracts observation.

## Input JSON

### Daedalus Capture export — observed wall record

```json
{
  "observation_id": "obs-wall-001",
  "tag": "surveyor note",
  "subject": "external wall construction",
  "observed_value": "unknown",
  "verification_status": "unverified",
  "surveyor_note": "Cannot confirm wall construction or insulation. No cavity access. No visible evidence of retrofit.",
  "provenance": {
    "method": "surveyor-observation",
    "captured_by": "surveyor-007",
    "captured_at": "2026-06-01T09:45:00Z"
  }
}
```

### Daedalus Main input — energy bill analysis

```json
{
  "analysis_id": "main-infer-001",
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "source": "energy-bill-analysis",
  "inferred_at": "2026-06-01T14:00:00Z",
  "inferences": [
    {
      "subject": "external wall construction",
      "inferred_value": "solid wall, likely uninsulated",
      "confidence": 0.72,
      "basis": "consumption pattern exceeds benchmark for property age and floor area",
      "inference_method": "statistical-comparison"
    }
  ]
}
```

## Expected Output JSON

### Daedalus Contracts record — after Daedalus Main has run

The observed record must remain exactly as captured. No Daedalus Main inference has modified it.

```json
{
  "observation_id": "obs-wall-001",
  "tag": "surveyor note",
  "subject": "external wall construction",
  "observed_value": "unknown",
  "verification_status": "unverified",
  "surveyor_note": "Cannot confirm wall construction or insulation. No cavity access. No visible evidence of retrofit.",
  "provenance": {
    "method": "surveyor-observation",
    "captured_by": "surveyor-007",
    "captured_at": "2026-06-01T09:45:00Z"
  },
  "main_inference": null
}
```

### Daedalus Main output — wall inference

The inferred value lives in Daedalus Main output only.

```json
{
  "main_output_id": "main-out-001",
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "generated_at": "2026-06-01T14:00:00Z",
  "wall_analysis": {
    "contracts_observation_ref": "obs-wall-001",
    "observed_value": "unknown",
    "inferred_value": "solid wall, likely uninsulated",
    "inferred": true,
    "confidence": 0.72,
    "basis": "consumption pattern exceeds benchmark for property age and floor area",
    "inference_method": "statistical-comparison",
    "promoted_to_contracts": false
  }
}
```

## Pass Condition

* The Daedalus Contracts observation for the wall retains `observed_value: "unknown"` and `verification_status: "unverified"` after Daedalus Main has run.
* The Daedalus Main inference exists in Daedalus Main output only.
* `promoted_to_contracts` is `false` unless a deliberate promotion decision has been made.
* No field on the Daedalus Contracts record has been modified by Daedalus Main without explicit promotion.

## Fail Condition

* The Daedalus Contracts observation for the wall has been updated to reflect the Daedalus Main inference.
* The `observed_value` has been replaced or supplemented with `"solid wall, likely uninsulated"`.
* Daedalus Main has written inferred data to Daedalus Contracts without a promotion event.

## Architectural Impact

If this fixture fails, Daedalus Contracts is no longer a reliable store of observed truth.

Downstream systems reading Daedalus Contracts would receive inferred values as if they were directly observed, destroying the provenance chain and invalidating any audit trail.

## Notes

Promotion from Daedalus Main to Daedalus Contracts is a separate deliberate process governed by the Locus Promotion Rule in `core-architecture-foundation.md`. This fixture does not test promotion — it tests that promotion does not happen silently.

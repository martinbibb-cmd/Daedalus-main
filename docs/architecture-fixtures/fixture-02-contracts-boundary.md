# Fixture 02 — Contracts Boundary

## Assumptions Tested

* A2 — Contracts stores observed truth and signed outputs
* A3 — Contracts does not store inferred understanding by default

## Scenario

A surveyor visits a property and records the external wall construction as unknown and unverified. The surveyor does not have access to the wall cavity and cannot confirm insulation.

Mind later processes energy bills and infers that the property likely has uninsulated solid walls based on consumption patterns.

The observed Contracts record must remain unchanged. The Mind inference must exist only in Mind output and must not overwrite or supplement the Contracts observation.

## Input JSON

### Scan export — observed wall record

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

### Mind input — energy bill analysis

```json
{
  "analysis_id": "mind-infer-001",
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

### Contracts record — after Mind has run

The observed record must remain exactly as captured. No Mind inference has modified it.

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
  "mind_inference": null
}
```

### Mind output — wall inference

The inferred value lives in Mind output only.

```json
{
  "mind_output_id": "mind-out-001",
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "generated_at": "2026-06-01T14:00:00Z",
  "wall_analysis": {
    "contracts_observation_ref": "obs-wall-001",
    "observed_value": "unknown",
    "inferred_value": "solid wall, likely uninsulated",
    "confidence": 0.72,
    "basis": "consumption pattern exceeds benchmark for property age and floor area",
    "inference_method": "statistical-comparison",
    "promoted_to_contracts": false
  }
}
```

## Pass Condition

* The Contracts observation for the wall retains `observed_value: "unknown"` and `verification_status: "unverified"` after Mind has run.
* The Mind inference exists in Mind output only.
* `promoted_to_contracts` is `false` unless a deliberate promotion decision has been made.
* No field on the Contracts record has been modified by Mind without explicit promotion.

## Fail Condition

* The Contracts observation for the wall has been updated to reflect the Mind inference.
* The `observed_value` has been replaced or supplemented with `"solid wall, likely uninsulated"`.
* Mind has written inferred data to Contracts without a promotion event.

## Architectural Impact

If this fixture fails, Contracts is no longer a reliable store of observed truth.

Downstream systems reading Contracts would receive inferred values as if they were directly observed, destroying the provenance chain and invalidating any audit trail.

## Notes

Promotion from Mind to Contracts is a separate deliberate process governed by the Locus Promotion Rule in `core-architecture-foundation.md`. This fixture does not test promotion — it tests that promotion does not happen silently.

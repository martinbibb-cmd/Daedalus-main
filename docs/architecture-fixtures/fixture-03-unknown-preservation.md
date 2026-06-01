# Fixture 03 — Unknown Preservation

## Assumptions Tested

* A8 — Unknown is valid
* A9 — Provenance is mandatory

## Scenario

A surveyor visits a property and records a hot water cylinder. The cylinder has no visible data plate. The manufacturer and model are unknown. The surveyor cannot estimate the age or capacity from visual inspection alone.

The observation must be accepted into Contracts exactly as captured. The ingestion layer must not reject it, default it, or invent a manufacturer or model.

## Input JSON

### Scan export — unidentified cylinder

```json
{
  "observation_id": "obs-cyl-001",
  "tag": "cylinder",
  "location": "airing cupboard",
  "manufacturer": null,
  "model": null,
  "capacity_litres": null,
  "age_years": null,
  "data_plate_visible": false,
  "identity_resolved": false,
  "review_status": "needs-review",
  "surveyor_note": "Unbranded cylinder in airing cupboard. No data plate visible. Cannot confirm manufacturer, model, capacity or age.",
  "evidence_refs": ["obs-cyl-photo-001"],
  "provenance": {
    "method": "surveyor-observation",
    "captured_by": "surveyor-007",
    "captured_at": "2026-06-01T10:15:00Z"
  }
}
```

## Expected Output JSON

### Contracts record — stored cylinder observation

The record must be accepted and stored exactly as captured. Unknown fields remain null. Review status is preserved.

```json
{
  "observation_id": "obs-cyl-001",
  "tag": "cylinder",
  "location": "airing cupboard",
  "manufacturer": null,
  "model": null,
  "capacity_litres": null,
  "age_years": null,
  "data_plate_visible": false,
  "identity_resolved": false,
  "review_status": "needs-review",
  "surveyor_note": "Unbranded cylinder in airing cupboard. No data plate visible. Cannot confirm manufacturer, model, capacity or age.",
  "evidence_refs": ["obs-cyl-photo-001"],
  "provenance": {
    "method": "surveyor-observation",
    "captured_by": "surveyor-007",
    "captured_at": "2026-06-01T10:15:00Z"
  },
  "ingestion_status": "accepted",
  "ingestion_notes": null
}
```

## Pass Condition

* The observation is accepted by ingestion without error.
* `manufacturer` remains `null`.
* `model` remains `null`.
* `identity_resolved` remains `false`.
* `review_status` remains `"needs-review"`.
* `ingestion_status` is `"accepted"`.
* All provenance fields are present and unchanged.

## Fail Condition

* Ingestion rejects the observation because manufacturer or model is null.
* Ingestion replaces null values with a default manufacturer, model, or capacity.
* Ingestion marks the observation as invalid because it is incomplete.
* Provenance is stripped or modified during ingestion.
* `identity_resolved` is set to `true` without a corresponding surveyor entry.

## Architectural Impact

If this fixture fails, incomplete surveys cannot be stored in Contracts. This means a survey cannot be captured and ingested unless every asset is fully identified, which is impossible in practice.

Incomplete surveys are the norm in the field. The architecture must accommodate unknown as a first-class state at every stage.

## Notes

`needs-review` is a valid terminal state for an observation. It does not block ingestion. It flags the record for future verification when more information becomes available.

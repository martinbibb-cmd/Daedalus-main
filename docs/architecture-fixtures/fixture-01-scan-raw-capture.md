# Fixture 01 — Daedalus Capture Raw Package

## Assumptions Tested

* A1 — Daedalus Capture remains capture-first
* Daedalus Capture may tag observations using the approved tag set
* Daedalus Capture does not resolve, calculate, recommend, rank, score, or judge

## Scenario

A surveyor visits a property. The heating system is a combi boiler located in a kitchen cupboard. The surveyor takes a photo, records a short video, and adds a voice note describing the location and visible pipework.

No product identity is resolved. No heat loss is calculated. No recommendation is made.

## Input JSON

The following represents the raw field capture as submitted by the surveyor before any downstream processing.

```json
{
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "surveyor_id": "surveyor-007",
  "captured_at": "2026-06-01T09:30:00Z",
  "observations": [
    {
      "observation_id": "obs-001",
      "tag": "boiler",
      "location": "kitchen cupboard",
      "visible_label": null,
      "data_plate_readable": false,
      "surveyor_note": "Combi boiler in base unit cupboard under worktop. No data plate visible from outside. Pipework in poor condition.",
      "provenance": {
        "method": "surveyor-observation",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:30:00Z"
      }
    },
    {
      "observation_id": "obs-002",
      "tag": "photo evidence",
      "asset_ref": "obs-001",
      "file_ref": "photo-001.jpg",
      "provenance": {
        "method": "device-camera",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:31:00Z"
      }
    },
    {
      "observation_id": "obs-003",
      "tag": "video evidence",
      "asset_ref": "obs-001",
      "file_ref": "video-001.mp4",
      "provenance": {
        "method": "device-camera",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:32:00Z"
      }
    },
    {
      "observation_id": "obs-004",
      "tag": "voice evidence",
      "asset_ref": "obs-001",
      "file_ref": "voice-001.m4a",
      "provenance": {
        "method": "device-microphone",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:33:00Z"
      }
    }
  ]
}
```

## Expected Output JSON

The following represents the valid Daedalus Capture export. Only approved tags appear. No resolved identity, no calculations, no recommendations.

```json
{
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "surveyor_id": "surveyor-007",
  "captured_at": "2026-06-01T09:30:00Z",
  "capture_version": "0.1.0",
  "observations": [
    {
      "observation_id": "obs-001",
      "tag": "boiler",
      "location": "kitchen cupboard",
      "manufacturer": null,
      "model": null,
      "identity_resolved": false,
      "surveyor_note": "Combi boiler in base unit cupboard under worktop. No data plate visible from outside. Pipework in poor condition.",
      "evidence_refs": ["obs-002", "obs-003", "obs-004"],
      "provenance": {
        "method": "surveyor-observation",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:30:00Z"
      }
    },
    {
      "observation_id": "obs-002",
      "tag": "photo evidence",
      "asset_ref": "obs-001",
      "file_ref": "photo-001.jpg",
      "provenance": {
        "method": "device-camera",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:31:00Z"
      }
    },
    {
      "observation_id": "obs-003",
      "tag": "video evidence",
      "asset_ref": "obs-001",
      "file_ref": "video-001.mp4",
      "provenance": {
        "method": "device-camera",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:32:00Z"
      }
    },
    {
      "observation_id": "obs-004",
      "tag": "voice evidence",
      "asset_ref": "obs-001",
      "file_ref": "voice-001.m4a",
      "provenance": {
        "method": "device-microphone",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:33:00Z"
      }
    }
  ]
}
```

## Pass Condition

* Daedalus Capture exports tagged observations using only approved tags.
* No `resolved_sku` field is present.
* No `inferred_manufacturer` or `inferred_model` field is present unless explicitly entered by the surveyor.
* No `heat_loss` field is present.
* No `recommendation`, `rank`, or `score` field is present.
* No `suitability` field is present.
* No `pricing` field is present.
* Every observation carries a `provenance` block.

## Fail Condition

* Daedalus Capture output contains any of the following fields: `resolved_sku`, `heat_loss`, `recommendation`, `suitability`, `pricing`, `customer_journey_copy`, `rank`, `score`.
* Daedalus Capture output contains `inferred_manufacturer` or `inferred_model` populated from a source other than explicit surveyor entry.
* An observation is exported without a `provenance` block.
* Any tag not in the approved set appears on an observation.

## Architectural Impact

If this fixture fails, the Daedalus Capture boundary has been violated. Downstream engineering logic has leaked into the capture layer.

The immediate consequence is that Daedalus Contracts may receive inferred data as if it were observed truth, corrupting the source of record.

## Notes

This fixture will be evaluated against real Daedalus Capture JSON output once Daedalus Capture is running.

# Fixture 06 — No Recommendation Output

## Assumptions Tested

* A10 — Service comparison must not become recommendation
* A3 — Daedalus Contracts does not store inferred understanding by default
* A9 — Provenance is mandatory

## Scenario

Daedalus Main compares two service pathways for the same property:

* **Pathway A** — retain boiler and improve controls
* **Pathway B** — move to heat pump pathway with emitter and cylinder upgrades

Daedalus Main may report differences in service behaviour and uncertainty, but it must not recommend one pathway.

## Input JSON

### Daedalus Contracts state — observed baseline

```json
{
  "visit_id": "visit-002",
  "property_ref": "prop-def-456",
  "observations": [
    {
      "observation_id": "obs-heat-source-002",
      "tag": "boiler",
      "type": "regular",
      "manufacturer": null,
      "model": null,
      "identity_resolved": false,
      "provenance": {
        "method": "surveyor-observation",
        "captured_by": "surveyor-011",
        "captured_at": "2026-06-02T10:00:00Z"
      }
    },
    {
      "observation_id": "obs-comfort-002",
      "tag": "surveyor note",
      "subject": "comfort complaint",
      "observed_value": "upstairs rooms cold in winter mornings",
      "provenance": {
        "method": "customer-stated",
        "captured_by": "surveyor-011",
        "captured_at": "2026-06-02T10:05:00Z"
      }
    }
  ]
}
```

### Daedalus Main comparison request

```json
{
  "scenario_request_id": "req-006",
  "visit_id": "visit-002",
  "property_ref": "prop-def-456",
  "pathways": [
    {
      "pathway_id": "pathway-a",
      "label": "Boiler retention with controls upgrade"
    },
    {
      "pathway_id": "pathway-b",
      "label": "Heat pump pathway with emitter and cylinder upgrades"
    }
  ]
}
```

## Expected Output JSON

Daedalus Main output compares service differences only.

```json
{
  "scenario_output_id": "main-scenario-006",
  "scenario_request_id": "req-006",
  "contracts_modified": false,
  "pathway_differences": {
    "hot_water_availability": {
      "pathway-a": "faster initial recovery, higher gas dependency",
      "pathway-b": "slower recovery under cold-start conditions, lower direct combustion dependency"
    },
    "comfort_behaviour": {
      "pathway-a": "moderate improvement with zoning",
      "pathway-b": "higher improvement potential if emitters are right-sized"
    },
    "running_cost": {
      "pathway-a": "uncertain until tariff linkage",
      "pathway-b": "uncertain until tariff linkage and COP calibration"
    },
    "disruption": {
      "pathway-a": "low to moderate",
      "pathway-b": "moderate to high"
    },
    "uncertainty": [
      "Emitter sizing incomplete",
      "Cylinder coil performance unknown",
      "Tariff integration missing"
    ],
    "evidence_gaps": [
      "No measured emitter outputs",
      "No measured cylinder recovery test"
    ]
  },
  "inferred_fields": [
    {
      "field": "comfort_behaviour.pathway-b",
      "inferred": true,
      "evidence_refs": ["obs-comfort-002"],
      "provenance": {
        "method": "model-inference",
        "generated_at": "2026-06-02T12:00:00Z"
      }
    }
  ]
}
```

## Pass Condition

* Daedalus Main outputs differences in hot water availability, comfort behaviour, running cost, disruption, uncertainty, and evidence gaps.
* Output does not contain recommendation or ranking fields.
* Daedalus Contracts remains unchanged.
* Inferred fields are explicitly marked as inferred and linked to provenance and evidence references.

## Fail Condition

* Output contains any forbidden field: `recommendedOption`, `bestOption`, `suitabilityScore`, `rank`, `winner`, `shouldChoose`, `preferredSystem`.
* Output text recommends, prescribes, or chooses a pathway.
* Daedalus Contracts is modified during comparison.
* Any inferred field is unmarked or lacks provenance/evidence linkage.

## Boundary Tests

If a schema or text test harness exists, include explicit assertions for the forbidden field list and for inferred-field provenance requirements.

If no harness exists, fixture evaluation must fail when:

* any forbidden recommendation/ranking/scoring field appears,
* captured evidence differs from baseline in Daedalus Contracts,
* inferred output is not marked and linked to provenance/evidence.

## Architectural Impact

If this fixture fails, Daedalus Main drifts from constitutional explanation software into recommendation software.

That drift breaks the Daedalus-Main boundary and invalidates the separation between explanation, quoting, pricing, and suitability decisions.

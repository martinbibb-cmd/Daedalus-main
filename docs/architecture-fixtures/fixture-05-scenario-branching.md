# Fixture 05 — Scenario Branching

## Assumptions Tested

* A4 — Identity resolution belongs in Mind during Alpha
* A5 — Locus, Timeline, and Snapshot are not promoted until earned
* A3 — Contracts does not store inferred understanding by default

## Scenario

Following a survey, two future pathways are being compared:

* **Pathway A** — keep the existing gas boiler, add a smart thermostat and zone controls
* **Pathway B** — replace the heating system with an air-source heat pump, upgrade the cylinder, and upgrade emitters in the two coldest rooms

Mind must be able to model both pathways simultaneously and compare outcomes without writing any draft or temporary state to Contracts.

Contracts must remain unchanged during scenario exploration. Only a completed, signed scenario output may be promoted to Contracts.

## Input JSON

### Contracts state — current observed record

```json
{
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "observations": [
    {
      "observation_id": "obs-boiler-001",
      "tag": "boiler",
      "type": "combi",
      "manufacturer": null,
      "model": null,
      "identity_resolved": false,
      "age_years": 12,
      "provenance": {
        "method": "surveyor-observation",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:30:00Z"
      }
    },
    {
      "observation_id": "obs-controls-001",
      "tag": "surveyor note",
      "subject": "controls",
      "observed_value": "basic room thermostat, no zones, no smart capability",
      "provenance": {
        "method": "surveyor-observation",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:35:00Z"
      }
    }
  ]
}
```

### Mind input — scenario request

```json
{
  "scenario_request_id": "req-001",
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "requested_at": "2026-06-01T14:00:00Z",
  "pathways": [
    {
      "pathway_id": "pathway-a",
      "label": "Gas boiler with improved controls",
      "changes": [
        { "component": "boiler", "action": "retain" },
        { "component": "controls", "action": "upgrade", "spec": "smart thermostat with zone control" }
      ]
    },
    {
      "pathway_id": "pathway-b",
      "label": "Heat pump with cylinder and emitter upgrades",
      "changes": [
        { "component": "boiler", "action": "replace", "replacement": "air-source heat pump" },
        { "component": "cylinder", "action": "replace", "replacement": "heat pump cylinder 210L" },
        { "component": "emitters", "action": "partial-upgrade", "rooms": ["bedroom 1", "bedroom 2"], "spec": "larger radiators" },
        { "component": "controls", "action": "upgrade", "spec": "heat pump controller with zone control" }
      ]
    }
  ]
}
```

## Expected Output JSON

### Mind output — scenario comparison

Both pathways are modelled entirely within Mind. No draft state is written to Contracts.

```json
{
  "scenario_output_id": "mind-scenario-001",
  "scenario_request_id": "req-001",
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "generated_at": "2026-06-01T14:05:00Z",
  "contracts_modified": false,
  "pathways": [
    {
      "pathway_id": "pathway-a",
      "label": "Gas boiler with improved controls",
      "simulated_annual_gas_kwh": 14200,
      "simulated_annual_cost_gbp": null,
      "simulated_carbon_kg_co2e": 2698,
      "comfort_improvement": "moderate",
      "notes": "Controls upgrade reduces overheating risk. No change to heat source efficiency.",
      "promoted_to_contracts": false
    },
    {
      "pathway_id": "pathway-b",
      "label": "Heat pump with cylinder and emitter upgrades",
      "simulated_annual_electricity_kwh": 4100,
      "simulated_annual_cost_gbp": null,
      "simulated_carbon_kg_co2e": 820,
      "comfort_improvement": "high",
      "notes": "COP 3.5 achievable at design conditions once emitters upgraded. Microbore pipework constraint noted.",
      "coupling_required": true,
      "coupling_ref": "fixture-04-simulation-core-coupling",
      "promoted_to_contracts": false
    }
  ],
  "comparison": {
    "carbon_reduction_pathway_b_vs_a_kg": 1878,
    "preferred_pathway_by_carbon": "pathway-b",
    "decision_ready": false,
    "decision_blockers": [
      "Annual cost comparison requires live tariff data",
      "Heat pump COP requires coupled simulation against actual emitter sizing"
    ]
  }
}
```

### Contracts state — after scenario comparison has run

Contracts must be identical to the state before Mind ran. No scenario data has been written.

```json
{
  "visit_id": "visit-001",
  "property_ref": "prop-abc-123",
  "observations": [
    {
      "observation_id": "obs-boiler-001",
      "tag": "boiler",
      "type": "combi",
      "manufacturer": null,
      "model": null,
      "identity_resolved": false,
      "age_years": 12,
      "provenance": {
        "method": "surveyor-observation",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:30:00Z"
      }
    },
    {
      "observation_id": "obs-controls-001",
      "tag": "surveyor note",
      "subject": "controls",
      "observed_value": "basic room thermostat, no zones, no smart capability",
      "provenance": {
        "method": "surveyor-observation",
        "captured_by": "surveyor-007",
        "captured_at": "2026-06-01T09:35:00Z"
      }
    }
  ]
}
```

## Pass Condition

* Both pathways are modelled and compared in Mind output.
* `contracts_modified` is `false` in Mind output.
* The Contracts record after the scenario run is byte-for-byte identical to the Contracts record before the scenario run.
* `promoted_to_contracts` is `false` on both pathways.
* No temporary or draft scenario data exists in Contracts at any point during scenario exploration.

## Fail Condition

* Contracts has been modified to store either pathway as a draft, temporary record, or future state.
* Scenario comparison cannot proceed without first writing state to Contracts.
* Mind requires a Locus, Timeline, or Snapshot in Contracts before scenario branching can run.
* Pathway data has been written to Contracts under any field name, including fields labelled as draft or temporary.

## Architectural Impact

If this fixture fails, scenario branching cannot be performed without polluting the source of truth.

This would mean Contracts accumulates speculative future states alongside observed truth, making it impossible to distinguish what was observed from what was proposed.

The entire value of the Contracts boundary depends on this fixture passing.

## Notes

Cost comparison is intentionally excluded from this fixture. Financial, tariff, and grant calculations remain external integrations as specified in the architecture constitution.

The `decision_ready: false` state is intentional. A complete decision requires additional data. The fixture tests the architecture, not the completeness of a real-world scenario.

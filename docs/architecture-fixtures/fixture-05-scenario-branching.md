# Fixture 05 — Service Comparison Branching

## Assumptions Tested

* A4 — Identity resolution belongs in Daedalus Main during Alpha
* A5 — Locus, Timeline, and Snapshot are not promoted until earned
* A3 — Daedalus Contracts does not store inferred understanding by default
* A10 — Service comparison must not become recommendation

## Scenario

Following a survey, two future service pathways are being compared:

* **Pathway A** — keep the existing gas boiler, add a smart thermostat and zone controls
* **Pathway B** — replace the heating system with an air-source heat pump, upgrade the cylinder, and upgrade emitters in the two coldest rooms

Daedalus Main must model both pathways simultaneously and compare outcomes without writing any draft or temporary state to Daedalus Contracts.

Daedalus Contracts must remain unchanged during service exploration. Only a completed, signed output may be promoted to Daedalus Contracts.

## Input JSON

### Daedalus Contracts state — current observed record

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

### Daedalus Main input — service comparison request

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

### Daedalus Main output — service comparison

Both pathways are modelled entirely within Daedalus Main. No draft state is written to Daedalus Contracts.

```json
{
  "scenario_output_id": "main-scenario-001",
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
      "comfort_behaviour": "moderate improvement",
      "running_cost_uncertain": true,
      "uncertainty_notes": ["Live tariff integration not connected"],
      "promoted_to_contracts": false
    },
    {
      "pathway_id": "pathway-b",
      "label": "Heat pump with cylinder and emitter upgrades",
      "simulated_annual_electricity_kwh": 4100,
      "simulated_annual_cost_gbp": null,
      "simulated_carbon_kg_co2e": 820,
      "comfort_behaviour": "high improvement",
      "running_cost_uncertain": true,
      "uncertainty_notes": ["Live tariff integration not connected", "Emitter sizing not fully observed"],
      "coupling_required": true,
      "coupling_ref": "fixture-04-simulation-core-coupling",
      "promoted_to_contracts": false
    }
  ],
  "comparison": {
    "differences": {
      "carbon_delta_kg_co2e": 1878,
      "hot_water_recovery_risk": "higher uncertainty for pathway-b",
      "comfort_behaviour_delta": "pathway-b likely improves comfort more if emitter assumptions hold",
      "disruption_delta": "pathway-b requires higher installation disruption"
    },
    "decision_ready": false,
    "decision_blockers": [
      "Annual cost comparison requires live tariff data",
      "Heat pump COP requires coupled modelling against actual emitter sizing"
    ]
  }
}
```

### Daedalus Contracts state — after service comparison has run

Daedalus Contracts must be identical to the state before Daedalus Main ran. No scenario data has been written.

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

* Both pathways are modelled and compared in Daedalus Main output.
* `contracts_modified` is `false` in Daedalus Main output.
* The Daedalus Contracts record after the comparison run is byte-for-byte identical to the Daedalus Contracts record before the run.
* `promoted_to_contracts` is `false` on both pathways.
* No temporary or draft pathway data exists in Daedalus Contracts at any point during service comparison.
* Output compares differences only and does not rank, score, prescribe, or select a best option.

## Fail Condition

* Daedalus Contracts has been modified to store either pathway as a draft, temporary record, or future state.
* Service comparison cannot proceed without first writing state to Daedalus Contracts.
* Daedalus Main requires a Locus, Timeline, or Snapshot in Daedalus Contracts before branching can run.
* Pathway data has been written to Daedalus Contracts under any field name, including fields labelled as draft or temporary.
* Output includes recommendation semantics such as `recommendedOption`, `bestOption`, `suitabilityScore`, `rank`, `winner`, `shouldChoose`, or `preferredSystem`.

## Architectural Impact

If this fixture fails, service comparison cannot be performed without polluting the source of truth.

This would mean Daedalus Contracts accumulates speculative future states alongside observed truth, making it impossible to distinguish what was observed from what was proposed.

The value of the Daedalus Contracts boundary depends on this fixture passing.

## Notes

Cost comparison is intentionally incomplete in this fixture. Finance, tariff, grant, and lending calculations remain external integrations as specified in the architecture constitution.

The `decision_ready: false` state is intentional. The fixture tests architecture boundaries and explanation behaviour, not recommendation behaviour.

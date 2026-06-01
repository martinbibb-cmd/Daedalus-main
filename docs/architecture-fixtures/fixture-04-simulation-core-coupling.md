# Fixture 04 — Simulation Core Coupling

## Assumptions Tested

* A6 — Simulation Core may be required but must earn implementation through coupling tests

## Scenario

A heat pump is proposed for a property with the following characteristics:

* Microbore pipework throughout
* Mixed emitter types (radiators in living areas, underfloor heating in kitchen extension)
* Existing cylinder with unknown recovery rate
* Standard room thermostat with no zone controls

The question this fixture answers: which outputs can be calculated by independent sequential engines, and which outputs require a coupled simulation where the result of one engine changes the inputs to another?

## Input JSON

### Proposed system description

```json
{
  "scenario_id": "scenario-hp-001",
  "proposal": "air-source heat pump retrofit",
  "property_ref": "prop-abc-123",
  "existing_system": {
    "heat_source": "gas boiler",
    "pipework": "microbore",
    "emitters": [
      { "type": "radiator", "location": "living room", "size": "unknown" },
      { "type": "radiator", "location": "bedroom 1", "size": "unknown" },
      { "type": "underfloor heating", "location": "kitchen extension", "size": "unknown" }
    ],
    "cylinder": {
      "manufacturer": null,
      "model": null,
      "capacity_litres": null,
      "recovery_rate_kw": null
    },
    "controls": {
      "type": "room thermostat",
      "zones": 1,
      "smart": false
    }
  },
  "proposed_system": {
    "heat_source": "air-source heat pump",
    "flow_temperature_target_c": 45,
    "pipework": "microbore",
    "emitters": "unchanged",
    "cylinder": "existing, recovery rate unknown",
    "controls": "upgrade required, specification unknown"
  }
}
```

## Expected Output JSON

### Coupling analysis output

This output classifies each calculation by whether it can be answered independently or whether it requires coupled simulation.

```json
{
  "scenario_id": "scenario-hp-001",
  "coupling_analysis": {
    "independent_calculations": [
      {
        "output": "design heat loss",
        "engine": "thermodynamics",
        "dependency": "none",
        "can_calculate_independently": true,
        "notes": "Heat loss calculation depends only on fabric, glazing, and climate. No dependency on system configuration."
      },
      {
        "output": "minimum flow temperature for underfloor heating",
        "engine": "hydraulics",
        "dependency": "none",
        "can_calculate_independently": true,
        "notes": "Underfloor heating flow temperature is determined by floor construction and desired room temperature. Independent of heat pump selection."
      }
    ],
    "coupled_calculations": [
      {
        "output": "heat pump operating COP at design conditions",
        "engines": ["thermodynamics", "plant-dynamics"],
        "dependency": "flow temperature affects COP; flow temperature is determined by emitter sizing; emitter sizing depends on room heat loss",
        "can_calculate_independently": false,
        "loop_description": "Heat loss → required output power → emitter sizing → required flow temperature → heat pump COP → actual output power → back to heat loss at operating conditions"
      },
      {
        "output": "cylinder recovery time",
        "engines": ["plant-dynamics", "hydraulics"],
        "dependency": "recovery rate depends on heat pump output; heat pump output depends on flow temperature during recovery; flow temperature during recovery differs from space heating flow temperature",
        "can_calculate_independently": false,
        "loop_description": "Heat pump output → flow temperature → cylinder coil transfer → recovery time → heat pump duty cycle → back to available output"
      },
      {
        "output": "controls strategy",
        "engines": ["controls-and-logic", "thermodynamics", "plant-dynamics"],
        "dependency": "optimal control strategy depends on COP at different operating points; COP depends on conditions that controls influence",
        "can_calculate_independently": false,
        "loop_description": "Setpoint schedule → heat pump run time → indoor temperature trajectory → demand signal → back to setpoint schedule"
      }
    ],
    "verdict": "coupled-simulation-required",
    "reasoning": "Three interdependent loops exist across thermodynamics, hydraulics, plant dynamics, and controls. Sequential calculation would produce errors that compound across the loops. Simulation Core is required to resolve these dependencies iteratively."
  }
}
```

## Pass Condition

* The fixture correctly identifies which outputs can be calculated independently.
* The fixture correctly identifies which outputs require coupled simulation and names the specific dependency loop.
* The `verdict` field is populated with a clear conclusion: `"independent-only"`, `"coupled-simulation-required"`, or `"partially-coupled"`.
* The reasoning is traceable to specific engine dependencies.

## Fail Condition

* The fixture claims all outputs can be calculated independently when dependency loops exist.
* The fixture claims coupled simulation is required without identifying the specific loops.
* The Simulation Core is added to the architecture without this analysis demonstrating that coupling is necessary.
* The analysis pretends each engine can answer in isolation when the output of one engine changes the inputs to another.

## Architectural Impact

If this fixture demonstrates that coupled simulation is required, the Simulation Core is justified and must be designed to resolve iterative dependencies across engines.

If this fixture demonstrates that sequential calculation is sufficient, the Simulation Core may be deferred or simplified.

The fixture must be evaluated against each real scenario rather than assumed to always require coupling.

## Notes

This fixture tests the proposition directly from `core-architecture-foundation.md`:

> No inferred model should be elevated into Contracts until practical implementation demonstrates clear operational value.

The same principle applies to the Simulation Core. It must earn its place by demonstrating that coupling is real and unavoidable.

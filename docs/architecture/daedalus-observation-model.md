# Daedalus Observation Model

This document defines the Daedalus observation model.

It is an architecture document, not a contract schema. Its purpose is to make the ontology explicit before further implementation work adds more observational types, model disciplines, or inferred outputs.

## Core Statement

Daedalus is built from observations.

An observation is a captured statement about reality at a point in context, with provenance, confidence, and uncertainty preserved.

Examples:

* Boiler exists.
* Area is Kitchen.
* Cylinder is in the airing cupboard.
* TRV fitted.
* Kitchen tap poor flow.
* Bath tap observed as a modern high-flow fitting.
* Flow cup measured 16 l/min.
* Customer says shower is unusable at 7am.
* Customer says hot water runs out.
* Thermostat controls a heating zone.

These are all observations.

They may differ in source, strength, confidence, and type, but they are all first-order captured facts. They are the material from which Daedalus Main later builds understanding.

## Observation Hierarchy

Daedalus observations can be grouped by what kind of reality they describe.

```text
Observation
  Component Observation
  Area Observation
  Relationship Observation
  Measurement Observation
  Service Point Observation
  Customer Experience Observation
  Evidence Observation
```

The hierarchy is conceptual. It does not require every observation type to share an identical storage shape. It does require every observation type to obey the same constitutional boundary: captured observations are not inferred diagnoses.

## Observation Types

### Component Observation

A component observation records that a physical or logical system element exists, or that an observed attribute belongs to it.

Examples:

* System boiler observed in kitchen.
* Unvented cylinder observed in airing cupboard.
* Radiator observed in hall.
* TRV fitted.
* Gas meter observed.
* Manufacturer unknown.

Component observations may be weak. A component can be observed without full identity resolution.

### Area Observation

An area observation records a spatial part of the property.

Examples:

* Kitchen.
* Airing cupboard.
* Hall.
* Bathroom.
* Upstairs landing.

Area observations provide spatial context for components, service points, customer experiences, and evidence.

### Relationship Observation

A relationship observation records an observed or captured connection between observations.

Examples:

* Boiler contained in kitchen.
* Cylinder contained in airing cupboard.
* Boiler connected to cylinder.
* Thermostat controls radiator zone.
* Service point served by cylinder.

Relationship observations do not need to imply complete system understanding. They can be partial, approximate, or uncertain.

### Measurement Observation

A measurement observation records a measured value, method, boundary conditions, and confidence.

Examples:

* Flow cup measured 16 l/min at kitchen cold tap.
* Flow cup measured 5 l/min at bath tap.
* Pressure-flow kit measured flow at 1 bar residual pressure.
* Static pressure observed with gauge.
* Water test not performed because no suitable outlet was available.

Measurement observations are not diagnoses. They record what was measured, where, how, and under what limitations.

### Service Point Observation

A service point observation records a customer-facing outlet, fitting, or point where a system delivers service.

Examples:

* Bath tap.
* Kitchen tap.
* Basin tap.
* Shower mixer.
* Electric shower.
* Outside tap.
* Washing machine valve.
* Cylinder inlet.

Service point observations can include supply type, intended pressure type, observed issues, served assets, and evidence.

They let Daedalus distinguish system-level behaviour from outlet-level behaviour later, without diagnosing that distinction during capture.

### Customer Experience Observation

A customer experience observation records what the customer or occupier experiences.

Examples:

* Shower goes cold.
* Bath fills slowly.
* Hot water runs out.
* Upstairs pressure poor.
* Heating slow upstairs.
* One room never warm.
* Shower unusable at 7am.

Customer experience observations are often among the most valuable observations because they describe service reality directly.

They are still observations, not recommendations. A customer saying "the shower is unusable at 7am" is captured truth about reported experience. Main may later compare that experience with measurements, service points, and system configuration.

### Evidence Observation

An evidence observation records supporting material.

Examples:

* Boiler photo.
* Cylinder photo.
* Thermostat note.
* Bath tap photo.
* Voice note.
* Device log.

Evidence can support component, area, relationship, measurement, service point, or customer experience observations.

## Observation Attributes

Every observation may carry these attributes.

### Evidence

Evidence links an observation to supporting material.

Evidence is not decoration. It is part of the audit trail that lets later users understand why the observation exists.

### Provenance

Provenance records where the observation came from.

At minimum this should answer:

* Who or what captured it?
* When was it captured?
* By what method?

Examples:

* Surveyor observation.
* Device camera.
* Water supply test.
* Customer report.
* Service point capture.

### Confidence

Confidence records how strong the observation is.

Typical states include:

* observed
* approximate
* unknown
* unresolved

Unknown is a valid state. Approximate is a valid state. Weak observations are still useful if they are marked honestly.

### Spatial Context

Spatial context records where the observation belongs.

Examples:

* Component in kitchen.
* Service point in bathroom.
* Customer reports issue upstairs.
* Measurement taken at bath tap.

Spatial context can be exact, area-based, approximate, or unknown.

### Time

Time records when the observation was made or when the observed experience occurs.

Examples:

* Captured at 2026-06-07T09:46:00Z.
* Customer reports shower unusable at 7am.
* Flow measured during survey.
* Heating slow upstairs in the morning.

Time matters because service problems are often temporal.

### Observer

The observer records who or what made the observation.

Examples:

* Surveyor.
* Customer.
* Device logger.
* Imported evidence source.

Observer is distinct from truth. A customer-reported observation is valid, but its observer and confidence must remain visible.

### Limitations

Limitations record why an observation may be incomplete or constrained.

Examples:

* No suitable outlet available.
* Customer report only.
* Restrictor or aerator suspected.
* Access unavailable.
* Measurement taken at a local service point only.
* Equipment unavailable.

Limitations prevent weak observations from being promoted into stronger claims.

## Observation vs Inference

The most important boundary in Daedalus is the boundary between observation and inference.

Observed:

```text
Kitchen tap flow cup measurement = 16 l/min
```

Inferred:

```text
Internal restriction likely
```

Observed:

```text
Bath tap has poor flow.
Bath tap appears to be a mains-pressure fitting.
Bath tap is served by gravity hot supply.
```

Inferred:

```text
Outlet mismatch likely.
```

Capture stores the observed facts.

Main may generate the inferred interpretation.

The inferred interpretation must remain traceable to the observations that produced it. It must not overwrite them.

## Observation vs Service Interpretation

Service interpretation is a specific kind of inference.

Observed:

```text
Open vented cylinder.
Modern high-flow bath filler.
Poor bath fill.
Bath tap flow cup measurement = 5 l/min.
```

Service interpretation:

```text
Outlet mismatch likely.
```

The observations belong in Capture and Contracts.

The service interpretation belongs in Main.

This distinction lets Daedalus explain service reality without pretending that capture data is more certain than it is.

## Why Service Points Matter

Water measurements are only half useful unless Daedalus knows where the customer experiences water.

A poor water experience can be caused by:

* system limitation
* pipework limitation
* outlet or fitting mismatch
* local restriction
* customer usage pattern
* measurement context

Capture should not choose between those explanations.

It should record:

* the system
* the measurement
* the service point
* the customer experience
* the evidence
* the uncertainty

Main can then compare those observations and generate an interpretation.

## Customer Experience as First-Class Observation

Customer experience observations should become a first-class observation type.

They are not softer or less important than technical observations. They describe the delivered service directly.

Examples:

* Shower goes cold.
* Bath fills slowly.
* Hot water runs out.
* Upstairs pressure poor.
* Heating slow upstairs.
* One room never warm.

These observations can be linked to:

* areas
* service points
* components
* measurements
* evidence
* time patterns

They should preserve customer language where possible, alongside structured issue types.

## Ownership Boundaries

### Daedalus Capture

Capture owns field collection.

It records observations, evidence, provenance, confidence, spatial context, time, observer, and limitations.

Capture must not diagnose, recommend, rank, score, price, or select outcomes.

### Daedalus Contracts

Contracts owns transport and preservation of observed truth.

It defines valid observation payloads and preserves their evidence, provenance, confidence, and uncertainty.

Contracts should not promote inferred analytical constructs until practical implementation proves they are needed as signed or externally consumed truth.

### Daedalus Main

Main owns understanding.

It imports observations, compiles twins, compares behaviour, runs models, and generates explanations.

Main may infer:

* likely restrictions
* likely outlet mismatch
* service constraints
* system behaviour
* customer experience explanations

Those outputs must remain explicit inferences and must be traceable back to observations.

## Model Implication

The emerging Daedalus ontology is:

```text
Observation
  Component
  Area
  Relationship
  Measurement
  Service Point
  Customer Experience
  Evidence
```

Everything else hangs off this.

Twins are compiled representations of observations.

Physics models consume compiled representations and measurements.

Service interpretations are inferred outputs.

Explanations are presentations of observations, inferences, and uncertainty.

## Implementation Ordering

The current ordering is coherent:

1. Water observations.
2. Service point observations.
3. Observation model document.
4. Customer experience observations.
5. First domestic water-service model.

The first domestic water-service model should wait until Daedalus has enough observed context:

* system observations
* water measurements
* service points
* customer experience observations
* evidence
* provenance
* uncertainty

At that point Daedalus can model delivered water service rather than building a theoretical plumbing simulator detached from customer reality.

## Falsification Tests

This model should be reconsidered if:

* Capture repeatedly needs to store diagnoses to remain useful.
* Main cannot explain inferences from observations.
* Customer experience cannot be linked to system, measurement, or service point observations.
* Evidence and provenance become optional in practice.
* Most observations require hidden defaults to be usable.
* Unknown and approximate states are treated as errors rather than valid capture states.

## Success Criteria

Daedalus can capture a weak, partial, real survey and preserve it without pretending certainty.

Daedalus Main can then explain what is observed, what is inferred, what is unknown, and why.

The user can see the difference between:

* "Kitchen tap measured 16 l/min"
* "Bath tap poor flow observed"
* "Customer says shower unusable at 7am"
* "Outlet mismatch likely"

Only the first three are observations.

The fourth is an inference.

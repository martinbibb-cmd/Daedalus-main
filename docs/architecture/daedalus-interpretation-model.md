# Daedalus Interpretation Model

This document defines the Daedalus interpretation model.

It is an architecture document, not an implementation plan. It defines how Daedalus Main should turn observations into understanding before any physics engine, service model, recommendation layer, or customer-facing explanation is allowed to act on them.

## Core Statement

Interpretation is the layer between observation and modelling.

```text
Observation
  -> Interpretation
  -> Model
  -> Service Understanding
```

Observations say what was captured.

Interpretations say what those observations mean in context.

Models calculate or simulate behaviour.

Service understanding explains what service is likely being delivered, constrained by observations, interpretations, models, evidence, and uncertainty.

Interpretation must not become recommendation.

## Example

Observation:

```text
Flow cup measurement
Kitchen tap
16 l/min
```

Interpretation:

```text
Represents local outlet performance.
```

Model:

```text
Evidence of internal water service capability.
```

Service Understanding:

```text
Supports bath/shower experience assessment.
```

No recommendation is made.

No system change is selected.

No outcome is ranked.

The observation has simply gained meaning.

## Why Interpretation Exists

Without interpretation, Daedalus risks jumping directly from:

```text
Observation
  -> Physics Engine
```

That is too large a jump.

A physics model needs to know what role an observation plays before it can use it responsibly.

Examples:

* A flow cup measurement at a kitchen tap may represent local outlet performance, not whole-house capacity.
* A pressure-flow kit measurement at an outside tap may represent incoming main capability.
* A customer report that the shower is unusable at 7am may represent a time-specific service issue, not a static hardware fault.
* A bath tap intended for mains pressure but served by gravity hot supply may indicate a service-point mismatch pattern, not a failed cylinder.

Interpretation answers:

```text
What does this observation mean?
```

before Daedalus asks:

```text
What happens if the system changes?
```

## Observation vs Interpretation

An observation is captured truth.

An interpretation is contextual meaning derived from one or more observations.

Observed:

```text
Bath tap flow cup measurement = 5 l/min.
Bath tap supply type = gravityHot.
Bath tap intended pressure type = mainsPressure.
Bath fill reported slow.
```

Interpreted:

```text
The bath tap observations form a service-point performance concern.
The measured flow is local to the bath tap.
The pressure-type mismatch is relevant context.
```

The interpretation does not claim the cause.

It does not prescribe a fix.

It does not overwrite the observations.

## Interpretation vs Inference

Interpretation and inference are related but not identical.

Interpretation assigns meaning and role.

Inference proposes an explanatory conclusion.

Interpretation:

```text
This bath tap measurement represents service point performance.
```

Inference:

```text
Outlet mismatch likely.
```

Interpretation:

```text
This customer report is a time-specific hot water service complaint.
```

Inference:

```text
Morning demand may exceed available hot water service.
```

Interpretation can be used before a full inference exists.

Inference should be traceable through interpretations back to observations.

## Interpretation vs Recommendation

Interpretation must not recommend, rank, score, prescribe, or choose.

Allowed:

```text
This observation supports understanding of bath fill performance.
This measurement is local to the kitchen tap.
This customer experience relates to shower service at a specific time.
This service point may be relevant to a later outlet mismatch interpretation.
```

Not allowed:

```text
Install a combi boiler.
Replace the cylinder.
Choose option A.
This is the best system.
Suitability score: 92.
Recommended package.
```

Interpretation prepares evidence for understanding.

Recommendation selects action.

Daedalus Main may eventually compare service pathways, but it must not collapse interpretation into recommendation.

## Interpretation Inputs

Interpretation consumes observations and their attributes.

Inputs include:

* observation type
* evidence
* provenance
* confidence
* spatial context
* time
* observer
* limitations
* relationships
* measurement method
* boundary conditions
* customer-reported context

The interpretation layer must treat weak, approximate, unknown, and conflicting observations as valid inputs.

## Interpretation Outputs

An interpretation output should describe:

* the observation role
* the context it applies to
* what service aspect it may inform
* the strength of the interpretation
* known limitations
* supporting observations
* conflicting observations
* unknowns that prevent stronger meaning

Example:

```text
Interpretation:
  id: interpretation-bath-tap-local-flow
  role: servicePointPerformanceEvidence
  appliesTo: service-point-bath-tap
  informs: bathFillExperience
  support:
    - water-flow-cup-bath
    - service-point-bath-tap
  limitations:
    - localOutletOnly
    - approximateMeasurement
  confidence: approximate
```

The exact schema is not defined here. The architectural rule is that interpretation outputs must remain traceable and bounded.

## Evidence Weighting

Interpretation must account for evidence strength.

Evidence strength is not a single global score. It depends on method, context, provenance, and relevance.

Examples:

* A digital pressure-flow logger is stronger evidence for pressure-flow behaviour than a customer report.
* A customer report is strong evidence of customer experience.
* A flow cup measurement is useful evidence for local outlet flow, but weak evidence for whole-house hydraulic capacity.
* A photo is strong evidence that a fitting exists, but weak evidence of flow performance.
* A note can preserve context that is not visible in a photo.

The same observation can be strong for one interpretation and weak for another.

Example:

```text
Kitchen tap 16 l/min
```

Strong for:

```text
Kitchen tap local flow was measured.
```

Weaker for:

```text
Whole-house water service capacity.
```

Interpretation must preserve that distinction.

## Observation Conflicts

Conflicts are expected.

Examples:

* Customer reports poor flow, but a single outlet measurement appears normal.
* Kitchen tap flow is acceptable, but bath tap flow is poor.
* Static pressure is high, but dynamic flow is weak.
* Customer says shower is poor only at 7am, but survey measurement was taken at 11am.
* A service point appears intended for mains pressure, but supply is gravity hot.

Conflicts are not errors.

They are interpretation inputs.

The interpretation layer should identify:

* which observations conflict
* whether the conflict is spatial
* whether the conflict is temporal
* whether the conflict is method-related
* whether the conflict is confidence-related
* whether the conflict indicates missing observations

Allowed output:

```text
Kitchen tap and bath tap water observations differ. The difference may be service-point specific.
```

Not allowed output:

```text
Replace the bath tap.
```

## Observation Completeness

Interpretation must recognise completeness without requiring it.

A complete water-service interpretation may need:

* system observations
* service point observations
* water measurements
* customer experience observations
* spatial context
* evidence
* time context
* limitations

But Daedalus must also work with incomplete surveys.

Completeness states can include:

* sufficient for local interpretation
* sufficient for system-level interpretation
* service-point only
* customer-report only
* measurement only
* missing service point
* missing customer experience
* missing measurement
* conflicting observations

Completeness should guide uncertainty, not block import.

## Unknown Handling

Unknown is a first-class state.

Interpretation must not fill unknowns with hidden defaults.

Examples:

* Unknown supply type.
* Unknown intended pressure type.
* Unknown served asset.
* Unknown observer.
* Unknown time pattern.
* Unknown boundary conditions.

Allowed:

```text
This customer experience cannot yet be connected to a known service point.
```

Not allowed:

```text
Assume the customer experience relates to the cylinder.
```

Unknowns can still produce useful interpretation if they are explicit.

## Service Point Interpretation

Service point interpretation gives outlet observations contextual meaning.

Inputs:

* service point type
* area
* supply type
* intended pressure type
* served assets
* observed issues
* evidence
* linked measurements
* linked customer experience

Examples:

Observation:

```text
Service point = bath tap
Supply type = gravityHot
Intended pressure type = mainsPressure
Observed issue = poorFlow
Evidence = bath tap photo
```

Interpretation:

```text
This is a bath-fill service point with a pressure-context concern.
```

Observation:

```text
Kitchen tap measured 16 l/min
Bath tap measured 5 l/min
```

Interpretation:

```text
Water service observations differ by service point.
```

This is still not diagnosis. It identifies the meaning and relevance of the observations.

## Water Observation Interpretation

Water observation interpretation assigns role to pressure, flow, and not-tested observations.

Examples:

Observation:

```text
Flow cup at kitchen cold tap = 16 l/min
```

Interpretation:

```text
Local kitchen outlet flow evidence.
Potential supporting evidence for internal cold water service.
Limited evidence for whole-house capacity.
```

Observation:

```text
Pressure-flow kit at outside tap.
Flow at 1 bar residual pressure = 14 l/min.
```

Interpretation:

```text
Incoming main capacity evidence.
Stronger than flow cup for pressure-flow behaviour.
```

Observation:

```text
Water test not performed.
Reason = no suitable outlet.
```

Interpretation:

```text
Water service measurement is absent with valid reason.
Water-service conclusions must rely on service point and customer experience observations until better measurement exists.
```

## Customer Experience Interpretation

Customer experience interpretation connects reported service reality to system context without diagnosing cause.

Examples:

Observation:

```text
Customer says shower goes cold at 7am.
```

Interpretation:

```text
Time-specific shower hot water experience issue.
Relevant to hot water service understanding.
Requires service point, hot water source, and time/load context before stronger inference.
```

Observation:

```text
Customer says one room never warm.
```

Interpretation:

```text
Room-specific heating comfort issue.
Relevant to emitter, controls, room heat loss, and usage context.
```

Observation:

```text
Customer says bath fills slowly.
```

Interpretation:

```text
Bath-fill service issue.
Relevant to bath tap service point, hot/cold supply type, measured flow, and customer time expectations.
```

Customer experience observations are not inferior to technical measurements. They are direct evidence of service outcome.

## Interpretation and Models

Models should consume interpreted observations, not raw observations alone.

Reason:

* Raw observations describe captured reality.
* Interpretations describe what role those observations play.
* Models need role and context to avoid overusing weak evidence.

Example:

```text
Raw observation:
  Flow cup 16 l/min at kitchen tap

Interpretation:
  localOutletFlowEvidence

Model use:
  can inform local service assessment
  should not be treated as complete incoming main pressure-flow curve
```

The interpretation layer therefore protects models from treating every observation as equivalent evidence.

## Interpretation and Service Understanding

Service understanding is the explanatory layer produced after observations have been interpreted and, where appropriate, modelled.

Example:

```text
Observations:
  - open vented cylinder
  - bath tap gravityHot supply
  - bath tap intendedPressureType mainsPressure
  - bath tap poorFlow
  - bath tap flow cup 5 l/min
  - customer says bath fills slowly

Interpretations:
  - bath tap service point performance concern
  - local bath tap flow evidence
  - pressure-context mismatch concern
  - customer bath-fill experience issue

Service understanding:
  - Bath-fill experience is supported by both customer report and local flow measurement.
  - The service point context is relevant before attributing the issue to the whole hot water system.
```

Still no recommendation.

No install path.

No ranked outcome.

## Anti-Pattern: Observation to Magic AI

The interpretation layer exists partly to prevent this failure mode:

```text
Observation
  -> Magic AI
  -> Recommendation
```

This is not allowed.

AI may help summarise, classify, and explain observations and interpretations. It must not invent evidence, hidden assumptions, or recommendations.

Every generated explanation must be grounded in:

* observations
* interpretations
* model outputs
* uncertainty
* provenance

If the grounding is absent, the explanation must say so.

## Ownership Boundaries

### Daedalus Capture

Capture records observations.

Capture may guide better observation methods, but it must not interpret observations into diagnoses or recommendations.

### Daedalus Contracts

Contracts preserves observations and promoted signed outputs.

Contracts may eventually carry interpretation outputs only if they become signed externally consumed truth. That promotion must be deliberate.

### Daedalus Main

Main owns interpretation.

Main may interpret observations into contextual meaning, generate inferences, run models, and explain service understanding.

Main must preserve the boundary between:

* observed truth
* interpreted meaning
* inferred explanation
* model output
* service comparison
* recommendation, which remains disallowed unless the constitution changes

## Falsification Tests

The interpretation model should be reconsidered if:

* Models can safely consume raw observations without role/context loss.
* Interpretations repeatedly become recommendations in practice.
* Inferences cannot be traced back through interpretations to observations.
* Conflicts are hidden instead of represented.
* Unknowns are filled with defaults to make interpretations easier.
* Customer experience observations cannot be connected to service understanding.

## Success Criteria

Daedalus can explain the difference between:

```text
Kitchen tap measured 16 l/min.
```

and:

```text
Kitchen tap measurement is local outlet flow evidence.
```

and:

```text
This supports assessment of water service capability.
```

and:

```text
The bath/shower experience appears constrained.
```

without jumping to:

```text
Install this product.
```

The system understands more than it observed, but it can always show how it got there.

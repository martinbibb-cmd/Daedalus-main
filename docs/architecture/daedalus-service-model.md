# Daedalus Service Model

This document defines the Daedalus service model.

It is an architecture document, not an implementation plan, contract schema, diagnosis system, quotation system, or recommendation framework. Its purpose is to define what Daedalus means by service before domestic water, heating, controls, resilience, or maintenance models begin to use that word in code.

## Core Statement

A service is the experienced outcome delivered by a system.

Daedalus service understanding sits after observation and interpretation, and before any recommendation boundary.

```text
Observed reality
  -> interpreted understanding
  -> modelled service
  -> customer experience
```

In implementation terms the Daedalus explanation sequence is:

```text
Observation -> Interpretation -> Service Model -> Experience Explanation
```

Service is not the same thing as a product.

Service is not the same thing as a recommendation.

Service is not the same thing as a quote.

Service describes what the customer can experience, under what conditions, with what constraints, uncertainty, evidence, and limitations.

## Why Service Exists

Daedalus observes physical systems, service points, measurements, relationships, and customer experience. Interpretation gives those observations contextual meaning.

The service model answers the next question:

```text
What service appears to be delivered?
```

It does not answer:

```text
What should be installed?
What should be bought?
Which option is best?
What should this cost?
```

Those are recommendation, selection, and commercial questions. They are outside this model.

## Service vs Product

Products and assets are means of delivering service. They are not services by themselves.

Example:

```text
Combi boiler
```

is not:

```text
recommended combi
```

It can be understood as:

```text
on-demand domestic hot water service with flow-limited simultaneous demand
```

Example:

```text
Unvented cylinder
```

is not:

```text
preferred cylinder option
```

It can be understood as:

```text
stored mains-pressure domestic hot water service with recovery behaviour
```

Example:

```text
Open vented cylinder
```

is not:

```text
outdated system to replace
```

It can be understood as:

```text
stored low-pressure domestic hot water service, sensitive to outlet compatibility
```

The product or asset may be observed. The service is the delivered outcome that Daedalus models and explains.

## Service vs Recommendation

Service modelling may compare service characteristics.

Allowed:

```text
This observed system appears to deliver stored low-pressure hot water service.
This service point appears sensitive to outlet compatibility.
This customer experience relates to bath-fill service.
This service has uncertainty because no pressure-flow measurement exists.
Service A and service B differ in simultaneous hot water behaviour.
```

Not allowed:

```text
Install a combi boiler.
Choose the unvented cylinder.
This is the best service.
Suitability score: 92.
Recommended package.
Quote option A.
```

Main may compare services.

Main may not rank, score, recommend, or choose services.

This is a hard boundary.

## Service vs Quote

A quote is a commercial artifact. It contains scope, price, terms, availability, supplier assumptions, and contractual meaning.

A service model is not a quote.

Daedalus may model:

```text
stored mains-pressure hot water service
```

It must not turn that service model into:

```text
quote for unvented cylinder installation
```

without a separate constitutional and product boundary.

## Core Service Domains

The service model groups understanding into domains. These domains are conceptual and may later have different implementation shapes.

### Domestic Hot Water Service

Domestic Hot Water Service describes how hot water is made available to service points and customer experiences.

It may consider:

* hot water source assets
* storage assets
* recovery behaviour
* supply type
* pressure and flow observations
* service points
* simultaneous demand constraints
* customer experiences such as slow bath fill, shower goes cold, or hot water runs out
* evidence, confidence, provenance, and uncertainty

Examples:

* on-demand DHW service with flow-limited simultaneous demand
* stored mains-pressure DHW service with recovery behaviour
* stored low-pressure DHW service sensitive to outlet compatibility

### Cold Water Service

Cold Water Service describes how cold water is delivered to service points and systems.

It may consider:

* incoming main observations
* stored cold water observations
* pressure-flow measurements
* cold service points
* cylinder inlet context
* limitations such as no suitable test point
* customer experiences such as upstairs pressure poor or poor cold flow

Cold water service is important because hot water service often depends on it.

### Space Heating Service

Space Heating Service describes the delivered heating outcome across rooms, emitters, controls, and time.

It may consider:

* heat source observations
* emitter observations
* area observations
* room and zone relationships
* control relationships
* time patterns
* customer experiences such as heating slow upstairs or one room never warm
* evidence, confidence, provenance, and uncertainty

Space heating service is experienced as comfort, response, controllability, and consistency, not as a boiler product alone.

### Control Service

Control Service describes how the customer can influence or schedule system behaviour.

It may consider:

* room thermostats
* programmers
* TRVs
* smart controls
* zoning relationships
* control reach across areas and emitters
* customer experience of usability, mismatch, or lack of control

Controls are not only components. They are part of the service because they shape what the customer can make the system do.

### Disruption Service

Disruption Service describes the experienced disruption caused by maintaining, repairing, replacing, or changing a system.

It may consider:

* loss of heating or hot water
* access limitations
* occupancy constraints
* time sensitivity
* temporary service needs
* evidence and customer constraints

Disruption service is still service understanding. It must not become a quote or project plan unless a later boundary explicitly permits that.

### Maintenance Service

Maintenance Service describes observed and modelled maintainability of the system.

It may consider:

* access
* isolation points
* age and condition observations
* service history evidence
* failure symptoms
* uncertainty where evidence is missing

Maintenance service is not a diagnosis by default. It describes how maintainable the observed system appears to be and what evidence supports that view.

### Resilience Service

Resilience Service describes how service may continue, degrade, or fail under stress.

It may consider:

* single points of failure
* storage
* backup heat or water paths
* demand sensitivity
* outage impact
* recovery behaviour

Resilience service helps explain risk and constraint without recommending a change.

### Accessibility Service

Accessibility Service describes how well the delivered service fits the practical needs of the people using it.

It may consider:

* reachable controls
* safe outlet use
* bathing and showering usability
* area access
* customer-reported limitations
* evidence and uncertainty

Accessibility service is grounded in observations and customer experience. It must not invent needs that were not observed or reported.

## Service Inputs

Service models consume interpreted observations and model-ready context.

Inputs can include:

* component observations
* area observations
* relationship observations
* measurement observations
* service point observations
* customer experience observations
* evidence
* provenance
* confidence
* limitations
* spatial context
* time context
* interpreted observation roles
* conflicts and unknowns

The service model should preserve weak and incomplete inputs. It should not hide unknowns to make a service story sound cleaner.

## Service Outputs

A service output should describe:

* the service domain
* the observed assets and service points involved
* the customer experiences involved
* the interpreted observations used
* the modelled service characteristics
* uncertainty and confidence
* evidence references
* provenance of the model output
* limitations and missing observations
* conflicts that affect understanding

Example:

```text
Service:
  domain: Domestic Hot Water Service
  serviceType: storedLowPressureDHW
  servicePoints:
    - bath tap
  customerExperiences:
    - bath fills slowly
  characteristics:
    - stored hot water
    - low-pressure delivery
    - outlet compatibility sensitive
  uncertainty:
    - incoming main pressure-flow not measured
    - served asset relationship approximate
  evidence:
    - cylinder photo
    - bath tap photo
    - bath flow cup measurement
  confidence: approximate
```

The exact schema is not defined here. The architectural rule is that service outputs must remain traceable, bounded, and non-recommendatory.

## Unknowns and Conflicts

Service modelling must treat unknowns and conflicts as part of the service picture.

Examples:

* The service point is known, but the served asset is unknown.
* The customer reports poor flow, but one measurement appears normal.
* The bath tap appears intended for mains pressure, but the hot supply is gravity hot.
* The cylinder is observed, but recovery behaviour is unknown.
* The customer experience is time-specific, but measurements were taken at another time.

Allowed output:

```text
Bath-fill service understanding is limited because measurements and customer experience were captured under different time conditions.
```

Not allowed output:

```text
The cylinder is wrong. Replace it.
```

Unknowns should guide uncertainty and further observation, not trigger hidden defaults.

## Service Comparison Boundary

Main may compare services because comparison can be explanatory without being recommendatory.

Allowed comparisons:

* on-demand vs stored DHW service behaviour
* mains-pressure vs low-pressure outlet compatibility context
* single-outlet vs simultaneous-demand constraints
* observed bath-fill experience vs modelled bath-fill service
* current observed service vs another explicitly described service shape

Disallowed comparisons:

* ranking services from best to worst
* assigning suitability scores
* selecting a service for the customer
* converting comparison into product recommendation
* presenting a preferred quote or package

Comparison must describe difference, evidence, uncertainty, and limitation. It must not choose.

## Domestic Water Service Model Scaffold

The first implementation target after this document should be a domestic water service model scaffold.

It should not calculate yet.

It should define the shape that bridges observation and interpretation into later modelling.

Conceptual shape:

```text
DomesticWaterServiceModel
  supply observations
  service points
  storage assets
  heat source assets
  uncertainty
  evidence refs
```

The scaffold should allow Main to assemble model context without pretending to know capacity, recovery, simultaneity, pressure loss, or suitability before the evidence exists.

## Ownership Boundaries

### Deployment Boundary

The production deployment boundary is defined in [Deployment Architecture](../DEPLOYMENT_ARCHITECTURE.md).

Cloudflare deployment is the public front door, demo/import shell, portal, API gateway, and control plane. It is not the production sensitive evidence-processing backend.

The production evidence backend is a private VM or controlled server for raw evidence processing, transcription, diarisation, LLM extraction, evidence graph construction, twin compilation, physics, method/rationale generation, and private twin storage.

### Daedalus Capture

Capture records observations and evidence.

Capture may collect service-relevant observations, service points, measurements, and customer experiences. Capture must not model service, recommend products, rank options, or choose outcomes.

### Daedalus Contracts

Contracts preserves observation payloads and any deliberately promoted signed outputs.

Contracts should not define service model outputs until an implementation proves which service outputs need to cross repository or system boundaries.

### Daedalus Main

Main owns interpretation, modelling, service understanding, and service comparison.

Main may:

* compile observations into twins
* interpret observation roles
* assemble service models
* compare service characteristics
* explain service understanding with evidence and uncertainty

Main may not:

* rank services
* score suitability
* recommend products
* choose an option
* generate quotes
* hide uncertainty to make a service appear decisive

## Falsification Tests

The service model should be reconsidered if:

* service language repeatedly becomes recommendation language
* product names are treated as service outcomes
* service comparison cannot be presented without ranking
* model outputs cannot trace back to observations and interpretations
* customer experience is treated as secondary to asset observations
* unknowns are replaced with hidden defaults
* service domains overlap so much that they cannot be explained separately

## Success Criteria

Daedalus can explain the difference between:

```text
Combi boiler observed.
```

and:

```text
On-demand domestic hot water service with flow-limited simultaneous demand.
```

and:

```text
This differs from stored mains-pressure DHW service with recovery behaviour.
```

without jumping to:

```text
Install a combi boiler.
```

The system can describe service reality, compare service characteristics, preserve uncertainty, and remain constitutionally outside recommendation.

# Daedalus Main Core Architecture Foundation

This document defines the initial architecture of Daedalus Main before implementation begins.

## Current Architectural Position

Daedalus Contracts stores observed truth.

Daedalus Main creates understanding from that truth.

## Identity Resolution

Daedalus Main recognises that long-term property identity may require concepts such as:

* Locus
* Timeline
* Snapshot

Locus, Timeline, and Snapshot are currently Daedalus Main analytical constructs.

Daedalus Contracts stores observations and signed outputs.

Daedalus Main may create, modify, replace, or discard identity-resolution models without requiring Daedalus Contracts schema changes.

## Reasoning

A DaedalusPackage is an observation payload.

A Locus is an inference.

Daedalus Contracts stores observations.

Daedalus Main performs inferences.

## Locus Promotion Rule

Architectural concepts must earn promotion.

No inferred model should be elevated into Daedalus Contracts until practical implementation demonstrates clear operational value that cannot be achieved within Daedalus Main alone.

Locus should only be promoted into Daedalus Contracts if one or more of the following become true:

1. Multi-visit comparisons are required directly within Daedalus Capture.
2. External systems require high-volume current-state queries.
3. Legally binding multi-stage retrofit pathways require immutable temporal identity.

## Physical Modelling Architecture

Daedalus Main consists of:

### Twin Compiler

* Builds House, System, and Home twins from evidence
* Compiles a Unified Property Twin

### Model Orchestration Core

* Coordinates model disciplines
* Resolves dependency loops when required
* Produces stable comparison outputs

### Model Disciplines (planned, not yet implemented)

#### Thermodynamics

* Heat movement

#### Hydraulics

* Water movement

#### Plant Dynamics

* Equipment behaviour

#### Controls & Logic

* Operating behaviour

#### Electrical

* Electrical energy flow

#### Environment & Climate

* External influences

#### Lifecycle & Decay

* Performance degradation

#### Physical Fit & Serviceability

* Access and installation constraints

#### Policy & Compliance

* Rules and constraints

### Service Comparison Engine

Consumes model outputs.

Produces:

* Service pathways
* Difference analysis
* Constraint disclosures

### Explanation Engine

Explains outcomes in human language across visualisation, portal, PDF, and engineer handover outputs.

### Visualisation Layer

Consumes outputs only.

Owns no truth.

### Traffic Layer

Owns:

* Navigation
* Accessibility routes
* Progressive disclosure
* Role-based journeys

## Future Investigation Areas

The following remain under active review:

* Locus architecture
* Timeline architecture
* Snapshot architecture
* Stable identity models
* Temporal modelling
* Service comparison branching

These concepts must earn promotion through practical implementation rather than assumption.

## Success Criteria

Daedalus Main Alpha can:

* Import Daedalus Capture outputs as DaedalusPackage payloads
* Build House, System, and Home twins
* Compile a Unified Property Twin
* Compare service pathways
* Generate explanations with uncertainty and provenance

without requiring Locus, Timeline, or Snapshot to exist in Daedalus Contracts.

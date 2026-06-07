# Daedalus Main Architecture Constitution & AI Guardrails

This document establishes the constitutional rules for Daedalus Main before any physics engines, visualisations, portals, PDFs, or user interfaces are implemented.

## Purpose

Daedalus Main exists to understand and explain reality.

It is responsible for:

* Importing DaedalusPackage payloads
* Compiling House, System, and Home twins into a Unified Property Twin
* Preserving uncertainty and provenance
* Modelling physical behaviour
* Comparing services delivered by system configurations
* Explaining outcomes through visualisation, portal, PDF, and engineer handover

It is not responsible for:

* Capturing evidence
* Altering captured evidence
* Making recommendations
* Ranking options
* Scoring options
* Determining suitability
* Quoting
* Pricing
* Sales workflows
* CRM workflows

## Core Product Boundaries

### Daedalus Contracts

* Owns truth
* Owns evidence
* Owns provenance
* Owns signed outputs

### Daedalus Capture

* Owns capture
* Owns observations
* Owns field evidence collection

### Daedalus Main

* Owns understanding
* Owns inference
* Owns physical modelling
* Owns service comparison
* Owns explanation

## Architectural Rules

1. Nothing visual exists until the contract exists.
2. Nothing is explained until it can be derived from the twin or explicitly marked as uncertain.
3. Physical modelling operates on twin representations.
4. Unknown is a valid state.
5. Provenance is never discarded.
6. Identity resolution is an inferred model and must not be treated as observed truth unless explicitly promoted into Daedalus Contracts.
7. Evidence may be observed, measured, inferred, customer-stated, or unknown.
8. Physics engines own computation.
9. Visualisation owns presentation.
10. Orchestration owns model execution sequencing.
11. Cost, finance, grants, lending, quoting, and pricing remain external integrations.

## AI Guardrails

AI may:

* Assist extraction
* Assist summarisation
* Assist explanation
* Assist content generation

AI may not:

* Invent evidence
* Invent measurements
* Invent provenance
* Invent confidence
* Recommend, rank, score, or choose outcomes

All inferred values must remain explicitly marked as inferred.

All service comparisons must be explainable through evidence, twins, and model outputs.

## Falsification Tests

The architecture should be reconsidered if:

* Most comparisons cannot be explained through model behaviour
* Most model runs require manual overrides
* Provenance becomes impossible to trace
* New features repeatedly bypass twin derivation and model orchestration

## Success Criteria

A survey can be captured in Daedalus Capture, imported into Daedalus Main, converted into twins, modelled, and explained without requiring manual data migration or duplicate data entry.

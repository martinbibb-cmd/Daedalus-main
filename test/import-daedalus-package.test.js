'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('./fixtures/valid-daedalus-package-v3.json');
const {
  DaedalusPackageValidationError,
  FORBIDDEN_OUTPUT_FIELDS,
  importDaedalusPackage,
} = require('../src/daedalus-package');

test('imports a valid DaedalusPackage v3 into a unified property twin', () => {
  const source = structuredClone(fixture);
  const originalSnapshot = structuredClone(source);

  const compiled = importDaedalusPackage(source);

  assert.equal(compiled.kind, 'UnifiedPropertyTwinViewModel');
  assert.equal(compiled.packageBoundary, 'DaedalusPackage');
  assert.equal(compiled.packageVersion, 3);
  assert.equal(compiled.visitId, fixture.visit_id);
  assert.equal(compiled.propertyRef, fixture.property_ref);

  assert.deepEqual(
    compiled.systemTwin.boilers.map((observation) => observation.observationId),
    ['boiler-001'],
  );
  assert.deepEqual(
    compiled.systemTwin.cylinders.map((observation) => observation.observationId),
    ['cylinder-001'],
  );
  assert.deepEqual(
    compiled.systemTwin.emitters.map((observation) => observation.observationId),
    ['radiator-001'],
  );
  assert.deepEqual(
    compiled.systemTwin.controls.map((observation) => observation.observationId),
    ['controls-001'],
  );
  assert.deepEqual(
    compiled.houseTwin.areas.map((observation) => observation.observationId),
    ['area-ground-floor'],
  );

  assert.deepEqual(
    compiled.relationships.map((relationship) => relationship.type),
    ['containedIn', 'connectedTo', 'supplies', 'controls', 'serves'],
  );
  assert.deepEqual(
    compiled.evidence.map((evidence) => evidence.observation_id),
    ['photo-001', 'video-001', 'photo-002'],
  );

  const boiler = compiled.systemTwin.boilers[0];
  assert.equal(boiler.rawObservation.manufacturer, null);
  assert.deepEqual(boiler.rawObservation.age_years, { value: 12, state: 'approximate' });

  const radiatorConfidence = compiled.confidenceStates.find(
    (state) => state.sourceRef === 'observation:radiator-001' && state.state === 'unknown',
  );
  assert.ok(radiatorConfidence);

  const controlsConfidence = compiled.confidenceStates.find(
    (state) => state.sourceRef === 'observation:controls-001' && state.state === 'unresolved',
  );
  assert.ok(controlsConfidence);

  const boilerProvenance = compiled.provenanceLinks.find((link) => link.sourceRef === 'boiler-001');
  assert.deepEqual(boilerProvenance.evidenceRefs, ['photo-001', 'video-001']);
  assert.equal(boilerProvenance.provenance.captured_at, '2026-06-03T11:01:00Z');

  assert.deepEqual(source, originalSnapshot);
});

test('rejects invalid packages with structured readable issues', () => {
  const invalidPackage = structuredClone(fixture);
  delete invalidPackage.property_ref;
  invalidPackage.packageVersion = 2;
  invalidPackage.relationships[0].type = 'recommends';
  delete invalidPackage.observations[0].provenance;
  invalidPackage.observations[1].evidence_refs = ['missing-evidence'];

  assert.throws(
    () => importDaedalusPackage(invalidPackage),
    (error) => {
      assert.ok(error instanceof DaedalusPackageValidationError);
      assert.equal(error.code, 'DAEDALUS_PACKAGE_VALIDATION_FAILED');
      assert.ok(error.message.includes('issue'));
      assert.ok(Array.isArray(error.issues));
      assert.ok(error.issues.some((issue) => issue.code === 'unsupported_version'));
      assert.ok(error.issues.some((issue) => issue.code === 'missing_field' && issue.path.includes('propertyRef')));
      assert.ok(error.issues.some((issue) => issue.code === 'missing_provenance'));
      assert.ok(error.issues.some((issue) => issue.code === 'missing_evidence_ref'));
      assert.ok(error.issues.some((issue) => issue.code === 'unsupported_relationship_type'));
      return true;
    },
  );
});

test('compiled twin stays within the fixture 06 no-recommendation boundary', () => {
  const compiled = importDaedalusPackage(structuredClone(fixture));
  const seenForbiddenFields = [];

  walkKeys(compiled, (path, key) => {
    if (FORBIDDEN_OUTPUT_FIELDS.has(key)) {
      seenForbiddenFields.push(path.concat(key).join('.'));
    }
  });

  assert.deepEqual(seenForbiddenFields, []);
});

function walkKeys(value, onKey, path = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkKeys(entry, onKey, path.concat(index)));
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    onKey(path, key);
    walkKeys(nestedValue, onKey, path.concat(key));
  }
}

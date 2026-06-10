'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const heatingSurveyFixture = require('./fixtures/daedalus-package-v3-heating-survey.json');
const fixture = require('./fixtures/valid-daedalus-package-v3.json');
const { importDaedalusPackage } = require('../src/daedalus-package');
const { buildInspectionData, renderImportShellPage, summarizeCompiledTwin } = require('../src/import-shell');

const FORBIDDEN_EXPLANATION_TERMS = [
  /recommended/i,
  /best option/i,
  /suitability/i,
  /ranking/i,
  /score/i,
  /priority/i,
];

test('constitutional boundary: generated Main outputs stay explanatory, not recommendatory', () => {
  const compiled = importDaedalusPackage(structuredClone(heatingSurveyFixture));
  const inspection = buildInspectionData(compiled);
  const html = renderImportShellPage({
    inspection,
    summary: summarizeCompiledTwin(compiled),
  });
  const generatedOutputs = [
    JSON.stringify(compiled),
    JSON.stringify(inspection),
    html,
  ].join('\n');

  for (const term of FORBIDDEN_EXPLANATION_TERMS) {
    assert.doesNotMatch(generatedOutputs, term);
  }
});

test('constitutional boundary: source package, evidence, and observations remain immutable after processing', () => {
  const source = structuredClone(fixture);
  const sourceSnapshot = structuredClone(source);
  const evidenceSnapshot = structuredClone(source.observations.filter((observation) => observation.tag.includes('evidence')));
  const observationsSnapshot = structuredClone(source.observations);

  const compiled = importDaedalusPackage(source);
  buildInspectionData(compiled);
  summarizeCompiledTwin(compiled);

  assert.deepEqual(source, sourceSnapshot);
  assert.deepEqual(source.observations.filter((observation) => observation.tag.includes('evidence')), evidenceSnapshot);
  assert.deepEqual(source.observations, observationsSnapshot);
});

test('constitutional boundary: Main ingests broader system-scope observations without crashing', () => {
  const broadSystemPackage = createBroadSystemPackage();

  const compiled = importDaedalusPackage(broadSystemPackage);

  assert.equal(compiled.kind, 'UnifiedPropertyTwinViewModel');
  assert.equal(compiled.propertyRef, 'PR-1-SYSTEM-SCOPE');
  assert.ok(compiled.homeTwin.observationIds.includes('solar-pv-array-1'));
  assert.ok(compiled.homeTwin.observationIds.includes('battery-storage-1'));
  assert.ok(compiled.homeTwin.observationIds.includes('ev-charger-1'));
  assert.ok(compiled.homeTwin.observationIds.includes('air-conditioning-1'));
  assert.ok(compiled.homeTwin.observationIds.includes('mvhr-1'));
});

function createBroadSystemPackage() {
  const capturedAt = '2026-06-10T00:00:00Z';
  const provenance = {
    method: 'constitutional-boundary-fixture',
    captured_by: 'PR-1',
    captured_at: capturedAt,
  };
  const observations = [
    {
      observation_id: 'area-plant-room',
      tag: 'area',
      name: 'Plant Room',
      confidence: 'observed',
      provenance,
    },
    {
      observation_id: 'evidence-plant-room-photo',
      tag: 'photo evidence',
      name: 'Plant room photo',
      file_ref: 'plant-room.jpg',
      confidence: 'observed',
      provenance,
    },
    ...[
      ['solar-pv-array-1', 'solar pv', 'Solar PV array'],
      ['battery-storage-1', 'battery', 'Battery storage'],
      ['ev-charger-1', 'ev charger', 'EV charger'],
      ['air-conditioning-1', 'air conditioning', 'Air conditioning indoor unit'],
      ['mvhr-1', 'mvhr', 'MVHR unit'],
    ].map(([observation_id, tag, name]) => ({
      observation_id,
      tag,
      name,
      room_ref: 'area-plant-room',
      evidence_refs: ['evidence-plant-room-photo'],
      confidence: 'observed',
      provenance,
    })),
  ];

  return {
    packageVersion: 3,
    packageId: 'pr-1-main-system-scope',
    visitId: 'visit-pr-1-system-scope',
    propertyRef: 'PR-1-SYSTEM-SCOPE',
    captured_at: capturedAt,
    observations,
    relationships: [
      ...['solar-pv-array-1', 'battery-storage-1', 'ev-charger-1', 'air-conditioning-1', 'mvhr-1'].map((from) => ({
        relationship_id: `rel-${from}-contained`,
        type: 'containedIn',
        from,
        to: 'area-plant-room',
        evidence_refs: ['evidence-plant-room-photo'],
        confidence_state: 'observed',
        provenance,
      })),
    ],
    waterSupplyObservations: [],
    servicePointObservations: [],
  };
}

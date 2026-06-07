'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const heatingSurveyFixture = require('./fixtures/daedalus-package-v3-heating-survey.json');
const { importDaedalusPackage } = require('../src/daedalus-package');
const {
  buildInspectionData,
  handleImportShellRequest,
  summarizeCompiledTwin,
} = require('../src/import-shell');
const { buildTwinMapData, renderTwinMapViews } = require('../src/twin-map');

test('cross-repo heating survey fixture imports and renders without recommendations', async () => {
  const compiled = importDaedalusPackage(structuredClone(heatingSurveyFixture));
  const summary = summarizeCompiledTwin(compiled);
  const inspection = buildInspectionData(compiled);
  const mapData = buildTwinMapData(inspection);
  const mapHtml = renderTwinMapViews(inspection);

  assert.equal(summary.packageVersion, 3);
  assert.equal(summary.propertyRef, 'DAE-SMOKE-HEATING-001');
  assert.equal(summary.houseAreaCount, 3);
  assert.equal(summary.systemAssetCount, 6);
  assert.equal(summary.relationshipCount, 7);
  assert.equal(summary.evidenceCount, 3);
  assert.ok(summary.approximateCount > 0);
  assert.ok(summary.unknownCount > 0);
  assert.ok(summary.unresolvedCount > 0);

  assert.deepEqual(
    inspection.areas.map((area) => area.name),
    ['Kitchen', 'Airing Cupboard', 'Hall'],
  );
  assert.deepEqual(
    inspection.systemAssets.map((asset) => asset.id),
    [
      'boiler-kitchen',
      'cylinder-airing-cupboard',
      'thermostat-hall',
      'radiator-kitchen',
      'radiator-hall',
      'radiator-living-room',
    ],
  );
  assert.ok(mapData.placedSet.has('boiler-kitchen'));
  assert.ok(mapData.placedSet.has('cylinder-airing-cupboard'));
  assert.ok(mapData.placedSet.has('thermostat-hall'));
  assert.match(mapHtml, /Twin map — 2D spatial view/);
  assert.match(mapHtml, /Twin map — relationship graph/);
  assert.match(mapHtml, /rel-thermostat-controls-hall-radiator/);
  assert.match(mapHtml, /evidence-boiler-photo/);

  const response = await handleImportShellRequest(
    new Request('https://example.com/import', {
      body: JSON.stringify(heatingSurveyFixture),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    }),
  );
  const shellHtml = await response.text();

  assert.equal(response.status, 200);
  assert.match(shellHtml, /Compiled Twin Summary/);
  assert.match(shellHtml, /System assets:<\/strong> 6/);
  assert.match(shellHtml, /Relationships:<\/strong> 7/);
  assert.match(shellHtml, /Evidence count:<\/strong> 3/);
  assert.match(shellHtml, /Unknown facts/);
  assert.match(shellHtml, /Approximate facts/);
  assert.match(shellHtml, /Unresolved facts/);
  assert.doesNotMatch(shellHtml, /recommendedOption|bestOption|suitabilityScore|pricing|customerAdvice/i);
});


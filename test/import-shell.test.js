'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('./fixtures/valid-daedalus-package-v3.json');
const {
  buildInspectionData,
  NO_PERSISTENCE_WARNING,
  handleImportShellRequest,
  summarizeCompiledTwin,
} = require('../src/import-shell');
const { importDaedalusPackage } = require('../src/daedalus-package');

test('renders import shell route with no-persistence warning', async () => {
  const response = await handleImportShellRequest(new Request('https://example.com/import'));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /DaedalusPackage Import Shell/);
  assert.match(body, new RegExp(NO_PERSISTENCE_WARNING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('renders compiled twin summary for a valid package import', async () => {
  const formData = new FormData();
  formData.set('packageText', JSON.stringify(fixture));

  const response = await handleImportShellRequest(
    new Request('https://example.com/import', {
      body: formData,
      method: 'POST',
    }),
  );

  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Compiled Twin Summary/);
  assert.match(body, /House areas:<\/strong> 1/);
  assert.match(body, /System assets:<\/strong> 4/);
  assert.match(body, /Home context:<\/strong> 5/);
  assert.match(body, /Relationships:<\/strong> 5/);
  assert.match(body, /Evidence count:<\/strong> 3/);
  assert.match(body, /Water supply observations:<\/strong> 0/);
  assert.match(body, /Service point observations:<\/strong> 0/);
  assert.match(body, /Unknown count:<\/strong> 5/);
  assert.match(body, /Approximate count:<\/strong> 2/);
  assert.match(body, /Unresolved count:<\/strong> 3/);
  assert.match(body, /<h2>Areas<\/h2>/);
  assert.match(body, /<h2>System assets<\/h2>/);
  assert.match(body, /<h2>Relationships<\/h2>/);
  assert.match(body, /<h2>Evidence<\/h2>/);
  assert.match(body, /<h2>Provenance<\/h2>/);
  assert.match(body, /<h2>Uncertainty<\/h2>/);
  assert.match(body, /boiler-001/);
  assert.match(body, /photo-001/);
  assert.match(body, /rel-001/);
  assert.match(body, /Unknown facts/);
  assert.match(body, /Approximate facts/);
  assert.match(body, /Unresolved facts/);
});

test('renders structured validation issues for invalid package import', async () => {
  const invalidPackage = structuredClone(fixture);
  delete invalidPackage.property_ref;

  const response = await handleImportShellRequest(
    new Request('https://example.com/import', {
      body: JSON.stringify(invalidPackage),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    }),
  );

  const body = await response.text();

  assert.equal(response.status, 400);
  assert.match(body, /Validation issues/);
  assert.match(body, /<th>Path<\/th><th>Code<\/th><th>Message<\/th><th>Value<\/th>/);
  assert.match(body, /missing_field/);
  assert.match(body, /propertyRef is required/);
});

test('summarizes compiled twin counts needed by the shell', () => {
  const compiled = importDaedalusPackage(structuredClone(fixture));

  assert.deepEqual(summarizeCompiledTwin(compiled), {
    approximateCount: 2,
    evidenceCount: 3,
    homeContextCount: 5,
    houseAreaCount: 1,
    packageVersion: 3,
    propertyRef: 'prop-main-001',
    relationshipCount: 5,
    servicePointObservationCount: 0,
    systemAssetCount: 4,
    waterSupplyObservationCount: 0,
    unknownCount: 5,
    unresolvedCount: 3,
    visitId: 'visit-003',
  });
});

test('builds inspection data with evidence and relationship links', () => {
  const compiled = importDaedalusPackage(structuredClone(fixture));
  const inspection = buildInspectionData(compiled);

  assert.equal(inspection.systemAssets.length, 4);
  assert.deepEqual(inspection.areas[0].containedAssets, ['boiler-001']);
  assert.equal(inspection.relationships.length, 5);
  assert.deepEqual(
    inspection.evidence.find((entry) => entry.id === 'photo-001').linkedAssets.sort(),
    ['boiler-001', 'area-ground-floor'].sort(),
  );
  assert.ok(inspection.uncertainty.unknown.length > 0);
  assert.ok(inspection.uncertainty.approximate.length > 0);
  assert.ok(inspection.uncertainty.unresolved.length > 0);
  assert.notEqual(inspection.systemAssets[0].provenance, 'none');
  assert.notEqual(inspection.areas[0].provenance, 'none');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('./fixtures/valid-daedalus-package-v3.json');
const { importDaedalusPackage } = require('../src/daedalus-package');
const { buildInspectionData } = require('../src/import-shell');
const { buildTwinMapData, renderTwinMapViews } = require('../src/twin-map');

function loadInspection() {
  return buildInspectionData(importDaedalusPackage(structuredClone(fixture)));
}

// ── buildTwinMapData ──────────────────────────────────────────────────────────

test('buildTwinMapData: boiler-001 is in placedSet via containedIn relationship', () => {
  const inspection = loadInspection();
  const mapData = buildTwinMapData(inspection);

  assert.ok(mapData.placedSet.has('boiler-001'), 'boiler-001 should be placed');
});

test('buildTwinMapData: radiator-001 is area-grouped under area-ground-floor via room_ref', () => {
  const inspection = loadInspection();
  const mapData = buildTwinMapData(inspection);

  assert.ok(!mapData.placedSet.has('radiator-001'), 'radiator-001 should not be in placedSet (no containedIn)');
  const grouped = mapData.groupedByArea.get('area-ground-floor');
  assert.ok(Array.isArray(grouped), 'groupedByArea should have area-ground-floor entry');
  assert.ok(grouped.includes('radiator-001'), 'radiator-001 should be area-grouped under area-ground-floor');
});

test('buildTwinMapData: cylinder-001 and controls-001 are unplaced', () => {
  const inspection = loadInspection();
  const mapData = buildTwinMapData(inspection);

  const unplacedIds = mapData.unplacedAssets.map((a) => a.id);
  assert.ok(unplacedIds.includes('cylinder-001'), 'cylinder-001 should be unplaced');
  assert.ok(unplacedIds.includes('controls-001'), 'controls-001 should be unplaced');
});

test('buildTwinMapData: total asset count equals systemAssets length', () => {
  const inspection = loadInspection();
  const mapData = buildTwinMapData(inspection);

  const totalInAreas = inspection.areas.reduce((sum, area) => {
    const contained = area.containedAssets.length;
    const grouped = (mapData.groupedByArea.get(area.id) || []).length;
    return sum + contained + grouped;
  }, 0);
  const total = totalInAreas + mapData.unplacedAssets.length;

  assert.equal(total, inspection.systemAssets.length);
});

test('buildTwinMapData: relationships and evidence pass through', () => {
  const inspection = loadInspection();
  const mapData = buildTwinMapData(inspection);

  assert.equal(mapData.relationships.length, inspection.relationships.length);
  assert.equal(mapData.evidence.length, inspection.evidence.length);
});

// ── renderTwinMapViews ────────────────────────────────────────────────────────

test('renderTwinMapViews: renders spatial map section heading', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /Twin map — 2D spatial view/);
});

test('renderTwinMapViews: renders relationship graph section heading', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /Twin map — relationship graph/);
});

test('renderTwinMapViews: renders selected item detail section', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /Selected item detail/);
  assert.match(html, /twin-detail-panel/);
});

test('renderTwinMapViews: renders SVG elements with data-twin-id for all areas and assets', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /data-twin-id="area-ground-floor"/);
  assert.match(html, /data-twin-id="boiler-001"/);
  assert.match(html, /data-twin-id="cylinder-001"/);
  assert.match(html, /data-twin-id="radiator-001"/);
  assert.match(html, /data-twin-id="controls-001"/);
});

test('renderTwinMapViews: renders relationship edges in graph', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /data-twin-id="rel-001"/);
  assert.match(html, /data-twin-id="rel-002"/);
  assert.match(html, /data-twin-id="rel-003"/);
  assert.match(html, /data-twin-id="rel-004"/);
  assert.match(html, /data-twin-id="rel-005"/);
});

test('renderTwinMapViews: labels relationship types on graph edges', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /containedIn/);
  assert.match(html, /connectedTo/);
  assert.match(html, /supplies/);
  assert.match(html, /controls/);
  assert.match(html, /serves/);
});

test('renderTwinMapViews: unplaced lane present when unplaced assets exist', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /Unplaced \/ Evidence-only/);
});

test('renderTwinMapViews: evidence counts rendered as badges on nodes with evidence', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  // boiler-001 has 2 evidence refs (photo-001, video-001)
  // The badge renders the count; verify it appears somewhere near boiler-001
  assert.match(html, /evidenceCount.*2|>2<\/text>/);
});

test('renderTwinMapViews: embeds detail JSON in inline script', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /var D = \{/);
  assert.match(html, /"boiler-001"/);
  assert.match(html, /"area-ground-floor"/);
});

test('renderTwinMapViews: detail JSON includes evidence and provenance fields', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  assert.match(html, /"evidenceCount"/);
  assert.match(html, /"provenance"/);
  assert.match(html, /"confidence"/);
});

test('renderTwinMapViews: area-grouped asset (radiator-001) appears with dashed node class', () => {
  const inspection = loadInspection();
  const html = renderTwinMapViews(inspection);

  // The spatial map should render radiator-001 with grouped/dashed styling
  assert.match(html, /sm-node-grouped/);
});

// ── areaRef in buildInspectionData ───────────────────────────────────────────

test('buildInspectionData: radiator-001 has areaRef set from room_ref', () => {
  const inspection = loadInspection();
  const radiator = inspection.systemAssets.find((a) => a.id === 'radiator-001');

  assert.ok(radiator, 'radiator-001 should be a system asset');
  assert.equal(radiator.areaRef, 'area-ground-floor');
});

test('buildInspectionData: assets without room_ref have areaRef null', () => {
  const inspection = loadInspection();
  const boiler = inspection.systemAssets.find((a) => a.id === 'boiler-001');
  const cylinder = inspection.systemAssets.find((a) => a.id === 'cylinder-001');

  assert.equal(boiler.areaRef, null);
  assert.equal(cylinder.areaRef, null);
});

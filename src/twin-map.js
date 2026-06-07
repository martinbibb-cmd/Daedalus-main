'use strict';

// ── Visual state colours ──────────────────────────────────────────────────────

const REL_COLORS = {
  containedIn: '#8c959f',
  connectedTo: '#0969da',
  controls: '#8250df',
  supplies: '#cf7200',
  serves: '#2da44e',
};

const STATE_STROKE = {
  approximate: '#d4a72c',
  unknown: '#cf7200',
  unresolved: '#cf222e',
};

const PLACED_STROKE = '#0969da';
const UNPLACED_STROKE = '#8c959f';

// ── Layout constants ──────────────────────────────────────────────────────────

const NR = 26;       // node radius
const NSX = 70;      // node spacing X within area
const NSY = 70;      // node spacing Y within area
const AHDR = 28;     // area header height
const APAD = 16;     // area inner padding
const AMINW = 150;   // area minimum width
const SVSM = 20;     // svg outer margin
const LANEM = 36;    // unplaced lane top margin above nodes

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Processes inspection data into a structured map/graph dataset.
 * @param {object} inspection - output of buildInspectionData
 * @returns {object}
 */
function buildTwinMapData(inspection) {
  const assetById = new Map(inspection.systemAssets.map((a) => [a.id, a]));

  // Assets with a direct containedIn relationship
  const placedSet = new Set(inspection.areas.flatMap((a) => a.containedAssets));

  // Assets area-grouped via areaRef (room_ref present but no containedIn)
  const groupedByArea = new Map(inspection.areas.map((a) => [a.id, []]));
  for (const asset of inspection.systemAssets) {
    if (!placedSet.has(asset.id) && asset.areaRef && groupedByArea.has(asset.areaRef)) {
      groupedByArea.get(asset.areaRef).push(asset.id);
    }
  }

  const groupedSet = new Set([
    ...placedSet,
    ...Array.from(groupedByArea.values()).flat(),
  ]);
  const unplacedAssets = inspection.systemAssets.filter((a) => !groupedSet.has(a.id));

  return {
    areas: inspection.areas,
    systemAssets: inspection.systemAssets,
    relationships: inspection.relationships,
    evidence: inspection.evidence,
    assetById,
    placedSet,
    groupedByArea,
    unplacedAssets,
  };
}

/**
 * Renders the combined twin map HTML (2D spatial map + relationship graph +
 * detail panel + inline interaction script).
 * @param {object} inspection - output of buildInspectionData
 * @returns {string} HTML fragment
 */
function renderTwinMapViews(inspection) {
  const mapData = buildTwinMapData(inspection);
  const detailData = buildDetailData(inspection);

  return `<section>
        <h2>Twin map — 2D spatial view</h2>
        <p class="muted">Assets contained in areas shown inside their area box. Dashed border = area-grouped (area known, exact placement approximate). Unplaced / evidence-only assets shown in the lane below.</p>
        <div style="overflow-x:auto">
          ${renderSpatialMapSvg(mapData)}
        </div>
      </section>
      <section>
        <h2>Twin map — relationship graph</h2>
        <p class="muted">System links derived from imported twin relationships. Edge colour indicates relationship type. Click any node or edge for detail.</p>
        ${renderRelLegend()}
        <div style="overflow-x:auto">
          ${renderRelationshipGraphSvg(mapData)}
        </div>
      </section>
      <section>
        <h2>Selected item detail</h2>
        <div id="twin-detail-panel"><p class="muted">Click an asset, area, or relationship in the diagrams above to inspect its evidence, provenance, confidence and linked relationships.</p></div>
      </section>
      <script>
      (function () {
        var D = ${JSON.stringify(detailData)};
        var panel = document.getElementById('twin-detail-panel');
        function esc(s) {
          return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        function renderItem(item) {
          var rows = Object.entries(item).map(function (kv) {
            var v = kv[1];
            var vs = (v !== null && typeof v === 'object') ? JSON.stringify(v, null, 2) : String(v == null ? '' : v);
            return '<tr><th style="text-align:left;padding:0.3rem 0.5rem;width:10rem;white-space:nowrap;font-weight:600">'
              + esc(kv[0]) + '</th><td style="padding:0.3rem 0.5rem;word-break:break-all">' + esc(vs) + '</td></tr>';
          }).join('');
          return '<table style="border-collapse:collapse;width:100%;font-size:0.875rem">' + rows + '</table>';
        }
        document.addEventListener('click', function (e) {
          var el = e.target.closest('[data-twin-id]');
          if (!el) return;
          var id = el.getAttribute('data-twin-id');
          var item = D[id];
          if (item) {
            panel.innerHTML = '<p style="margin:0 0 0.5rem"><strong>' + esc(id) + '</strong></p>' + renderItem(item);
          }
        });
        document.querySelectorAll('[data-twin-id]').forEach(function (el) {
          el.style.cursor = 'pointer';
        });
      }());
      </script>`;
}

// ── Internal: detail data ─────────────────────────────────────────────────────

function buildDetailData(inspection) {
  const detail = {};

  for (const area of inspection.areas) {
    detail[area.id] = {
      kind: 'area',
      id: area.id,
      name: area.name,
      placementState: area.placementState,
      confidence: area.confidence,
      containedAssets: area.containedAssets.join(', ') || 'none',
    };
  }

  for (const asset of inspection.systemAssets) {
    detail[asset.id] = {
      kind: 'asset',
      id: asset.id,
      subtype: asset.subtype,
      category: asset.category,
      placementState: asset.placementState,
      areaRef: asset.areaRef || 'none',
      confidence: asset.confidence,
      evidenceCount: asset.evidenceCount,
      relationshipsIn: asset.inCount,
      relationshipsOut: asset.outCount,
    };
  }

  for (const rel of inspection.relationships) {
    detail[rel.id] = {
      kind: 'relationship',
      id: rel.id,
      type: rel.type,
      source: rel.source,
      target: rel.target,
      confidence: rel.confidence,
      provenance: rel.provenance,
    };
  }

  for (const ev of inspection.evidence) {
    detail[ev.id] = {
      kind: 'evidence',
      id: ev.id,
      title: ev.title,
      type: ev.type,
      confidence: ev.confidence,
      linkedAssets: ev.linkedAssets.join(', ') || 'none',
    };
  }

  return detail;
}

// ── Internal: spatial map SVG ─────────────────────────────────────────────────

function renderSpatialMapSvg(mapData) {
  const { areas, assetById, groupedByArea, unplacedAssets } = mapData;

  // Build area boxes with contained + grouped assets
  const boxes = [];
  let curX = SVSM;
  const topY = SVSM;

  for (const area of areas) {
    const contained = area.containedAssets;
    const grouped = groupedByArea.get(area.id) || [];
    const allInArea = [...contained, ...grouped];
    const cols = allInArea.length <= 3 ? Math.max(1, allInArea.length) : Math.ceil(Math.sqrt(allInArea.length));
    const rows = allInArea.length === 0 ? 1 : Math.ceil(allInArea.length / cols);
    const w = Math.max(AMINW, cols * NSX + 2 * APAD);
    const h = AHDR + rows * NSY + 2 * APAD;
    boxes.push({ area, x: curX, y: topY, w, h, contained, grouped, allInArea, cols });
    curX += w + SVSM;
  }

  const maxAreaH = boxes.length ? Math.max(...boxes.map((b) => b.h)) : AHDR + NSY + 2 * APAD;
  const nodePos = new Map();

  for (const box of boxes) {
    const { x: bx, y: by, allInArea, cols } = box;
    nodePos.set(box.area.id, { x: bx + box.w / 2, y: by + box.h / 2 });
    allInArea.forEach((assetId, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      nodePos.set(assetId, {
        x: bx + APAD + NR + col * NSX,
        y: by + AHDR + APAD + NR + row * NSY,
      });
    });
  }

  // Unplaced lane layout
  const laneTopY = topY + maxAreaH + SVSM;
  const hasUnplaced = unplacedAssets.length > 0;
  const unplacedCols = Math.max(1, Math.min(6, unplacedAssets.length));
  const unplacedRows = hasUnplaced ? Math.ceil(unplacedAssets.length / unplacedCols) : 0;

  unplacedAssets.forEach((asset, i) => {
    const col = i % unplacedCols;
    const row = Math.floor(i / unplacedCols);
    nodePos.set(asset.id, {
      x: SVSM + NR + col * NSX,
      y: laneTopY + LANEM + NR + row * NSY,
    });
  });

  const svgH = hasUnplaced
    ? laneTopY + LANEM + unplacedRows * NSY + NR + SVSM + 20
    : topY + maxAreaH + SVSM;
  const svgW = Math.max(600, curX);

  const defs = `<defs>
    <style>
      .sm-area-bg { fill: #f6f8fa; stroke: #24292f; stroke-width: 1.5; }
      .sm-area-hdr { fill: #eaeef2; }
      .sm-area-label { font: bold 11px system-ui,sans-serif; fill: #24292f; dominant-baseline: middle; }
      .sm-area-state { font: 10px system-ui,sans-serif; fill: #57606a; dominant-baseline: middle; text-anchor: end; }
      .sm-node { fill: white; stroke-width: 2.5; }
      .sm-node-grouped { stroke-dasharray: 5 3; }
      .sm-node-text { font: bold 9px system-ui,sans-serif; fill: #24292f; text-anchor: middle; dominant-baseline: middle; }
      .sm-node-id { font: 8px system-ui,sans-serif; fill: #57606a; text-anchor: middle; dominant-baseline: middle; }
      .sm-badge-circle { }
      .sm-badge-text { font: bold 8px system-ui,sans-serif; fill: white; text-anchor: middle; dominant-baseline: middle; }
      .sm-lane-sep { stroke: #8c959f; stroke-width: 1; stroke-dasharray: 5 4; fill: none; }
      .sm-lane-label { font: 11px system-ui,sans-serif; fill: #57606a; dominant-baseline: middle; }
    </style>
  </defs>`;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" role="img" aria-label="2D spatial twin map">${defs}\n`;

  // Draw area boxes
  for (const box of boxes) {
    const { area, x, y, w, h, contained, grouped } = box;
    svg += `  <g data-twin-id="${ea(area.id)}" role="button" tabindex="0" aria-label="Area: ${ea(area.name || area.id)}">
    <rect class="sm-area-bg" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>
    <rect class="sm-area-hdr" x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${AHDR - 1.5}" rx="5"/>
    <text class="sm-area-label" x="${x + 8}" y="${y + AHDR / 2}">${eh(area.name || area.id)}</text>
    <text class="sm-area-state" x="${x + w - 6}" y="${y + AHDR / 2}">${eh(area.placementState)}</text>
  </g>\n`;

    for (const assetId of contained) {
      const asset = assetById.get(assetId);
      const pos = nodePos.get(assetId);
      if (asset && pos) {
        svg += renderSpatialNode(asset, pos, nodeStrokeColor(asset), false);
      }
    }
    for (const assetId of grouped) {
      const asset = assetById.get(assetId);
      const pos = nodePos.get(assetId);
      if (asset && pos) {
        svg += renderSpatialNode(asset, pos, nodeStrokeColor(asset), true);
      }
    }
  }

  // Unplaced lane
  if (hasUnplaced) {
    svg += `  <line class="sm-lane-sep" x1="${SVSM}" y1="${laneTopY + 10}" x2="${svgW - SVSM}" y2="${laneTopY + 10}"/>\n`;
    svg += `  <text class="sm-lane-label" x="${SVSM}" y="${laneTopY + 24}">Unplaced / Evidence-only</text>\n`;
    for (const asset of unplacedAssets) {
      const pos = nodePos.get(asset.id);
      if (pos) {
        svg += renderSpatialNode(asset, pos, nodeStrokeColor(asset, true), false);
      }
    }
  }

  svg += renderSpatialLegend(svgH, SVSM);
  svg += '</svg>';
  return svg;
}

function renderSpatialNode(asset, pos, strokeColor, isDashed) {
  const { x, y } = pos;
  const tag = (asset.subtype || asset.id).split(':')[0];
  const shortTag = tag.length > 9 ? tag.slice(0, 8) + '…' : tag;
  const shortId = asset.id.length > 11 ? asset.id.slice(0, 10) + '…' : asset.id;
  const dashClass = isDashed ? ' sm-node-grouped' : '';
  const bx = Math.round(x + NR - 8);
  const by = Math.round(y - NR + 8);

  return `  <g data-twin-id="${ea(asset.id)}" role="button" tabindex="0" aria-label="Asset: ${ea(asset.id)}">
    <circle cx="${x}" cy="${y}" r="${NR}" class="sm-node${dashClass}" stroke="${strokeColor}"/>
    <text class="sm-node-text" x="${x}" y="${y - 5}">${eh(shortTag)}</text>
    <text class="sm-node-id" x="${x}" y="${y + 9}">${eh(shortId)}</text>
    ${asset.evidenceCount > 0
      ? `<circle cx="${bx}" cy="${by}" r="8" class="sm-badge-circle" fill="${strokeColor}"/>
    <text class="sm-badge-text" x="${bx}" y="${by}">${asset.evidenceCount}</text>`
      : ''}
  </g>\n`;
}

function renderSpatialLegend(svgH, marginX) {
  const ly = svgH - 14;
  const items = [
    { color: PLACED_STROKE, label: 'placed (containedIn)', dash: '' },
    { color: PLACED_STROKE, label: 'area-grouped (room_ref)', dash: '5 3' },
    { color: STATE_STROKE.approximate, label: 'approximate', dash: '' },
    { color: STATE_STROKE.unknown, label: 'unknown', dash: '' },
    { color: STATE_STROKE.unresolved, label: 'unresolved', dash: '' },
    { color: UNPLACED_STROKE, label: 'unplaced', dash: '' },
  ];
  let x = marginX;
  let out = `  <g style="font:10px system-ui,sans-serif;fill:#57606a">\n`;
  for (const item of items) {
    const dashAttr = item.dash ? ` stroke-dasharray="${item.dash}"` : '';
    out += `    <circle cx="${x + 6}" cy="${ly}" r="5" fill="white" stroke="${item.color}" stroke-width="2"${dashAttr}/>`;
    out += `<text x="${x + 16}" y="${ly + 4}">${eh(item.label)}</text>\n`;
    x += item.label.length * 6.5 + 28;
  }
  out += `  </g>\n`;
  return out;
}

// ── Internal: relationship graph SVG ─────────────────────────────────────────

function renderRelationshipGraphSvg(mapData) {
  const { areas, systemAssets, relationships, assetById } = mapData;

  // Column layout: areas left, assets right (in 1 or 2 columns)
  const nodeSpacingY = 80;
  const areaColX = 100;
  const assetCol1X = 380;
  const assetCol2X = 560;
  const topY = 40;

  // Assign positions
  const nodePos = new Map();
  const nodeKind = new Map();

  areas.forEach((area, i) => {
    nodePos.set(area.id, { x: areaColX, y: topY + i * nodeSpacingY });
    nodeKind.set(area.id, 'area');
  });

  const splitAt = Math.ceil(systemAssets.length / 2);
  systemAssets.forEach((asset, i) => {
    const useCol2 = systemAssets.length > 4 && i >= splitAt;
    const idx = useCol2 ? i - splitAt : i;
    nodePos.set(asset.id, {
      x: useCol2 ? assetCol2X : assetCol1X,
      y: topY + idx * nodeSpacingY,
    });
    nodeKind.set(asset.id, 'asset');
  });

  const allYs = Array.from(nodePos.values()).map((p) => p.y);
  const svgH = Math.max(200, Math.max(...allYs) + topY + 50);
  const svgW = systemAssets.length > 4 ? 680 : 560;

  const defs = buildGraphDefs();

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" role="img" aria-label="Relationship graph">${defs}\n`;

  // Draw edges first (behind nodes)
  for (const rel of relationships) {
    const fromPos = nodePos.get(rel.source);
    const toPos = nodePos.get(rel.target);
    if (!fromPos || !toPos) continue;

    const fromKind = nodeKind.get(rel.source) || 'asset';
    const toKind = nodeKind.get(rel.target) || 'asset';
    const color = REL_COLORS[rel.type] || '#57606a';

    // Compute boundary points
    const [sx, sy] = boundaryPoint(fromPos.x, fromPos.y, toPos.x, toPos.y, fromKind);
    const [tx, ty] = boundaryPoint(toPos.x, toPos.y, fromPos.x, fromPos.y, toKind);

    const [cpx, cpy] = curveCp(sx, sy, tx, ty);
    const markerId = `arrow-${rel.type}`;
    const pathD = `M ${f(sx)} ${f(sy)} Q ${f(cpx)} ${f(cpy)} ${f(tx)} ${f(ty)}`;
    const midX = f((sx + 2 * cpx + tx) / 4);
    const midY = f((sy + 2 * cpy + ty) / 4 - 8);

    svg += `  <g data-twin-id="${ea(rel.id)}" role="button" tabindex="0" aria-label="Relationship: ${ea(rel.type)} ${ea(rel.source)} → ${ea(rel.target)}">
    <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.5" marker-end="url(#${markerId})"/>
    <text x="${midX}" y="${midY}" style="font:9px system-ui,sans-serif;fill:${color};text-anchor:middle">${eh(rel.type)}</text>
  </g>\n`;
  }

  // Draw area nodes
  const areaNodeW = 130;
  const areaNodeH = 30;
  for (const area of areas) {
    const pos = nodePos.get(area.id);
    if (!pos) continue;
    const rx = pos.x - areaNodeW / 2;
    const ry = pos.y - areaNodeH / 2;
    const strokeColor = areaStrokeColor(area);
    svg += `  <g data-twin-id="${ea(area.id)}" role="button" tabindex="0" aria-label="Area: ${ea(area.name || area.id)}">
    <rect x="${rx}" y="${ry}" width="${areaNodeW}" height="${areaNodeH}" rx="5" fill="white" stroke="${strokeColor}" stroke-width="2"/>
    <text x="${pos.x}" y="${pos.y}" style="font:10px system-ui,sans-serif;fill:#24292f;text-anchor:middle;dominant-baseline:middle">${eh(area.name || area.id)}</text>
  </g>\n`;
  }

  // Draw asset nodes
  for (const asset of systemAssets) {
    const pos = nodePos.get(asset.id);
    if (!pos) continue;
    const strokeColor = nodeStrokeColor(asset);
    const tag = (asset.subtype || asset.id).split(':')[0];
    const shortTag = tag.length > 9 ? tag.slice(0, 8) + '…' : tag;
    const shortId = asset.id.length > 11 ? asset.id.slice(0, 10) + '…' : asset.id;
    const bx = Math.round(pos.x + NR - 8);
    const by = Math.round(pos.y - NR + 8);

    svg += `  <g data-twin-id="${ea(asset.id)}" role="button" tabindex="0" aria-label="Asset: ${ea(asset.id)}">
    <circle cx="${pos.x}" cy="${pos.y}" r="${NR}" fill="white" stroke="${strokeColor}" stroke-width="2.5"/>
    <text x="${pos.x}" y="${pos.y - 5}" style="font:bold 9px system-ui,sans-serif;fill:#24292f;text-anchor:middle;dominant-baseline:middle">${eh(shortTag)}</text>
    <text x="${pos.x}" y="${pos.y + 9}" style="font:8px system-ui,sans-serif;fill:#57606a;text-anchor:middle;dominant-baseline:middle">${eh(shortId)}</text>
    ${asset.evidenceCount > 0
      ? `<circle cx="${bx}" cy="${by}" r="8" fill="${strokeColor}"/><text x="${bx}" y="${by}" style="font:bold 8px system-ui,sans-serif;fill:white;text-anchor:middle;dominant-baseline:middle">${asset.evidenceCount}</text>`
      : ''}
  </g>\n`;
  }

  svg += '</svg>';
  return svg;
}

function buildGraphDefs() {
  const markers = Object.entries(REL_COLORS)
    .map(([type, color]) => {
      return `<marker id="arrow-${type}" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M 0 0 L 10 4 L 0 8 z" fill="${color}"/>
    </marker>`;
    })
    .join('\n    ');
  return `<defs>\n    ${markers}\n  </defs>\n`;
}

function renderRelLegend() {
  const items = Object.entries(REL_COLORS);
  const swatches = items
    .map(([type, color]) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="${color}" stroke-width="2"/></svg>${eh(type)}</span>`)
    .join('');
  return `<p class="muted" style="font-size:0.85rem">${swatches}</p>`;
}

// ── Internal: geometry helpers ────────────────────────────────────────────────

/**
 * Returns the boundary point of a node (circle or rect) in the direction of the target.
 */
function boundaryPoint(nx, ny, tx, ty, kind) {
  const dx = tx - nx;
  const dy = ty - ny;
  const dist = Math.hypot(dx, dy) || 1;

  if (kind === 'area') {
    const hw = 65; // half of areaNodeW=130
    const hh = 15; // half of areaNodeH=30
    const scale = Math.min(hw / Math.abs(dx || 1), hh / Math.abs(dy || 1));
    const capped = Math.min(scale, dist / dist);
    return [nx + dx * (Math.min(hw, Math.abs(dx)) / Math.abs(dx || 1)) * Math.sign(dx),
            ny + dy * (Math.min(hh, Math.abs(dy)) / Math.abs(dy || 1)) * Math.sign(dy)];
  }

  // circle (asset)
  return [nx + (NR * dx) / dist, ny + (NR * dy) / dist];
}

/**
 * Computes a quadratic bezier control point with a perpendicular offset.
 */
function curveCp(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular offset (30px) - always clockwise
  const offX = (-dy / len) * 30;
  const offY = (dx / len) * 30;
  return [mx + offX, my + offY];
}

// ── Internal: colour helpers ──────────────────────────────────────────────────

function nodeStrokeColor(asset, forceUnplaced = false) {
  if (forceUnplaced) return UNPLACED_STROKE;
  const conf = asset.confidence || '';
  if (conf.includes('unresolved')) return STATE_STROKE.unresolved;
  if (conf.includes('unknown')) return STATE_STROKE.unknown;
  if (conf.includes('approximate')) return STATE_STROKE.approximate;
  return PLACED_STROKE;
}

function areaStrokeColor(area) {
  const conf = area.confidence || '';
  if (conf.includes('unresolved')) return STATE_STROKE.unresolved;
  if (conf.includes('unknown')) return STATE_STROKE.unknown;
  if (conf.includes('approximate')) return STATE_STROKE.approximate;
  return '#24292f';
}

// ── Internal: SVG string helpers ──────────────────────────────────────────────

function ea(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function eh(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function f(n) {
  return Math.round(n * 10) / 10;
}

module.exports = {
  buildTwinMapData,
  renderTwinMapViews,
};

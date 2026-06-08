'use strict';

const { DaedalusPackageValidationError, importDaedalusPackage } = require('./daedalus-package');
const { renderTwinMapViews } = require('./twin-map');

const NO_PERSISTENCE_WARNING =
  'This package is processed locally/in-session unless storage is later enabled.';

async function handleImportShellRequest(request) {
  const url = new URL(request.url);

  if (url.pathname !== '/' && url.pathname !== '/import') {
    return createHtmlResponse(renderImportShellPage(), 404);
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    return createHtmlResponse(renderImportShellPage(), 200, request.method === 'HEAD');
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      headers: {
        allow: 'GET,HEAD,POST',
        'content-type': 'text/plain; charset=utf-8',
      },
      status: 405,
    });
  }

  const submittedPackage = await readSubmittedPackage(request);

  if (!submittedPackage) {
    return createHtmlResponse(
      renderImportShellPage({
        issues: [
          {
            code: 'missing_package_input',
            message: 'Paste package JSON or upload a .json file.',
            path: ['package'],
          },
        ],
      }),
      400,
    );
  }

  let parsedPackage;

  try {
    parsedPackage = JSON.parse(submittedPackage);
  } catch (error) {
    return createHtmlResponse(
      renderImportShellPage({
        packageText: submittedPackage,
        issues: [
          {
            code: 'invalid_json',
            message: `Package input is not valid JSON: ${error.message}`,
            path: ['package'],
          },
        ],
      }),
      400,
    );
  }

  try {
    const compiledTwin = importDaedalusPackage(parsedPackage);

    return createHtmlResponse(
      renderImportShellPage({
        inspection: buildInspectionData(compiledTwin),
        packageText: submittedPackage,
        summary: summarizeCompiledTwin(compiledTwin),
      }),
      200,
    );
  } catch (error) {
    if (!(error instanceof DaedalusPackageValidationError)) {
      throw error;
    }

    return createHtmlResponse(
      renderImportShellPage({
        issues: error.issues,
        packageText: submittedPackage,
      }),
      400,
    );
  }
}

function summarizeCompiledTwin(compiledTwin) {
  const stateCounts = {
    approximate: 0,
    unknown: 0,
    unresolved: 0,
  };

  for (const state of compiledTwin.confidenceStates) {
    if (Object.prototype.hasOwnProperty.call(stateCounts, state.state)) {
      stateCounts[state.state] += 1;
    }
  }

  return {
    evidenceCount: compiledTwin.evidence.length,
    homeContextCount: compiledTwin.homeTwin.observationIds.length,
    houseAreaCount: compiledTwin.houseTwin.areas.length,
    packageVersion: compiledTwin.packageVersion,
    propertyRef: compiledTwin.propertyRef,
    relationshipCount: compiledTwin.relationships.length,
    servicePointObservationCount: compiledTwin.servicePointObservations.length,
    systemAssetCount: compiledTwin.systemTwin.observationIds.length,
    waterSupplyObservationCount: compiledTwin.waterSupplyObservations.length,
    unknownCount: stateCounts.unknown,
    unresolvedCount: stateCounts.unresolved,
    visitId: compiledTwin.visitId,
    approximateCount: stateCounts.approximate,
  };
}

async function readSubmittedPackage(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return JSON.stringify(await request.json());
  }

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    const packageText = formData.get('packageText');
    if (typeof packageText === 'string' && packageText.trim() !== '') {
      return packageText;
    }

    const packageFile = formData.get('packageFile');
    if (packageFile && typeof packageFile.text === 'function') {
      const fileText = await packageFile.text();
      if (fileText.trim() !== '') {
        return fileText;
      }
    }

    return null;
  }

  const textBody = await request.text();
  return textBody.trim() === '' ? null : textBody;
}

function renderImportShellPage({ summary = null, inspection = null, issues = [], packageText = '' } = {}) {
  const hasIssues = Array.isArray(issues) && issues.length > 0;
  const hasSummary = Boolean(summary);
  const hasInspection = Boolean(inspection);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Daedalus Twin Import Shell</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem auto; max-width: 56rem; padding: 0 1rem; }
      h1, h2 { margin-bottom: 0.5rem; }
      p, li { line-height: 1.5; }
      textarea { width: 100%; min-height: 16rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
      th, td { border: 1px solid #d0d7de; padding: 0.5rem; text-align: left; vertical-align: top; }
      .warning { background: #fff8c5; border: 1px solid #d4a72c; padding: 0.75rem; }
      .error { background: #ffebe9; border: 1px solid #cf222e; padding: 0.75rem; }
      .summary-list { list-style: none; padding: 0; margin: 1rem 0; }
      .summary-list li { margin: 0.35rem 0; }
      .stack { display: grid; gap: 0.75rem; }
      .muted { color: #57606a; }
    </style>
  </head>
  <body>
    <main class="stack">
      <header>
        <h1>DaedalusPackage Import Shell</h1>
        <p>Stateless Daedalus twin import/viewer for Cloudflare-hosted sessions.</p>
      </header>

      <p class="warning">${escapeHtml(NO_PERSISTENCE_WARNING)}</p>

      <form method="post" action="/import" enctype="multipart/form-data" class="stack">
        <label for="packageFile">Upload DaedalusPackage JSON file</label>
        <input id="packageFile" name="packageFile" type="file" accept="application/json,.json" />

        <label for="packageText">Or paste DaedalusPackage JSON</label>
        <textarea id="packageText" name="packageText" spellcheck="false">${escapeHtml(packageText)}</textarea>

        <button type="submit">Import package</button>
      </form>

      ${
        hasSummary
          ? `<section>
        <h2>Compiled Twin Summary</h2>
        <ul class="summary-list">
          <li><strong>Package version:</strong> ${escapeHtml(String(summary.packageVersion))}</li>
          <li><strong>Visit:</strong> ${escapeHtml(summary.visitId)}</li>
          <li><strong>Property:</strong> ${escapeHtml(summary.propertyRef)}</li>
          <li><strong>House areas:</strong> ${summary.houseAreaCount}</li>
          <li><strong>System assets:</strong> ${summary.systemAssetCount}</li>
          <li><strong>Home context:</strong> ${summary.homeContextCount}</li>
          <li><strong>Relationships:</strong> ${summary.relationshipCount}</li>
          <li><strong>Evidence count:</strong> ${summary.evidenceCount}</li>
          <li><strong>Water supply observations:</strong> ${summary.waterSupplyObservationCount}</li>
          <li><strong>Service point observations:</strong> ${summary.servicePointObservationCount}</li>
          <li><strong>Unknown count:</strong> ${summary.unknownCount}</li>
          <li><strong>Approximate count:</strong> ${summary.approximateCount}</li>
          <li><strong>Unresolved count:</strong> ${summary.unresolvedCount}</li>
        </ul>
      </section>`
          : ''
      }
      ${hasInspection ? renderInspectionSections(inspection) : ''}

      ${
        hasIssues
          ? `<section class="error">
        <h2>Validation issues</h2>
        <p>The package could not be imported. Review the structured issues below.</p>
        <table>
          <thead>
            <tr><th>Path</th><th>Code</th><th>Message</th><th>Value</th></tr>
          </thead>
          <tbody>
            ${issues
              .map((issue) => {
                const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
                const value = issue.value === undefined ? '' : JSON.stringify(issue.value);
                return `<tr>
                  <td>${escapeHtml(path)}</td>
                  <td>${escapeHtml(String(issue.code ?? ''))}</td>
                  <td>${escapeHtml(String(issue.message ?? ''))}</td>
                  <td>${escapeHtml(value)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </section>`
          : ''
      }
    </main>
  </body>
</html>`;
}

function buildInspectionData(compiledTwin) {
  const observationById = new Map();
  const inByObservationId = new Map();
  const outByObservationId = new Map();
  const containedAssetIdsByArea = new Map();
  const evidenceLinkedAssetIds = new Map();

  for (const relationship of compiledTwin.relationships) {
    if (!outByObservationId.has(relationship.from)) {
      outByObservationId.set(relationship.from, []);
    }
    if (!inByObservationId.has(relationship.to)) {
      inByObservationId.set(relationship.to, []);
    }
    outByObservationId.get(relationship.from).push(relationship);
    inByObservationId.get(relationship.to).push(relationship);

    if (relationship.type === 'containedIn') {
      if (!containedAssetIdsByArea.has(relationship.to)) {
        containedAssetIdsByArea.set(relationship.to, []);
      }
      containedAssetIdsByArea.get(relationship.to).push(relationship.from);
    }
  }

  for (const observation of compiledTwin.homeTwin.observations) {
    observationById.set(observation.observationId, observation);

    for (const evidenceRef of observation.evidenceRefs) {
      if (!evidenceLinkedAssetIds.has(evidenceRef)) {
        evidenceLinkedAssetIds.set(evidenceRef, new Set());
      }
      if (observation.classification !== 'evidence') {
        evidenceLinkedAssetIds.get(evidenceRef).add(observation.observationId);
      }
    }
  }

  for (const relationship of compiledTwin.relationships) {
    for (const evidenceRef of relationship.evidenceRefs) {
      if (!evidenceLinkedAssetIds.has(evidenceRef)) {
        evidenceLinkedAssetIds.set(evidenceRef, new Set());
      }
      evidenceLinkedAssetIds.get(evidenceRef).add(relationship.from);
      evidenceLinkedAssetIds.get(evidenceRef).add(relationship.to);
    }
  }

  const confidenceBySourceRef = createConfidenceBySourceRef(compiledTwin.confidenceStates);
  const systemAssets = compiledTwin.systemTwin.observations.map((asset) => ({
    areaRef: readStringField(asset.rawObservation, ['room_ref', 'roomRef', 'area_ref', 'areaRef']) ?? null,
    category: asset.classification,
    confidence: formatConfidence(asset.confidence, confidenceBySourceRef.get(`observation:${asset.observationId}`) ?? []),
    evidenceCount: asset.evidenceRefs.length,
    id: asset.observationId,
    inCount: (inByObservationId.get(asset.observationId) ?? []).length,
    outCount: (outByObservationId.get(asset.observationId) ?? []).length,
    placementState: inferAssetPlacementState(asset.observationId, outByObservationId),
    provenance: formatProvenance(asset.provenance),
    subtype: inferAssetSubtype(asset),
  }));
  const areas = compiledTwin.houseTwin.areas.map((area) => ({
    confidence: formatConfidence(area.confidence, confidenceBySourceRef.get(`observation:${area.observationId}`) ?? []),
    containedAssets: containedAssetIdsByArea.get(area.observationId) ?? [],
    id: area.observationId,
    name: readStringField(area.rawObservation, ['name']) ?? area.observationId,
    placementState: inferAreaPlacementState(area.observationId, inByObservationId, outByObservationId),
    provenance: formatProvenance(area.provenance),
  }));
  const relationships = compiledTwin.relationships.map((relationship) => ({
    confidence: formatConfidence(relationship.confidence, confidenceBySourceRef.get(`relationship:${relationship.relationshipId}`) ?? []),
    id: relationship.relationshipId,
    provenance: formatProvenance(relationship.provenance),
    source: relationship.from,
    target: relationship.to,
    type: relationship.type,
  }));
  const evidence = compiledTwin.evidence.map((item) => {
    const evidenceId = readStringField(item, ['observation_id', 'observationId']) ?? 'unknown-evidence';
    const linkedAssetIds = new Set(evidenceLinkedAssetIds.get(evidenceId) ?? []);
    const directAssetRef = readStringField(item, ['asset_ref', 'assetRef']);
    if (directAssetRef) {
      linkedAssetIds.add(directAssetRef);
    }

    return {
      confidence: formatConfidence(null, confidenceBySourceRef.get(`observation:${evidenceId}`) ?? []),
      id: evidenceId,
      linkedAssets: Array.from(linkedAssetIds),
      source: readStringField(item, ['tag']) ?? 'evidence',
      title: readStringField(item, ['title', 'name', 'file_ref', 'fileRef']) ?? evidenceId,
      type: readStringField(item, ['tag']) ?? 'evidence',
    };
  });
  const provenance = compiledTwin.provenanceLinks.map((link) => ({
    evidenceCount: link.evidenceRefs.length,
    evidenceRefs: link.evidenceRefs,
    sourceRef: link.sourceRef,
    sourceType: link.sourceType,
    summary: formatProvenance(link.provenance),
  }));
  const uncertainty = {
    approximate: formatUncertaintyStates(compiledTwin.confidenceStates, 'approximate'),
    unknown: formatUncertaintyStates(compiledTwin.confidenceStates, 'unknown'),
    unresolved: formatUncertaintyStates(compiledTwin.confidenceStates, 'unresolved'),
  };
  const waterSupply = compiledTwin.waterSupplyObservations.map(formatWaterSupplyObservation);
  const servicePoints = compiledTwin.servicePointObservations.map((observation) =>
    formatServicePointObservation(observation, areas, waterSupply),
  );

  return {
    areas,
    evidence,
    provenance,
    relationships,
    systemAssets,
    uncertainty,
    servicePoints,
    waterSupply,
    waterSupplyUncertainty: buildWaterSupplyUncertainty(waterSupply),
  };
}

function renderInspectionSections(inspection) {
  return `<section>
        <h2>Areas</h2>
        ${renderAreasTable(inspection.areas)}
      </section>
      <section>
        <h2>System assets</h2>
        ${renderSystemAssetsTable(inspection.systemAssets)}
      </section>
      <section>
        <h2>Relationships</h2>
        ${renderRelationshipsTable(inspection.relationships)}
      </section>
      <section>
        <h2>Evidence</h2>
        ${renderEvidenceTable(inspection.evidence)}
      </section>
      <section>
        <h2>Water Supply</h2>
        ${renderWaterSupplyTable(inspection.waterSupply)}
      </section>
      <section>
        <h2>Service Points</h2>
        ${renderServicePointTable(inspection.servicePoints)}
      </section>
      <section>
        <h2>Provenance</h2>
        ${renderProvenanceTable(inspection.provenance)}
      </section>
      <section>
        <h2>Uncertainty</h2>
        ${renderUncertaintyTables(inspection.uncertainty)}
        ${renderWaterSupplyUncertainty(inspection.waterSupplyUncertainty)}
      </section>
      ${renderTwinMapViews(inspection)}`;
}

function renderSystemAssetsTable(systemAssets) {
  return `<table>
    <thead>
      <tr><th>Asset</th><th>Category</th><th>Subtype</th><th>Confidence</th><th>Placement state</th><th>Linked evidence</th><th>Relationships in/out</th></tr>
    </thead>
    <tbody>
      ${systemAssets
        .map(
          (asset) => `<tr>
        <td>${escapeHtml(asset.id)}</td>
        <td>${escapeHtml(asset.category)}</td>
        <td>${escapeHtml(asset.subtype)}</td>
        <td>${escapeHtml(asset.confidence)}</td>
        <td>${escapeHtml(asset.placementState)}</td>
        <td>${asset.evidenceCount}</td>
        <td>${asset.inCount}/${asset.outCount}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderAreasTable(areas) {
  return `<table>
    <thead>
      <tr><th>Area</th><th>Name</th><th>Confidence</th><th>Placement state</th><th>Contained assets</th></tr>
    </thead>
    <tbody>
      ${areas
        .map(
          (area) => `<tr>
        <td>${escapeHtml(area.id)}</td>
        <td>${escapeHtml(area.name)}</td>
        <td>${escapeHtml(area.confidence)}</td>
        <td>${escapeHtml(area.placementState)}</td>
        <td>${escapeHtml(formatList(area.containedAssets))}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderRelationshipsTable(relationships) {
  return `<table>
    <thead>
      <tr><th>Relationship</th><th>Source</th><th>Type</th><th>Target</th><th>Provenance</th><th>Confidence</th></tr>
    </thead>
    <tbody>
      ${relationships
        .map(
          (relationship) => `<tr>
        <td>${escapeHtml(relationship.id)}</td>
        <td>${escapeHtml(relationship.source)}</td>
        <td>${escapeHtml(relationship.type)}</td>
        <td>${escapeHtml(relationship.target)}</td>
        <td>${escapeHtml(relationship.provenance)}</td>
        <td>${escapeHtml(relationship.confidence)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderEvidenceTable(evidence) {
  return `<table>
    <thead>
      <tr><th>Evidence</th><th>Title</th><th>Type/source</th><th>Confidence</th><th>Linked assets</th></tr>
    </thead>
    <tbody>
      ${evidence
        .map(
          (item) => `<tr>
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(`${item.type} · ${item.source}`)}</td>
        <td>${escapeHtml(item.confidence)}</td>
        <td>${escapeHtml(formatList(item.linkedAssets))}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderWaterSupplyTable(observations) {
  if (observations.length === 0) {
    return '<p class="muted">None</p>';
  }

  return `<table>
    <thead>
      <tr><th>Observation</th><th>Method</th><th>Quality</th><th>Location</th><th>Intent</th><th>Values</th><th>Limitations</th><th>Evidence</th><th>Confidence</th></tr>
    </thead>
    <tbody>
      ${observations
        .map(
          (observation) => `<tr>
        <td>${escapeHtml(observation.id)}</td>
        <td>${escapeHtml(observation.method)}</td>
        <td>${escapeHtml(observation.methodQuality)}</td>
        <td>${escapeHtml(observation.location)}</td>
        <td>${escapeHtml(observation.intent)}</td>
        <td>${escapeHtml(observation.values)}</td>
        <td>${escapeHtml(observation.limitations)}</td>
        <td>${escapeHtml(formatList(observation.evidenceIDs))}</td>
        <td>${escapeHtml(observation.confidence)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderServicePointTable(observations) {
  if (observations.length === 0) {
    return '<p class="muted">None</p>';
  }

  return `<table>
    <thead>
      <tr><th>Service point</th><th>Area</th><th>Supply type</th><th>Intended pressure</th><th>Observed issues</th><th>Linked water measurements</th><th>Evidence</th><th>Confidence</th></tr>
    </thead>
    <tbody>
      ${observations
        .map(
          (observation) => `<tr>
        <td>${escapeHtml(observation.servicePoint)}</td>
        <td>${escapeHtml(observation.area)}</td>
        <td>${escapeHtml(observation.supplyType)}</td>
        <td>${escapeHtml(observation.intendedPressureType)}</td>
        <td>${escapeHtml(formatList(observation.observedIssues))}</td>
        <td>${escapeHtml(formatList(observation.linkedWaterMeasurements))}</td>
        <td>${escapeHtml(formatList(observation.evidenceIDs))}</td>
        <td>${escapeHtml(observation.confidence)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderProvenanceTable(provenance) {
  return `<table>
    <thead>
      <tr><th>Source ref</th><th>Source type</th><th>Provenance</th><th>Evidence refs</th></tr>
    </thead>
    <tbody>
      ${provenance
        .map(
          (entry) => `<tr>
        <td>${escapeHtml(entry.sourceRef)}</td>
        <td>${escapeHtml(entry.sourceType)}</td>
        <td>${escapeHtml(entry.summary)}</td>
        <td>${escapeHtml(`${entry.evidenceCount} (${formatList(entry.evidenceRefs)})`)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderUncertaintyTables(uncertainty) {
  return `<div class="stack">
    <section>
      <h3>Unknown facts</h3>
      ${renderUncertaintyTable(uncertainty.unknown)}
    </section>
    <section>
      <h3>Approximate facts</h3>
      ${renderUncertaintyTable(uncertainty.approximate)}
    </section>
    <section>
      <h3>Unresolved facts</h3>
      ${renderUncertaintyTable(uncertainty.unresolved)}
    </section>
  </div>`;
}

function renderWaterSupplyUncertainty(waterSupplyUncertainty) {
  return `<section>
    <h3>Water supply uncertainty</h3>
    <table>
      <thead>
        <tr><th>Category</th><th>Observations</th></tr>
      </thead>
      <tbody>
        ${Object.entries(waterSupplyUncertainty)
          .map(
            ([category, values]) => `<tr>
        <td>${escapeHtml(category)}</td>
        <td>${escapeHtml(formatList(values))}</td>
      </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </section>`;
}

function renderUncertaintyTable(items) {
  if (items.length === 0) {
    return '<p class="muted">None</p>';
  }

  return `<table>
    <thead>
      <tr><th>Source</th><th>Path</th><th>State</th></tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item) => `<tr>
        <td>${escapeHtml(item.sourceRef)}</td>
        <td>${escapeHtml(item.path)}</td>
        <td>${escapeHtml(item.state)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function createConfidenceBySourceRef(confidenceStates) {
  const confidenceBySourceRef = new Map();
  for (const state of confidenceStates) {
    if (!confidenceBySourceRef.has(state.sourceRef)) {
      confidenceBySourceRef.set(state.sourceRef, []);
    }
    confidenceBySourceRef.get(state.sourceRef).push(state);
  }
  return confidenceBySourceRef;
}

function formatConfidence(confidence, confidenceStates) {
  if (confidence) {
    return JSON.stringify(confidence);
  }

  if (confidenceStates.length === 0) {
    return 'none';
  }

  const states = new Set(confidenceStates.map((state) => state.state));
  return Array.from(states).join(', ');
}

function formatUncertaintyStates(confidenceStates, targetState) {
  return confidenceStates
    .filter((state) => state.state === targetState)
    .map((state) => ({
      path: state.path || '(root)',
      sourceRef: state.sourceRef,
      state: state.state,
    }));
}

function formatWaterSupplyObservation(observation) {
  const values = Array.isArray(observation.values) ? observation.values : [];
  return {
    absenceReason: readStringField(observation, ['absenceReason', 'absence_reason']) ?? null,
    confidence: readStringField(observation, ['confidence']) ?? 'unknown',
    evidenceIDs: readStringArrayField(observation, ['evidenceIDs', 'evidence_ids']),
    id: readStringField(observation, ['id']) ?? 'unknown-water-supply-observation',
    intent: readStringField(observation, ['intent']) ?? 'unknown',
    limitations: formatList(Array.isArray(observation.suspectedLimitations) ? observation.suspectedLimitations : []),
    location: readStringField(observation, ['location']) ?? 'unknown',
    method: readStringField(observation, ['method']) ?? 'unknown',
    methodQuality: waterSupplyMethodQuality(readStringField(observation, ['method']) ?? 'unknown'),
    notes: readStringField(observation, ['notes']) ?? '',
    provenance: formatProvenance(observation.provenance),
    rawObservation: cloneValue(observation),
    valueNames: values.map((value) => readStringField(value, ['name'])).filter(Boolean),
    values: values.map(formatWaterValue).join('; ') || 'none',
  };
}

function formatServicePointObservation(observation, areas, waterSupply) {
  const id = readStringField(observation, ['id']) ?? 'unknown-service-point-observation';
  const areaID = readStringField(observation, ['areaID', 'area_id']) ?? 'unknown-area';
  const area = areas.find((entry) => entry.id === areaID);
  const servicePointType = readStringField(observation, ['servicePointType', 'service_point_type']) ?? 'unknown';
  return {
    area: area ? `${area.name} (${area.id})` : areaID,
    areaID,
    confidence: readStringField(observation, ['confidence']) ?? 'unknown',
    evidenceIDs: readStringArrayField(observation, ['evidenceIDs', 'evidence_ids']),
    id,
    intendedPressureType: readStringField(observation, ['intendedPressureType', 'intended_pressure_type']) ?? 'unknown',
    linkedWaterMeasurements: linkedWaterMeasurementsForServicePoint(servicePointType, waterSupply),
    notes: readStringField(observation, ['notes']) ?? '',
    observedIssues: readStringArrayField(observation, ['observedIssues', 'observed_issues']),
    provenance: formatProvenance(observation.provenance),
    rawObservation: cloneValue(observation),
    servedByAssetIDs: readStringArrayField(observation, ['servedByAssetIDs', 'served_by_asset_ids']),
    servicePoint: `${servicePointType} (${id})`,
    servicePointType,
    supplyType: readStringField(observation, ['supplyType', 'supply_type']) ?? 'unknown',
  };
}

function linkedWaterMeasurementsForServicePoint(servicePointType, waterSupply) {
  const matchingLocations = {
    bathTap: new Set(['bathTap']),
    basinTap: new Set(['bathroomBasinTap']),
    cylinderInlet: new Set(['cylinderColdInlet', 'cylinderCupboard']),
    kitchenTap: new Set(['kitchenColdTap']),
    outsideTap: new Set(['outsideTap']),
    showerMixer: new Set(['showerOutlet']),
    electricShower: new Set(['showerOutlet']),
    washingMachineValve: new Set(['washingMachineValve']),
  }[servicePointType] ?? new Set();

  return waterSupply
    .filter((observation) => matchingLocations.has(observation.location))
    .map((observation) => `${observation.id}: ${observation.values}`);
}

function formatWaterValue(value) {
  const name = readStringField(value, ['name']) ?? 'value';
  const rawValue = Object.prototype.hasOwnProperty.call(value, 'value') ? value.value : 'unknown';
  const unit = readStringField(value, ['unit']);
  const condition = readStringField(value, ['condition']);
  const confidence = readStringField(value, ['confidence']);
  return `${name}: ${rawValue}${unit ? ` ${unit}` : ''}${condition ? ` @ ${condition}` : ''}${confidence ? ` (${confidence})` : ''}`;
}

function buildWaterSupplyUncertainty(observations) {
  const grouped = {
    'measured pressure+flow': [],
    'flow-only': [],
    'pressure-only': [],
    'customer-reported': [],
    'not tested': [],
    'conflicting/multiple observations': [],
  };

  for (const observation of observations) {
    const valueNames = new Set(observation.valueNames);
    const hasPressure = ['staticPressure', 'dynamicPressure', 'residualPressure', 'flowAtPressure'].some((name) =>
      valueNames.has(name),
    );
    const hasFlow = ['flowRate', 'flowAtPressure'].some((name) => valueNames.has(name));

    if (observation.method === 'customerReported') {
      grouped['customer-reported'].push(observation.id);
    } else if (observation.method === 'notTested') {
      grouped['not tested'].push(`${observation.id}${observation.absenceReason ? ` (${observation.absenceReason})` : ''}`);
    } else if (hasPressure && hasFlow) {
      grouped['measured pressure+flow'].push(observation.id);
    } else if (hasFlow) {
      grouped['flow-only'].push(observation.id);
    } else if (hasPressure) {
      grouped['pressure-only'].push(observation.id);
    }
  }

  if (observations.length > 1) {
    grouped['conflicting/multiple observations'].push(...observations.map((observation) => observation.id));
  }

  return grouped;
}

function waterSupplyMethodQuality(method) {
  switch (method) {
    case 'digitalPressureFlowLogger':
      return 'best evidence';
    case 'pressureFlowTestKit':
      return 'good evidence';
    case 'flowCup':
      return 'useful but local only';
    case 'pressureGauge':
      return 'pressure-only evidence';
    case 'customerReported':
      return 'context only';
    case 'notTested':
      return 'valid absence';
    default:
      return 'recorded observation';
  }
}

function inferAssetSubtype(asset) {
  const type = readStringField(asset.rawObservation, ['type']);
  return type ? `${asset.tag}:${type}` : asset.tag;
}

function inferAssetPlacementState(assetId, outByObservationId) {
  const outgoing = outByObservationId.get(assetId) ?? [];
  return outgoing.some((relationship) => relationship.type === 'containedIn') ? 'placed' : 'unplaced';
}

function inferAreaPlacementState(areaId, inByObservationId, outByObservationId) {
  const inCount = (inByObservationId.get(areaId) ?? []).length;
  const outCount = (outByObservationId.get(areaId) ?? []).length;
  if (inCount === 0 && outCount === 0) {
    return 'unreferenced';
  }
  if (inCount === 0) {
    return 'declared';
  }
  return 'referenced';
}

function formatProvenance(provenance) {
  if (!provenance) {
    return 'none';
  }

  const method = readStringField(provenance, ['method']) ?? 'unknown-method';
  const capturedBy = readStringField(provenance, ['capturedBy', 'captured_by']) ?? 'unknown-captured-by';
  const capturedAt = readStringField(provenance, ['capturedAt', 'captured_at']) ?? 'unknown-captured-at';
  return `${method} | ${capturedBy} | ${capturedAt}`;
}

function formatList(values) {
  return values.length === 0 ? 'none' : values.join(', ');
}

function readStringField(value, keys) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (typeof value[key] === 'string' && value[key].trim() !== '') {
      return value[key];
    }
  }

  return null;
}

function readStringArrayField(value, keys) {
  if (!value || typeof value !== 'object') {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(value[key])) {
      return value[key].filter((entry) => typeof entry === 'string');
    }
  }

  return [];
}

function cloneValue(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createHtmlResponse(html, status, omitBody = false) {
  return new Response(omitBody ? null : html, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf-8',
    },
    status,
  });
}

module.exports = {
  buildInspectionData,
  NO_PERSISTENCE_WARNING,
  handleImportShellRequest,
  renderImportShellPage,
  renderTwinMapViews,
  summarizeCompiledTwin,
};

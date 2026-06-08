'use strict';

const SUPPORTED_PACKAGE_VERSION = 3;
const RELATIONSHIP_TYPES = new Set([
  'containedIn',
  'connectedTo',
  'controls',
  'supplies',
  'serves',
]);
const CONFIDENCE_STATES = new Set(['approximate', 'observed', 'unknown', 'unresolved']);
const WATER_SUPPLY_METHODS = new Set([
  'digitalPressureFlowLogger',
  'pressureFlowTestKit',
  'flowCup',
  'pressureGauge',
  'customerReported',
  'notTested',
  'other',
  'unknown',
]);
const WATER_SUPPLY_LOCATIONS = new Set([
  'outsideTap',
  'kitchenColdTap',
  'internalStopTap',
  'washingMachineValve',
  'bathroomBasinTap',
  'bathTap',
  'showerOutlet',
  'cylinderCupboard',
  'cylinderColdInlet',
  'loftTankFeed',
  'waterMain',
  'other',
  'unknown',
]);
const WATER_SUPPLY_INTENTS = new Set([
  'incomingMainCapacity',
  'usableHouseholdCapacity',
  'hotWaterPlantFeed',
  'servicePointExperience',
  'customerComplaintContext',
  'notTested',
  'unknown',
]);
const WATER_VALUE_NAMES = new Set([
  'staticPressure',
  'dynamicPressure',
  'residualPressure',
  'flowRate',
  'flowAtPressure',
  'waterTemperature',
  'tds',
  'qualitativeObservation',
]);
const SERVICE_POINT_TYPES = new Set([
  'kitchenTap',
  'bathTap',
  'basinTap',
  'showerMixer',
  'electricShower',
  'outsideTap',
  'washingMachineValve',
  'cylinderInlet',
  'other',
  'unknown',
]);
const SUPPLY_TYPES = new Set([
  'mainsCold',
  'storedCold',
  'gravityHot',
  'mainsHot',
  'pumpedHot',
  'mixed',
  'unknown',
]);
const INTENDED_PRESSURE_TYPES = new Set([
  'mainsPressure',
  'gravityLowPressure',
  'pumped',
  'universal',
  'unknown',
]);
const OBSERVED_ISSUES = new Set([
  'poorFlow',
  'temperatureFluctuation',
  'slowBathFill',
  'noisyOperation',
  'outletRestrictionSuspected',
  'mismatchSuspected',
  'scaledOrRestricted',
  'noIssueObserved',
  'unknown',
]);
const FORBIDDEN_OUTPUT_FIELDS = new Set([
  'recommendedOption',
  'bestOption',
  'suitabilityScore',
  'rank',
  'winner',
  'shouldChoose',
  'preferredSystem',
  'recommendations',
  'ranking',
  'scoring',
  'suitability',
  'pricing',
  'simulation',
  'portal',
  'pdf',
  'customerAdvice',
]);
const SYSTEM_TAGS = new Set([
  'boiler',
  'cylinder',
  'radiator',
  'radiators',
  'emitter',
  'emitters',
  'controls',
  'thermostat',
  'controller',
  'heat pump',
  'heat source',
  'flue',
  'gas meter',
  'feed and expansion',
  'meter',
  'pipework',
  'pump',
  'thermal store',
  'valve',
]);
const HOUSE_TAGS = new Set([
  'area',
  'room',
  'space',
  'zone',
  'wall',
  'roof',
  'floor',
  'window',
  'door',
]);
const HOME_TAGS = new Set([
  'risk',
  'customer goal',
  'surveyor note',
]);

class DaedalusPackageValidationError extends Error {
  constructor(issues) {
    super(`DaedalusPackage validation failed with ${issues.length} issue(s).`);
    this.name = 'DaedalusPackageValidationError';
    this.code = 'DAEDALUS_PACKAGE_VALIDATION_FAILED';
    this.issues = issues;
  }
}

function importDaedalusPackage(input) {
  return compileUnifiedPropertyTwin(parseDaedalusPackage(input));
}

function parseDaedalusPackage(input) {
  const issues = [];

  if (!isPlainObject(input)) {
    throw new DaedalusPackageValidationError([
      createIssue([], 'invalid_type', 'DaedalusPackage must be a JSON object.'),
    ]);
  }

  const normalizedPackage = structuredClone(input);
  const packageVersion = readPackageVersion(normalizedPackage);

  if (packageVersion !== SUPPORTED_PACKAGE_VERSION) {
    issues.push(
      createIssue(
        ['packageVersion'],
        'unsupported_version',
        `DaedalusPackage version must be ${SUPPORTED_PACKAGE_VERSION}.`,
        packageVersion ?? null,
      ),
    );
  }

  const visitId = readStringAlias(normalizedPackage, ['visitId', 'visit_id']);
  const propertyRef = readStringAlias(normalizedPackage, ['propertyRef', 'property_ref']);
  const observations = normalizedPackage.observations;

  if (!visitId) {
    issues.push(createIssue(['visitId'], 'missing_field', 'visitId is required.'));
  }

  if (!propertyRef) {
    issues.push(createIssue(['propertyRef'], 'missing_field', 'propertyRef is required.'));
  }

  if (!Array.isArray(observations) || observations.length === 0) {
    issues.push(
      createIssue(['observations'], 'invalid_observations', 'observations must be a non-empty array.'),
    );
  }

  const observationIds = new Set();
  if (Array.isArray(observations)) {
    for (const [index, observation] of observations.entries()) {
      validateObservation(observation, index, issues, observationIds);
    }

    for (const [index, observation] of observations.entries()) {
      validateEvidenceReferences(observation, index, observationIds, issues);
    }
  }

  const waterSupplyObservations = normalizeWaterSupplyObservations(normalizedPackage, issues, observationIds);
  const servicePointObservations = normalizeServicePointObservations(normalizedPackage, issues, observationIds);
  const relationships = collectRelationships(normalizedPackage, issues, observationIds);

  if (issues.length > 0) {
    throw new DaedalusPackageValidationError(issues);
  }

  return {
    packageId: readStringAlias(normalizedPackage, ['packageId', 'package_id']) ?? null,
    packageVersion,
    propertyRef,
    rawPackage: normalizedPackage,
    relationships,
    servicePointObservations,
    waterSupplyObservations,
    visitId,
  };
}

function compileUnifiedPropertyTwin(parsedPackage) {
  const observations = parsedPackage.rawPackage.observations.map((observation) =>
    createTwinObservation(observation),
  );
  const evidence = observations
    .filter((observation) => isEvidenceTag(observation.tag))
    .map((observation) => observation.rawObservation);
  const relationships = parsedPackage.relationships.map((relationship) => ({
    confidence: extractConfidencePayload(relationship.rawRelationship),
    evidenceRefs: cloneArray(readStringArrayAlias(relationship.rawRelationship, ['evidenceRefs', 'evidence_refs'])),
    from: relationship.from,
    provenance: cloneValue(readProvenance(relationship.rawRelationship)),
    rawRelationship: cloneValue(relationship.rawRelationship),
    relationshipId: relationship.relationshipId,
    to: relationship.to,
    type: relationship.type,
  }));

  const houseObservations = observations.filter((observation) => observation.classification === 'house');
  const systemObservations = observations.filter((observation) => observation.classification === 'system');
  const homeObservations = observations.filter((observation) => observation.classification !== 'evidence');
  const compiledModel = {
    evidence,
    confidenceStates: collectConfidenceStates(parsedPackage.rawPackage, relationships),
    homeTwin: {
      homeId: `home:${parsedPackage.propertyRef}`,
      observationIds: homeObservations.map((observation) => observation.observationId),
      observations: homeObservations.map(toTwinRecord),
      propertyRef: parsedPackage.propertyRef,
      systemObservationIds: systemObservations.map((observation) => observation.observationId),
      visitId: parsedPackage.visitId,
    },
    houseTwin: {
      areas: houseObservations.filter((observation) => observation.tag === 'area').map(toTwinRecord),
      observationIds: houseObservations.map((observation) => observation.observationId),
      observations: houseObservations.map(toTwinRecord),
      propertyRef: parsedPackage.propertyRef,
      visitId: parsedPackage.visitId,
    },
    kind: 'UnifiedPropertyTwinViewModel',
    packageBoundary: 'DaedalusPackage',
    packageId: parsedPackage.packageId,
    packageVersion: parsedPackage.packageVersion,
    propertyRef: parsedPackage.propertyRef,
    provenanceLinks: buildProvenanceLinks(
      observations,
      relationships,
      parsedPackage.waterSupplyObservations,
      parsedPackage.servicePointObservations,
    ),
    relationships,
    servicePointObservations: cloneValue(parsedPackage.servicePointObservations),
    sourcePackage: cloneValue(parsedPackage.rawPackage),
    systemTwin: {
      boilers: systemObservations.filter((observation) => observation.tag === 'boiler').map(toTwinRecord),
      controls: systemObservations.filter((observation) => observation.tag === 'controls').map(toTwinRecord),
      cylinders: systemObservations.filter((observation) => observation.tag === 'cylinder').map(toTwinRecord),
      emitters: systemObservations
        .filter((observation) => observation.tag === 'radiator' || observation.tag === 'emitters')
        .map(toTwinRecord),
      observationIds: systemObservations.map((observation) => observation.observationId),
      observations: systemObservations.map(toTwinRecord),
      propertyRef: parsedPackage.propertyRef,
      visitId: parsedPackage.visitId,
    },
    waterSupplyObservations: cloneValue(parsedPackage.waterSupplyObservations),
    visitId: parsedPackage.visitId,
  };

  assertNoForbiddenFields(compiledModel);

  return compiledModel;
}

function normalizeWaterSupplyObservations(rawPackage, issues, observationIds) {
  const waterSupplyObservations = rawPackage.waterSupplyObservations ?? [];
  const evidenceObservationIds = new Set(
    (Array.isArray(rawPackage.observations) ? rawPackage.observations : [])
      .filter((observation) => isEvidenceTag(normalizeTag(readStringAlias(observation, ['tag']))))
      .map((observation) => readStringAlias(observation, ['observationId', 'observation_id']))
      .filter(Boolean),
  );

  if (!Array.isArray(waterSupplyObservations)) {
    issues.push(
      createIssue(
        ['waterSupplyObservations'],
        'invalid_type',
        'waterSupplyObservations must be an array when provided.',
        waterSupplyObservations,
      ),
    );
    return [];
  }

  const ids = new Set();
  for (const [index, observation] of waterSupplyObservations.entries()) {
    validateWaterSupplyObservation(observation, index, issues, ids, evidenceObservationIds, observationIds);
  }

  return cloneValue(waterSupplyObservations);
}

function normalizeServicePointObservations(rawPackage, issues, observationIds) {
  const servicePointObservations = rawPackage.servicePointObservations ?? [];
  const observations = Array.isArray(rawPackage.observations) ? rawPackage.observations : [];
  const evidenceObservationIds = new Set(
    observations
      .filter((observation) => isEvidenceTag(normalizeTag(readStringAlias(observation, ['tag']))))
      .map((observation) => readStringAlias(observation, ['observationId', 'observation_id']))
      .filter(Boolean),
  );
  const areaObservationIds = new Set(
    observations
      .filter((observation) => normalizeTag(readStringAlias(observation, ['tag'])) === 'area')
      .map((observation) => readStringAlias(observation, ['observationId', 'observation_id']))
      .filter(Boolean),
  );

  if (!Array.isArray(servicePointObservations)) {
    issues.push(
      createIssue(
        ['servicePointObservations'],
        'invalid_type',
        'servicePointObservations must be an array when provided.',
        servicePointObservations,
      ),
    );
    return [];
  }

  const ids = new Set();
  for (const [index, observation] of servicePointObservations.entries()) {
    validateServicePointObservation(observation, index, issues, ids, observationIds, areaObservationIds, evidenceObservationIds);
  }

  return cloneValue(servicePointObservations);
}

function validateServicePointObservation(
  observation,
  index,
  issues,
  servicePointIds,
  observationIds,
  areaObservationIds,
  evidenceObservationIds,
) {
  const path = ['servicePointObservations', index];

  if (!isPlainObject(observation)) {
    issues.push(createIssue(path, 'invalid_type', 'Service point observation must be an object.'));
    return;
  }

  const id = readStringAlias(observation, ['id']);
  const areaID = readStringAlias(observation, ['areaID', 'area_id']);
  const servicePointType = readStringAlias(observation, ['servicePointType', 'service_point_type']);
  const supplyType = readStringAlias(observation, ['supplyType', 'supply_type']);
  const intendedPressureType = readStringAlias(observation, ['intendedPressureType', 'intended_pressure_type']);
  const confidence = readStringAlias(observation, ['confidence']);

  if (!id) {
    issues.push(createIssue(path.concat('id'), 'missing_field', 'Service point observation id is required.'));
  } else if (servicePointIds.has(id)) {
    issues.push(createIssue(path.concat('id'), 'duplicate_service_point_observation_id', 'Service point observation id must be unique.', id));
  } else {
    servicePointIds.add(id);
  }

  if (!areaID) {
    issues.push(createIssue(path.concat('areaID'), 'missing_field', 'Service point areaID is required.'));
  } else if (!areaObservationIds.has(areaID)) {
    issues.push(createIssue(path.concat('areaID'), 'missing_service_point_area_ref', `Service point areaID "${areaID}" does not match an area observation.`, areaID));
  }

  if (!SERVICE_POINT_TYPES.has(servicePointType)) {
    issues.push(createIssue(path.concat('servicePointType'), 'unsupported_service_point_type', 'Unsupported service point type.', servicePointType ?? null));
  }

  if (!SUPPLY_TYPES.has(supplyType)) {
    issues.push(createIssue(path.concat('supplyType'), 'unsupported_supply_type', 'Unsupported supply type.', supplyType ?? null));
  }

  if (!INTENDED_PRESSURE_TYPES.has(intendedPressureType)) {
    issues.push(createIssue(path.concat('intendedPressureType'), 'unsupported_intended_pressure_type', 'Unsupported intended pressure type.', intendedPressureType ?? null));
  }

  if (!CONFIDENCE_STATES.has(confidence)) {
    issues.push(createIssue(path.concat('confidence'), 'unsupported_confidence_state', 'Unsupported confidence state.', confidence ?? null));
  }

  validateProvenance(observation, path, issues);

  const observedIssues = readStringArrayAlias(observation, ['observedIssues', 'observed_issues']);
  observedIssues.forEach((issue, issueIndex) => {
    if (!OBSERVED_ISSUES.has(issue)) {
      issues.push(createIssue(path.concat('observedIssues', issueIndex), 'unsupported_observed_issue', 'Unsupported observed issue.', issue));
    }
  });

  const servedByAssetIDs = readStringArrayAlias(observation, ['servedByAssetIDs', 'served_by_asset_ids']);
  servedByAssetIDs.forEach((assetID, assetIndex) => {
    if (!observationIds.has(assetID)) {
      issues.push(
        createIssue(
          path.concat('servedByAssetIDs', assetIndex),
          'missing_service_point_served_asset_ref',
          `Service point servedByAssetID "${assetID}" does not match any observation.`,
          assetID,
        ),
      );
    }
  });

  const evidenceIDs = readStringArrayAlias(observation, ['evidenceIDs', 'evidence_ids']);
  evidenceIDs.forEach((evidenceID, evidenceIndex) => {
    if (!evidenceObservationIds.has(evidenceID)) {
      issues.push(
        createIssue(
          path.concat('evidenceIDs', evidenceIndex),
          'missing_service_point_evidence_ref',
          `Service point evidenceID "${evidenceID}" does not match an evidence observation.`,
          evidenceID,
        ),
      );
    }
  });
}

function validateWaterSupplyObservation(observation, index, issues, waterObservationIds, evidenceObservationIds) {
  const path = ['waterSupplyObservations', index];

  if (!isPlainObject(observation)) {
    issues.push(createIssue(path, 'invalid_type', 'Water supply observation must be an object.'));
    return;
  }

  const id = readStringAlias(observation, ['id']);
  const method = readStringAlias(observation, ['method']);
  const location = readStringAlias(observation, ['location']);
  const intent = readStringAlias(observation, ['intent']);
  const confidence = readStringAlias(observation, ['confidence']);

  if (!id) {
    issues.push(createIssue(path.concat('id'), 'missing_field', 'Water supply observation id is required.'));
  } else if (waterObservationIds.has(id)) {
    issues.push(createIssue(path.concat('id'), 'duplicate_water_supply_observation_id', 'Water supply observation id must be unique.', id));
  } else {
    waterObservationIds.add(id);
  }

  if (!WATER_SUPPLY_METHODS.has(method)) {
    issues.push(createIssue(path.concat('method'), 'unsupported_water_supply_method', 'Unsupported water supply method.', method ?? null));
  }

  if (!WATER_SUPPLY_LOCATIONS.has(location)) {
    issues.push(createIssue(path.concat('location'), 'unsupported_water_supply_location', 'Unsupported water supply location.', location ?? null));
  }

  if (!WATER_SUPPLY_INTENTS.has(intent)) {
    issues.push(createIssue(path.concat('intent'), 'unsupported_water_supply_intent', 'Unsupported water supply intent.', intent ?? null));
  }

  if (!CONFIDENCE_STATES.has(confidence)) {
    issues.push(createIssue(path.concat('confidence'), 'unsupported_confidence_state', 'Unsupported confidence state.', confidence ?? null));
  }

  validateProvenance(observation, path, issues);

  if (method === 'notTested' && !readStringAlias(observation, ['absenceReason']) && !readStringAlias(observation, ['notes'])) {
    issues.push(createIssue(path.concat('absenceReason'), 'water_supply_absence_reason_missing', 'notTested water observations require absenceReason or notes.'));
  }

  const values = Array.isArray(observation.values) ? observation.values : [];
  if (!Array.isArray(observation.values)) {
    issues.push(createIssue(path.concat('values'), 'invalid_type', 'Water supply values must be an array.'));
  }

  const hasQualitativeObservation = values.some((value) => readStringAlias(value, ['name']) === 'qualitativeObservation');
  if (method === 'customerReported' && !hasQualitativeObservation && !readStringAlias(observation, ['notes'])) {
    issues.push(createIssue(path.concat('values'), 'water_supply_customer_report_missing', 'customerReported water observations require qualitativeObservation or notes.'));
  }

  values.forEach((value, valueIndex) => {
    validateWaterSupplyValue(value, path.concat('values', valueIndex), issues);
  });

  const evidenceIDs = readStringArrayAlias(observation, ['evidenceIDs', 'evidence_ids']);
  for (const [evidenceIndex, evidenceID] of evidenceIDs.entries()) {
    if (!evidenceObservationIds.has(evidenceID)) {
      issues.push(
        createIssue(
          path.concat('evidenceIDs', evidenceIndex),
          'missing_water_supply_evidence_ref',
          `Water supply evidenceID "${evidenceID}" does not match an evidence observation.`,
          evidenceID,
        ),
      );
    }
  }
}

function validateWaterSupplyValue(value, path, issues) {
  if (!isPlainObject(value)) {
    issues.push(createIssue(path, 'invalid_type', 'Water supply value must be an object.'));
    return;
  }

  const name = readStringAlias(value, ['name']);
  if (!WATER_VALUE_NAMES.has(name)) {
    issues.push(createIssue(path.concat('name'), 'unsupported_water_supply_value_name', 'Unsupported water supply value name.', name ?? null));
  }

  if (!Object.prototype.hasOwnProperty.call(value, 'value')) {
    issues.push(createIssue(path.concat('value'), 'missing_field', 'Water supply value is required.'));
  }

  if (typeof value.value === 'number' && !readStringAlias(value, ['unit'])) {
    issues.push(createIssue(path.concat('unit'), 'water_supply_value_unit_missing', 'Numeric water supply values require unit.'));
  }

  const confidence = readStringAlias(value, ['confidence']);
  if (confidence && !CONFIDENCE_STATES.has(confidence)) {
    issues.push(createIssue(path.concat('confidence'), 'unsupported_confidence_state', 'Unsupported value confidence state.', confidence));
  }
}

function validateObservation(observation, index, issues, observationIds) {
  const path = ['observations', index];

  if (!isPlainObject(observation)) {
    issues.push(createIssue(path, 'invalid_type', 'Observation must be an object.'));
    return;
  }

  const observationId = readStringAlias(observation, ['observationId', 'observation_id']);
  const tag = normalizeTag(readStringAlias(observation, ['tag']));

  if (!observationId) {
    issues.push(createIssue(path.concat('observationId'), 'missing_field', 'observationId is required.'));
  } else if (observationIds.has(observationId)) {
    issues.push(
      createIssue(path.concat('observationId'), 'duplicate_observation_id', 'observationId must be unique.', observationId),
    );
  } else {
    observationIds.add(observationId);
  }

  if (!tag) {
    issues.push(createIssue(path.concat('tag'), 'missing_field', 'tag is required.'));
  }

  validateProvenance(observation, path, issues);
}

function validateEvidenceReferences(observation, index, observationIds, issues) {
  const evidenceRefs = readStringArrayAlias(observation, ['evidenceRefs', 'evidence_refs']);
  for (const evidenceRef of evidenceRefs) {
    if (!observationIds.has(evidenceRef)) {
      issues.push(
        createIssue(
          ['observations', index, 'evidenceRefs'],
          'missing_evidence_ref',
          `evidenceRef "${evidenceRef}" does not match any observation.`,
          evidenceRef,
        ),
      );
    }
  }
}

function collectRelationships(rawPackage, issues, observationIds) {
  const relationships = [];
  const rootRelationships = Array.isArray(rawPackage.relationships) ? rawPackage.relationships : [];
  const observations = Array.isArray(rawPackage.observations) ? rawPackage.observations : [];

  for (const [index, relationship] of rootRelationships.entries()) {
    const normalized = normalizeRelationship(relationship, ['relationships', index], issues);
    if (!normalized) {
      continue;
    }
    validateRelationshipEndpoints(normalized, observationIds, ['relationships', index], issues);
    relationships.push(normalized);
  }

  for (const [observationIndex, observation] of observations.entries()) {
    if (!Array.isArray(observation.relationships)) {
      continue;
    }

    for (const [relationshipIndex, relationship] of observation.relationships.entries()) {
      const normalized = normalizeRelationship(
        relationship,
        ['observations', observationIndex, 'relationships', relationshipIndex],
        issues,
        readStringAlias(observation, ['observationId', 'observation_id']) ?? null,
      );
      if (!normalized) {
        continue;
      }
      validateRelationshipEndpoints(
        normalized,
        observationIds,
        ['observations', observationIndex, 'relationships', relationshipIndex],
        issues,
      );
      relationships.push(normalized);
    }
  }

  return dedupeRelationships(relationships);
}

function normalizeRelationship(relationship, path, issues, defaultFrom = null) {
  if (!isPlainObject(relationship)) {
    issues.push(createIssue(path, 'invalid_type', 'Relationship must be an object.'));
    return null;
  }

  const type = relationship.type;
  const from = readStringAlias(relationship, ['from', 'source', 'source_ref']) ?? defaultFrom;
  const to = readStringAlias(relationship, ['to', 'target', 'target_ref', 'asset_ref']);
  const relationshipId =
    readStringAlias(relationship, ['relationshipId', 'relationship_id']) ?? `${from ?? 'unknown'}:${type ?? 'unknown'}:${to ?? 'unknown'}`;

  if (!RELATIONSHIP_TYPES.has(type)) {
    issues.push(
      createIssue(
        path.concat('type'),
        'unsupported_relationship_type',
        `Relationship type must be one of: ${Array.from(RELATIONSHIP_TYPES).join(', ')}.`,
        type ?? null,
      ),
    );
  }

  if (!from) {
    issues.push(createIssue(path.concat('from'), 'missing_field', 'Relationship from is required.'));
  }

  if (!to) {
    issues.push(createIssue(path.concat('to'), 'missing_field', 'Relationship to is required.'));
  }

  validateProvenance(relationship, path, issues);

  return {
    from,
    rawRelationship: cloneValue(relationship),
    relationshipId,
    to,
    type,
  };
}

function validateRelationshipEndpoints(relationship, observationIds, path, issues) {
  if (relationship.from && !observationIds.has(relationship.from)) {
    issues.push(
      createIssue(
        path.concat('from'),
        'missing_relationship_endpoint',
        `Relationship from "${relationship.from}" does not match any observation.`,
        relationship.from,
      ),
    );
  }

  if (relationship.to && !observationIds.has(relationship.to)) {
    issues.push(
      createIssue(
        path.concat('to'),
        'missing_relationship_endpoint',
        `Relationship to "${relationship.to}" does not match any observation.`,
        relationship.to,
      ),
    );
  }
}

function validateProvenance(value, path, issues) {
  const provenance = readProvenance(value);

  if (!isPlainObject(provenance)) {
    issues.push(createIssue(path.concat('provenance'), 'missing_provenance', 'provenance is required.'));
    return;
  }

  const method = readStringAlias(provenance, ['method']);
  const capturedBy = readStringAlias(provenance, ['capturedBy', 'captured_by']);
  const capturedAt = readStringAlias(provenance, ['capturedAt', 'captured_at']);

  if (!method) {
    issues.push(createIssue(path.concat('provenance', 'method'), 'missing_field', 'provenance.method is required.'));
  }

  if (!capturedBy) {
    issues.push(
      createIssue(path.concat('provenance', 'capturedBy'), 'missing_field', 'provenance.capturedBy is required.'),
    );
  }

  if (!capturedAt) {
    issues.push(
      createIssue(path.concat('provenance', 'capturedAt'), 'missing_field', 'provenance.capturedAt is required.'),
    );
  }
}

function createTwinObservation(observation) {
  const tag = normalizeTag(readStringAlias(observation, ['tag']));
  return {
    classification: classifyObservation(tag, observation),
    confidence: extractConfidencePayload(observation),
    evidenceRefs: cloneArray(readStringArrayAlias(observation, ['evidenceRefs', 'evidence_refs'])),
    observationId: readStringAlias(observation, ['observationId', 'observation_id']),
    provenance: cloneValue(readProvenance(observation)),
    rawObservation: cloneValue(observation),
    tag,
  };
}

function classifyObservation(tag, observation) {
  if (isEvidenceTag(tag)) {
    return 'evidence';
  }

  if (SYSTEM_TAGS.has(tag)) {
    return 'system';
  }

  if (HOUSE_TAGS.has(tag)) {
    return 'house';
  }

  const subject = normalizeTag(readStringAlias(observation, ['subject']) ?? '');
  if (subject.includes('room') || subject.includes('area') || subject.includes('wall')) {
    return 'house';
  }

  if (HOME_TAGS.has(tag)) {
    return 'home';
  }

  return 'home';
}

function collectConfidenceStates(rawPackage, relationships) {
  const states = [];
  const observations = Array.isArray(rawPackage.observations) ? rawPackage.observations : [];
  const waterSupplyObservations = Array.isArray(rawPackage.waterSupplyObservations) ? rawPackage.waterSupplyObservations : [];
  const servicePointObservations = Array.isArray(rawPackage.servicePointObservations) ? rawPackage.servicePointObservations : [];

  for (const observation of observations) {
    const observationId = readStringAlias(observation, ['observationId', 'observation_id']) ?? 'unknown-observation';
    walkConfidence(observation, [], `observation:${observationId}`, states);
  }

  for (const observation of waterSupplyObservations) {
    const observationId = readStringAlias(observation, ['id']) ?? 'unknown-water-supply-observation';
    walkConfidence(observation, [], `waterSupplyObservation:${observationId}`, states);
  }

  for (const observation of servicePointObservations) {
    const observationId = readStringAlias(observation, ['id']) ?? 'unknown-service-point-observation';
    walkConfidence(observation, [], `servicePointObservation:${observationId}`, states);
  }

  for (const relationship of relationships) {
    walkConfidence(
      relationship.rawRelationship,
      [],
      `relationship:${relationship.relationshipId}`,
      states,
    );
  }

  return dedupeConfidenceStates(states);
}

function walkConfidence(value, path, sourceRef, states) {
  const lastSegment = path[path.length - 1];

  if (value === null) {
    states.push({
      path: path.join('.'),
      sourceRef,
      state: 'unknown',
      value: null,
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => walkConfidence(item, path.concat(index), sourceRef, states));
    return;
  }

  if (!isPlainObject(value)) {
    if (lastSegment === 'identity_resolved' && value === false) {
      states.push({
        path: path.join('.'),
        sourceRef,
        state: 'unresolved',
        value,
      });
    }

    if (lastSegment === 'approximate' && value === true) {
      states.push({
        path: path.slice(0, -1).join('.'),
        sourceRef,
        state: 'approximate',
        value,
      });
    }

    return;
  }

  const explicitState = deriveExplicitState(value);
  if (explicitState) {
    states.push({
      details: cloneValue(value),
      path: path.join('.'),
      sourceRef,
      state: explicitState,
    });
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    walkConfidence(nestedValue, path.concat(key), sourceRef, states);
  }
}

function deriveExplicitState(value) {
  const state = normalizeTag(readStringAlias(value, ['state', 'confidenceState', 'confidence_state']));
  if (state) {
    return state;
  }

  const status = normalizeTag(readStringAlias(value, ['status', 'resolutionStatus', 'resolution_status']));
  if (status === 'unresolved' || status === 'unknown' || status === 'approximate') {
    return status;
  }

  if (value.approximate === true) {
    return 'approximate';
  }

  return null;
}

function extractConfidencePayload(value) {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(value, 'confidence')) {
    payload.confidence = cloneValue(value.confidence);
  }

  if (Object.prototype.hasOwnProperty.call(value, 'confidence_state')) {
    payload.confidenceState = cloneValue(value.confidence_state);
  }

  if (Object.prototype.hasOwnProperty.call(value, 'resolution_status')) {
    payload.resolutionStatus = cloneValue(value.resolution_status);
  }

  if (Object.prototype.hasOwnProperty.call(value, 'identity_resolved')) {
    payload.identityResolved = cloneValue(value.identity_resolved);
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

function buildProvenanceLinks(observations, relationships, waterSupplyObservations = [], servicePointObservations = []) {
  const observationLinks = observations.map((observation) => ({
    evidenceRefs: cloneArray(observation.evidenceRefs),
    provenance: cloneValue(observation.provenance),
    sourceRef: observation.observationId,
    sourceType: 'observation',
  }));
  const relationshipLinks = relationships.map((relationship) => ({
    evidenceRefs: cloneArray(relationship.evidenceRefs),
    provenance: cloneValue(relationship.provenance),
    sourceRef: relationship.relationshipId,
    sourceType: 'relationship',
  }));
  const waterSupplyLinks = waterSupplyObservations.map((observation) => ({
    evidenceRefs: cloneArray(readStringArrayAlias(observation, ['evidenceIDs', 'evidence_ids'])),
    provenance: cloneValue(readProvenance(observation)),
    sourceRef: readStringAlias(observation, ['id']) ?? 'unknown-water-supply-observation',
    sourceType: 'waterSupplyObservation',
  }));
  const servicePointLinks = servicePointObservations.map((observation) => ({
    evidenceRefs: cloneArray(readStringArrayAlias(observation, ['evidenceIDs', 'evidence_ids'])),
    provenance: cloneValue(readProvenance(observation)),
    sourceRef: readStringAlias(observation, ['id']) ?? 'unknown-service-point-observation',
    sourceType: 'servicePointObservation',
  }));

  return observationLinks.concat(relationshipLinks, waterSupplyLinks, servicePointLinks);
}

function assertNoForbiddenFields(value, path = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, path.concat(index)));
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_OUTPUT_FIELDS.has(key)) {
      throw new Error(`Compiled output contains forbidden field "${path.concat(key).join('.')}".`);
    }
    assertNoForbiddenFields(nestedValue, path.concat(key));
  }
}

function dedupeRelationships(relationships) {
  const seen = new Set();
  return relationships.filter((relationship) => {
    const key = `${relationship.relationshipId}:${relationship.from}:${relationship.type}:${relationship.to}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeConfidenceStates(states) {
  const seen = new Set();
  return states.filter((state) => {
    const key = `${state.sourceRef}:${state.path}:${state.state}:${JSON.stringify(state.value ?? state.details ?? null)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function readPackageVersion(value) {
  const rawVersion =
    value.packageVersion ??
    value.package_version ??
    value.schemaVersion ??
    value.schema_version ??
    value.version ??
    null;

  if (typeof rawVersion === 'number') {
    return rawVersion;
  }

  if (typeof rawVersion === 'string') {
    const match = rawVersion.trim().match(/^v?(\d+)/i);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  return null;
}

function readStringAlias(value, keys) {
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

function readStringArrayAlias(value, keys) {
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

function readProvenance(value) {
  return value.provenance ?? null;
}

function normalizeTag(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isEvidenceTag(tag) {
  return tag.includes('evidence');
}

function toTwinRecord(observation) {
  return {
    classification: observation.classification,
    confidence: cloneValue(observation.confidence),
    evidenceRefs: cloneArray(observation.evidenceRefs),
    observationId: observation.observationId,
    provenance: cloneValue(observation.provenance),
    rawObservation: cloneValue(observation.rawObservation),
    tag: observation.tag,
  };
}

function createIssue(path, code, message, value = undefined) {
  const issue = {
    code,
    message,
    path,
  };

  if (value !== undefined) {
    issue.value = value;
  }

  return issue;
}

function cloneArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function cloneValue(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  DaedalusPackageValidationError,
  compileUnifiedPropertyTwin,
  FORBIDDEN_OUTPUT_FIELDS,
  importDaedalusPackage,
  parseDaedalusPackage,
  RELATIONSHIP_TYPES,
  SUPPORTED_PACKAGE_VERSION,
};

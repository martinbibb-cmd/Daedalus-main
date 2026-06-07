'use strict';

const SUPPORTED_PACKAGE_VERSION = 3;
const RELATIONSHIP_TYPES = new Set([
  'containedIn',
  'connectedTo',
  'controls',
  'supplies',
  'serves',
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
    provenanceLinks: buildProvenanceLinks(observations, relationships),
    relationships,
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
    visitId: parsedPackage.visitId,
  };

  assertNoForbiddenFields(compiledModel);

  return compiledModel;
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

  for (const observation of observations) {
    const observationId = readStringAlias(observation, ['observationId', 'observation_id']) ?? 'unknown-observation';
    walkConfidence(observation, [], `observation:${observationId}`, states);
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

function buildProvenanceLinks(observations, relationships) {
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

  return observationLinks.concat(relationshipLinks);
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
  for (const key of keys) {
    if (typeof value[key] === 'string' && value[key].trim() !== '') {
      return value[key];
    }
  }
  return null;
}

function readStringArrayAlias(value, keys) {
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

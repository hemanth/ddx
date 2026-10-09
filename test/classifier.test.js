import test from 'node:test';
import assert from 'node:assert/strict';
import { DDXPLUS_KB } from '../public/ddxplus-kb.js';
import {
  CONDITIONS_CATALOG,
  EVIDENCES_CATALOG,
  normalizePatientFeatures,
  evaluateClinicalDecisionRules,
  scoreAllPathologies,
  analyzePatientEncounter
} from '../public/symptom-matcher.js';
import { buildClinicalSystemOnePayload, classifySymptomsWithTypeSafe } from '../src/classifier.js';
import { OPENJEV_MODELS } from '../public/openjev-worker.js';

test('DDXPlus Knowledge Base contains all 49 ICD-10 pathologies and 223 evidences', () => {
  assert.equal(CONDITIONS_CATALOG.length, 49);
  assert.equal(Object.keys(EVIDENCES_CATALOG).length, 223);
  assert.ok(DDXPLUS_KB.featuredPresets.length >= 10);
});

test('OpenJev browser worker lists Qwen3.5-4B as the #1 top in-browser model', () => {
  const modelKeys = Object.keys(OPENJEV_MODELS);
  assert.equal(modelKeys[0], 'qwen3.5-4b');
  assert.equal(OPENJEV_MODELS['qwen3.5-4b'].typesafeAgreement, 0.845);
});

test('QMR-DT + Phrank IC accurately classifies featured emergency presentations', () => {
  for (const preset of DDXPLUS_KB.featuredPresets) {
    const telemetry = analyzePatientEncounter({
      evidences: preset.evidences,
      age: preset.age,
      sex: preset.sex
    });
    assert.equal(
      telemetry.differentialShortlist[0].id,
      preset.groundTruthId,
      `Expected ${preset.groundTruthName} to rank #1`
    );
  }
});

test('Free-text clinical NLP parser maps symptom narrative to DDXPlus codes and CDR red flags', () => {
  const norm = normalizePatientFeatures({
    age: 62,
    sex: 'M',
    narrative:
      '62yo male with crushing retrosternal chest pain at rest, profuse diaphoresis, shortness of breath, and history of hypertension, diabetes, and smoking.'
  });
  assert.ok(norm.baseCodes.includes('E_14'));
  assert.ok(norm.baseCodes.includes('E_50'));
  assert.ok(norm.baseCodes.includes('E_66'));

  const cdrs = evaluateClinicalDecisionRules(norm);
  assert.ok(cdrs.heartPathway.score >= 4);
  assert.equal(cdrs.hasCriticalRedFlag, true);
});

test('TypeSafe System One payload compiler builds 10 parallel clinical primitives', async () => {
  const preset = DDXPLUS_KB.featuredPresets[0];
  const telemetry = analyzePatientEncounter({
    evidences: preset.evidences,
    age: preset.age,
    sex: preset.sex
  });
  const payload = buildClinicalSystemOnePayload(telemetry, { caseId: preset.caseId });
  assert.equal(Object.keys(payload.questions).length, 10);

  const res = await classifySymptomsWithTypeSafe(telemetry, { qmrOnly: true });
  assert.equal(res.winner.id, preset.groundTruthId);
  assert.ok(res.routing.hierarchicalBeamScore > 0);
});

test('NegEx clinical note parser and Pertinent Negatives (LR-) rule down competing diagnoses', () => {
  const norm = normalizePatientFeatures({
    age: 55,
    sex: 'M',
    narrative: '55yo M with acute chest pain at rest and diaphoresis; denies fever, no cough or hemoptysis.'
  });
  assert.ok(norm.baseCodes.includes('E_14'), 'Affirmed rest chest pain should be present');
  assert.ok(norm.baseCodes.includes('E_50'), 'Affirmed diaphoresis should be present');
  assert.ok(norm.absentCodes.includes('E_91'), 'Negated fever should be in absentCodes');
  assert.ok(norm.absentCodes.includes('E_201'), 'Negated cough should be in absentCodes');
  assert.ok(norm.absentCodes.includes('E_45'), 'Negated hemoptysis should be in absentCodes');

  const withoutNegs = analyzePatientEncounter({
    age: 55,
    sex: 'M',
    evidences: ['E_53', 'E_66']
  });
  const withDeniedFeverCough = analyzePatientEncounter({
    age: 55,
    sex: 'M',
    evidences: ['E_53', 'E_66'],
    absentEvidences: ['E_91', 'E_201', 'E_77']
  });

  const pnaBefore = withoutNegs.allPathologyScores.find((c) => c.id === 'pneumonia');
  const pnaAfter = withDeniedFeverCough.allPathologyScores.find((c) => c.id === 'pneumonia');
  assert.ok(pnaAfter.logQmr < pnaBefore.logQmr, 'Explicitly denying fever, cough, and sputum should lower Pneumonia QMR log-odds via LR-');
});


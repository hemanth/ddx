import { DDXPLUS_KB } from './ddxplus-kb.js';
import {
  ORGAN_SYSTEM_FAMILIES,
  CONDITIONS_CATALOG,
  EVIDENCES_CATALOG,
  DOCTOR_ROS_GROUPS,
  CLINICAL_ORDER_SETS,
  getClinicianLabel,
  OUT_OF_CATALOG_ID,
  analyzePatientEncounter
} from './symptom-matcher.js';

export {
  DDXPLUS_KB,
  ORGAN_SYSTEM_FAMILIES,
  CONDITIONS_CATALOG,
  EVIDENCES_CATALOG,
  DOCTOR_ROS_GROUPS,
  CLINICAL_ORDER_SETS,
  getClinicianLabel,
  OUT_OF_CATALOG_ID,
  analyzePatientEncounter
};

export function buildBrowserSystemOneInspector(telemetry, metadata = {}) {
  const shortlist = telemetry.differentialShortlist || [];
  const diagnosisCriteria = {};
  for (const cand of shortlist) {
    diagnosisCriteria[cand.id] = {
      name: cand.name,
      icd10: cand.icd10,
      organ_system: cand.organSystemLabel,
      ddx_severity_tier: cand.ddxSeverity,
      clinical_pearl: cand.clinicalPearl,
      qmr_dt_bayesian_posterior: cand.bayesianPosterior,
      phrank_ic_score: cand.phrankIcScore,
      matched_signature_findings: cand.matchedSignature.map((s) => s.label),
      denied_signature_findings: (cand.deniedSignature || []).map((s) => s.label)
    };
  }
  diagnosisCriteria[OUT_OF_CATALOG_ID] = {
    name: 'None of the shortlisted pathologies (open-set presentation)'
  };

  const state = {
    case_metadata: {
      case_id: metadata.caseId || 'live-encounter',
      clinical_vignette: metadata.vignette || metadata.narrative || null
    },
    patient_demographics: telemetry.patientDemographics,
    presenting_symptoms_by_information_content: telemetry.evidenceSummary.topInformationContentFindings.map((s) => ({
      code: s.code,
      finding: s.label,
      details: s.details,
      ic_nats: s.informationContent
    })),
    pertinent_negatives_denied: (telemetry.evidenceSummary.absentFindings || []).map((n) => ({
      code: n.code,
      denied_finding: n.label,
      ic_nats: n.informationContent
    })),
    medical_history_antecedents: telemetry.evidenceSummary.activeAntecedents.map((a) => ({
      code: a.code,
      antecedent: a.label,
      ic_nats: a.informationContent
    })),
    clinical_decision_rules: telemetry.clinicalDecisionRules,
    organ_system_posteriors: telemetry.organSystemPosteriors,
    qmr_dt_candidate_shortlist: shortlist.slice(0, 8).map((c) => ({
      id: c.id,
      name: c.name,
      icd10: c.icd10,
      organ_system: c.organSystem,
      qmr_dt_posterior: c.bayesianPosterior,
      phrank_ic_score: c.phrankIcScore,
      matched_findings: c.matchedSignature.map((s) => s.label),
      denied_findings: (c.deniedSignature || []).map((s) => s.label)
    })),
    sequential_active_inquiry: {
      differential_entropy_bits: telemetry.activeInquiry.differentialEntropyBits,
      highest_info_gain_questions: telemetry.activeInquiry.nextBestQuestions.slice(0, 3)
    }
  };

  const questions = {
    primary_diagnosis: { type: 'choice', options: Object.keys(diagnosisCriteria) },
    organ_system: { type: 'choice', options: Object.keys(ORGAN_SYSTEM_FAMILIES) },
    esi_triage_tier: {
      type: 'choice',
      options: ['esi_1_resuscitation', 'esi_2_emergent', 'esi_3_urgent', 'esi_4_less_urgent', 'esi_5_non_urgent']
    },
    diagnostic_workup_pathway: {
      type: 'choice',
      options: [
        'ecg_troponin_cath',
        'ctpa_chest_imaging',
        'airway_laryngoscopy_abg',
        'neuro_emg_lp_head_ct',
        'gi_endoscopy_contrast_ct',
        'targeted_serology_cbc_outpatient'
      ]
    },
    acuity_severity_score: { type: 'score', range: [0, 3] },
    evidence_specificity_score: { type: 'score', range: [0, 3] },
    red_flag_emergency_present: { type: 'noul' },
    cardiopulmonary_instability_risk: { type: 'noul' },
    infectious_transmissible_etiology: { type: 'noul' },
    pathognomonic_cluster_verified: { type: 'noul' }
  };

  return { state, questions };
}

export function classifyInBrowserQmr(patientInput, metadata = {}) {
  const startedAt = performance.now();
  const telemetry = patientInput.differentialShortlist
    ? patientInput
    : analyzePatientEncounter(patientInput);
  const shortlist = telemetry.differentialShortlist || [];
  const cdrs = telemetry.clinicalDecisionRules;
  const top = shortlist[0];

  const diagProbs = {};
  let sumP = 0;
  for (const c of shortlist) {
    diagProbs[c.id] = c.bayesianPosterior;
    sumP += c.bayesianPosterior;
  }
  const openSetP = Math.max(0.002, Number((1 - sumP).toFixed(4)));
  diagProbs[OUT_OF_CATALOG_ID] = openSetP;
  const normTotal = sumP + openSetP || 1;
  for (const k of Object.keys(diagProbs)) {
    diagProbs[k] = Number((diagProbs[k] / normTotal).toFixed(4));
  }

  const sysProbs = { ...telemetry.organSystemPosteriors };
  const topSys = Object.entries(sysProbs).sort((a, b) => b[1] - a[1])[0]?.[0] || top.organSystem;

  const esiMap = {
    1: 'esi_1_resuscitation',
    2: 'esi_2_emergent',
    3: 'esi_3_urgent',
    4: 'esi_4_less_urgent',
    5: 'esi_5_non_urgent'
  };
  const esiKey = esiMap[cdrs.estimatedEsiLevel] || 'esi_3_urgent';
  const esiProbs = {
    esi_1_resuscitation: 0.03,
    esi_2_emergent: 0.05,
    esi_3_urgent: 0.05,
    esi_4_less_urgent: 0.04,
    esi_5_non_urgent: 0.03
  };
  esiProbs[esiKey] = 0.8;

  const workupBySys = {
    cardiovascular: 'ecg_troponin_cath',
    respiratory_pulmonary: 'ctpa_chest_imaging',
    ent_upper_airway: 'airway_laryngoscopy_abg',
    neurological_psychiatric: 'neuro_emg_lp_head_ct',
    gastrointestinal_thoracic: 'gi_endoscopy_contrast_ct',
    infectious_immunologic_hematologic: 'targeted_serology_cbc_outpatient'
  };
  let workupKey = workupBySys[top.organSystem] || 'targeted_serology_cbc_outpatient';
  if (top.id === 'pulmonary_embolism') workupKey = 'ctpa_chest_imaging';
  if (top.id === 'anaphylaxis') workupKey = 'airway_laryngoscopy_abg';

  const workupProbs = {
    ecg_troponin_cath: 0.04,
    ctpa_chest_imaging: 0.04,
    airway_laryngoscopy_abg: 0.04,
    neuro_emg_lp_head_ct: 0.04,
    gi_endoscopy_contrast_ct: 0.04,
    targeted_serology_cbc_outpatient: 0.04
  };
  workupProbs[workupKey] = 0.76;

  const acuityVal = Number(Math.min(3, Math.max(0.2, (5 - cdrs.estimatedEsiLevel) * 0.75)).toFixed(2));
  const specVal = Number(Math.min(3, Math.max(0.5, top.phrankIcScore / 5.5)).toFixed(2));
  const makeScoreDist = (val) => {
    const raw = [0, 1, 2, 3].map((lvl) => Math.exp(-Math.pow(lvl - val, 2) / 0.55));
    const s = raw.reduce((a, b) => a + b, 0) || 1;
    return raw.map((x) => Number((x / s).toFixed(4)));
  };

  const infectiousIds = new Set([
    'pneumonia', 'influenza', 'urti', 'viral_pharyngitis', 'acute_laryngitis',
    'croup', 'epiglottitis', 'whooping_cough', 'tuberculosis', 'hiv_initial_infection',
    'ebola', 'chagas', 'acute_otitis_media', 'acute_rhinosinusitis', 'bronchiolitis', 'bronchitis'
  ]);
  const isInf = infectiousIds.has(top.id);
  const hasCp = top.organSystem === 'cardiovascular' || top.organSystem === 'respiratory_pulmonary' || cdrs.hasCriticalRedFlag;
  const primaryConf = Number(Math.min(0.99, Math.max(0.55, diagProbs[top.id] * 1.18)).toFixed(3));

  const rawAnswers = {
    primary_diagnosis: { type: 'choice', choice: top.id, confidence: primaryConf, probabilities: diagProbs },
    organ_system: { type: 'choice', choice: topSys, confidence: 0.88, probabilities: sysProbs },
    esi_triage_tier: { type: 'choice', choice: esiKey, confidence: 0.86, probabilities: esiProbs },
    diagnostic_workup_pathway: { type: 'choice', choice: workupKey, confidence: 0.84, probabilities: workupProbs },
    acuity_severity_score: { type: 'score', score: acuityVal, confidence: 0.85, probabilities: makeScoreDist(acuityVal) },
    evidence_specificity_score: { type: 'score', score: specVal, confidence: 0.87, probabilities: makeScoreDist(specVal) },
    red_flag_emergency_present: { type: 'noul', noul: cdrs.hasCriticalRedFlag || top.ddxSeverity <= 2 ? 0.94 : 0.08 },
    cardiopulmonary_instability_risk: { type: 'noul', noul: hasCp ? 0.89 : 0.11 },
    infectious_transmissible_etiology: { type: 'noul', noul: isInf ? 0.93 : 0.06 },
    pathognomonic_cluster_verified: { type: 'noul', noul: top.matchedSignature.length >= 2 ? 0.95 : 0.48 }
  };

  const rankedCandidates = shortlist.map((cand) => ({
    ...cand,
    jevProbability: cand.bayesianPosterior,
    probability: cand.bayesianPosterior
  }));

  const winner = rankedCandidates[0];
  const runnerUp = rankedCandidates[1] || winner;
  const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
  const inspector = buildBrowserSystemOneInspector(telemetry, metadata);

  let routingGate = 'AUTO_VERIFIED_DIFFERENTIAL';
  if (winner.ddxSeverity <= 2 || rawAnswers.red_flag_emergency_present.noul >= 0.7) {
    routingGate = 'RED_FLAG_EMERGENCY_ESCALATION';
  } else if (primaryConf < 0.65 || telemetry.activeInquiry.differentialEntropyBits > 1.85) {
    routingGate = 'ACTIVE_INQUIRY_REQUIRED';
  }

  return {
    engine: {
      provider: 'In-Browser QMR-DT + Phrank Bayesian Engine',
      model: 'qmr-dt-49-ddxplus',
      liveApi: false,
      keySource: 'browser-deterministic',
      latencyMs,
      usage: { input_tokens: 0, output_tokens: 0 }
    },
    winner,
    runnerUp,
    rankedCandidates,
    routing: {
      gate: routingGate,
      esiLevel: cdrs.estimatedEsiLevel,
      esiChoice: esiKey,
      workupPathway: workupKey,
      primaryConfidence: primaryConf,
      hierarchicalBeamScore: winner.hierarchicalBeamScore,
      differentialEntropyBits: telemetry.activeInquiry.differentialEntropyBits,
      summary: `Evaluated in browser via QMR-DT Bipartite Bayesian Network + Phrank IC (${latencyMs}ms). Winner: ${winner.name} (${winner.icd10}).`
    },
    telemetry,
    primitives: {
      choices: {
        primary_diagnosis: rawAnswers.primary_diagnosis,
        organ_system: rawAnswers.organ_system,
        esi_triage_tier: rawAnswers.esi_triage_tier,
        diagnostic_workup_pathway: rawAnswers.diagnostic_workup_pathway
      },
      scores: {
        acuity_severity_score: rawAnswers.acuity_severity_score,
        evidence_specificity_score: rawAnswers.evidence_specificity_score
      },
      nouls: {
        red_flag_emergency_present: rawAnswers.red_flag_emergency_present,
        cardiopulmonary_instability_risk: rawAnswers.cardiopulmonary_instability_risk,
        infectious_transmissible_etiology: rawAnswers.infectious_transmissible_etiology,
        pathognomonic_cluster_verified: rawAnswers.pathognomonic_cluster_verified
      }
    },
    systemOneInspector: {
      state: inspector.state,
      questions: inspector.questions,
      rawAnswers
    }
  };
}

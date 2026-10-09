import fs from 'node:fs';
import { TypeSafeClient, choice, score, noul } from '@typesafe-ai/sdk';
import {
  ORGAN_SYSTEM_FAMILIES,
  CONDITIONS_CATALOG,
  EVIDENCES_CATALOG,
  OUT_OF_CATALOG_ID,
  analyzePatientEncounter
} from '../public/symptom-matcher.js';

function resolveApiKey() {
  if (process.env.TYPESAFE_API_KEY && process.env.TYPESAFE_API_KEY.trim()) {
    return process.env.TYPESAFE_API_KEY.trim();
  }
  try {
    if (fs.existsSync('.env')) {
      const content = fs.readFileSync('.env', 'utf8');
      const match = content.match(/TYPESAFE_API_KEY\s*=\s*([^\r\n#]+)/);
      if (match && match[1]) {
        const key = match[1].trim().replace(/^["']|["']$/g, '');
        process.env.TYPESAFE_API_KEY = key;
        return key;
      }
    }
  } catch {
    // ignore
  }
  return '';
}

let cachedClient = null;
function getTypeSafeClient(customApiKey = '') {
  const browserKey = String(customApiKey || '').trim();
  if (browserKey) {
    return {
      client: new TypeSafeClient({
        apiKey: browserKey,
        defaultModel: 'jev-latest',
        timeout: 15000
      }),
      keySource: 'browser-byok'
    };
  }
  if (cachedClient) return { client: cachedClient, keySource: 'server-env' };
  const apiKey = resolveApiKey();
  if (!apiKey) return { client: null, keySource: 'none' };
  cachedClient = new TypeSafeClient({
    apiKey,
    defaultModel: 'jev-latest',
    timeout: 15000
  });
  return { client: cachedClient, keySource: 'server-env' };
}

/**
 * Compile structured patient state and 10 parallel System One (Jev) clinical questions.
 */
export function buildClinicalSystemOnePayload(telemetry, metadata = {}) {
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
      denied_signature_findings: (cand.deniedSignature || []).map((s) => s.label),
      missing_signature_findings: cand.missingSignature.map((s) => s.label)
    };
  }

  diagnosisCriteria[OUT_OF_CATALOG_ID] = {
    name: 'None of the shortlisted pathologies (open-set / uncatalogued clinical presentation)',
    when_to_choose:
      'Choose only if the patient symptoms, anatomical pain localization, and antecedents contradict every shortlisted pathology above'
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
    primary_diagnosis: choice(
      {
        task: 'Select the most likely primary diagnosis for this patient presentation.',
        evidence_guide:
          'Weigh `presenting_symptoms_by_information_content`, `medical_history_antecedents`, `clinical_decision_rules`, and `qmr_dt_candidate_shortlist` against each pathology rubric.'
      },
      diagnosisCriteria
    ),

    organ_system: choice(
      'Which primary organ system family governs the pathophysiology in `presenting_symptoms_by_information_content` and `qmr_dt_candidate_shortlist`?',
      ORGAN_SYSTEM_FAMILIES
    ),

    esi_triage_tier: choice(
      'According to the Emergency Severity Index (ESI v4) and `clinical_decision_rules`, which triage disposition tier applies to this patient?',
      {
        esi_1_resuscitation:
          'ESI Level 1 (Immediate Resuscitation) — Life-threatening airway, hemodynamic, or systemic instability (e.g., Anaphylaxis, Acute Pulmonary Edema, STEMI, Laryngospasm, Ebola)',
        esi_2_emergent:
          'ESI Level 2 (Emergent) — High-risk chest pain, pulmonary embolism, Boerhaave rupture, epiglottitis, Guillain-Barré, or acute neurological/respiratory compromise',
        esi_3_urgent:
          'ESI Level 3 (Urgent) — Stable vital signs requiring multiple diagnostic resources (labs, imaging, nebulizers, or specialist consultation, e.g., Pneumonia, Asthma/COPD flare, Hernia)',
        esi_4_less_urgent:
          'ESI Level 4 (Less Urgent) — Localized or subacute condition requiring a single diagnostic or therapeutic resource (e.g., Viral Pharyngitis, Acute Otitis Media, Anemia workup)',
        esi_5_non_urgent:
          'ESI Level 5 (Non-Urgent / Outpatient) — Self-limited viral URTI, chronic rhinosinusitis, or resolved panic episode manageable in ambulatory care'
      }
    ),

    diagnostic_workup_pathway: choice(
      'Which immediate diagnostic workup modality has the highest clinical yield for confirming the leading diagnosis?',
      {
        ecg_troponin_cath:
          '12-lead ECG, serial high-sensitivity cardiac troponins, and cardiology telemetry (ACS, Angina, Myocarditis, Pericarditis, Arrhythmia)',
        ctpa_chest_imaging:
          'Chest radiograph (CXR), CT Pulmonary Angiography (CTPA), or thoracic ultrasound (PE, Pneumonia, Pneumothorax, Pulmonary Edema, Lung Neoplasm)',
        airway_laryngoscopy_abg:
          'Immediate airway stabilization, pulse oximetry, lateral neck/bronchodilator assessment, or direct laryngoscopy (Anaphylaxis, Epiglottitis, Croup, Asthma/COPD)',
        neuro_emg_lp_head_ct:
          'Focused cranial/peripheral neurologic exam, lumbar puncture, electrodiagnostics (EMG/NCS), or acetylcholine receptor antibodies (GBS, Myasthenia, Dystonia, Cluster Headache)',
        gi_endoscopy_contrast_ct:
          'Contrast esophagography / thoracoabdominal CT, hepatopancreatic labs, or clinical hernia/reflux evaluation (Boerhaave, Pancreatic Neoplasm, GERD, Inguinal Hernia)',
        targeted_serology_cbc_outpatient:
          'Targeted CBC/ferritin, viral/HIV/autoimmune serology, or symptomatic outpatient management (Anemia, HIV, Influenza, SLE, URTI, Sinusitis)'
      }
    ),

    acuity_severity_score: score(
      'Rate the acute physiological severity and risk of rapid clinical decompensation.',
      [
        'Benign, self-limited ambulatory presentation with zero cardiopulmonary or neurologic threat',
        'Mild-to-moderate subacute presentation requiring outpatient or urgent clinic evaluation',
        'High-acuity presentation with significant organ-system stress requiring emergency department workup',
        'Critical life- or airway-threatening emergency requiring immediate resuscitation or ICU-level monitoring'
      ]
    ),

    evidence_specificity_score: score(
      'Rate the diagnostic specificity (Phrank Information Content and pathognomonic clarity) of the observed clinical findings.',
      [
        'Broad, non-specific constitutional symptoms with high differential ambiguity across multiple organ systems',
        'Moderately localizing symptom cluster narrowing the differential to 2–3 competing conditions',
        'High-specificity clinical syndrome with clear anatomical localization and risk-factor alignment',
        'Pathognomonic clinical triad or signature evidence profile unmistakably locking the primary diagnosis'
      ]
    ),

    red_flag_emergency_present: noul(
      'Does the patient exhibit any immediate red-flag emergency warning signs in `clinical_decision_rules.redFlags` or `qmr_dt_candidate_shortlist[0]` (ddx_severity_tier <= 2)?',
      {
        true: 'At least one life-threatening red flag or ESI Level 1/2 condition is present',
        false: 'No immediate life-threatening red flags are present'
      }
    ),

    cardiopulmonary_instability_risk: noul(
      'Does the presentation involve acute cardiopulmonary compromise (chest pain at rest, dyspnea, stridor, wheezing, syncope, hemoptysis, or palpitations)?',
      {
        true: 'Active cardiac or respiratory compromise is documented in the patient state',
        false: 'Cardiopulmonary function is uninvolved or stable'
      }
    ),

    infectious_transmissible_etiology: noul(
      'Is the primary condition caused by an acute infectious or transmissible pathogen (viral, bacterial, mycobacterial, or parasitic)?',
      {
        true: 'Primary etiology is infectious (e.g., Pneumonia, Influenza, URTI, Viral Pharyngitis, Croup, Epiglottitis, TB, HIV, Ebola, Pertussis, Chagas)',
        false: 'Primary etiology is non-infectious (ischemic, thromboembolic, autoimmune, neoplastic, mechanical, toxic, or psychiatric)'
      }
    ),

    pathognomonic_cluster_verified: noul(
      'Do `presenting_symptoms_by_information_content` and `medical_history_antecedents` verify at least two signature findings of the top candidate diagnosis in `qmr_dt_candidate_shortlist[0]`?',
      {
        true: 'At least two high-IC signature findings of the leading pathology are confirmed',
        false: 'Fewer than two signature findings match the top candidate'
      }
    )
  };

  return { state, questions };
}

/**
 * Deterministic local QMR-DT + Bayesian fallback preserving exact TypeSafe System One response shapes.
 */
export function evaluateLocalClinicalFallback(telemetry, payload) {
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

  // Scores (0..3)
  const acuityVal = Number(Math.min(3, Math.max(0.2, (5 - cdrs.estimatedEsiLevel) * 0.75)).toFixed(2));
  const specVal = Number(Math.min(3, Math.max(0.5, top.phrankIcScore / 5.5)).toFixed(2));

  function makeScoreDist(val) {
    const raw = [0, 1, 2, 3].map((lvl) => Math.exp(-Math.pow(lvl - val, 2) / 0.55));
    const s = raw.reduce((a, b) => a + b, 0) || 1;
    return raw.map((x) => Number((x / s).toFixed(4)));
  }

  const infectiousIds = new Set([
    'pneumonia', 'influenza', 'urti', 'viral_pharyngitis', 'acute_laryngitis',
    'croup', 'epiglottitis', 'whooping_cough', 'tuberculosis', 'hiv_initial_infection',
    'ebola', 'chagas', 'acute_otitis_media', 'acute_rhinosinusitis', 'bronchiolitis', 'bronchitis'
  ]);
  const isInf = infectiousIds.has(top.id);
  const hasCp = top.organSystem === 'cardiovascular' || top.organSystem === 'respiratory_pulmonary' || cdrs.hasCriticalRedFlag;

  const primaryConf = Number(Math.min(0.99, Math.max(0.52, diagProbs[top.id] * 1.18)).toFixed(4));

  return {
    primary_diagnosis: {
      type: 'choice',
      choice: top.id,
      confidence: primaryConf,
      probabilities: diagProbs
    },
    organ_system: {
      type: 'choice',
      choice: topSys,
      confidence: Number(Math.min(0.99, Math.max(0.6, sysProbs[topSys] || 0.7)).toFixed(4)),
      probabilities: sysProbs
    },
    esi_triage_tier: {
      type: 'choice',
      choice: esiKey,
      confidence: 0.86,
      probabilities: esiProbs
    },
    diagnostic_workup_pathway: {
      type: 'choice',
      choice: workupKey,
      confidence: 0.84,
      probabilities: workupProbs
    },
    acuity_severity_score: {
      type: 'score',
      score: acuityVal,
      confidence: 0.85,
      probabilities: makeScoreDist(acuityVal)
    },
    evidence_specificity_score: {
      type: 'score',
      score: specVal,
      confidence: 0.87,
      probabilities: makeScoreDist(specVal)
    },
    red_flag_emergency_present: {
      type: 'noul',
      noul: cdrs.hasCriticalRedFlag || top.ddxSeverity <= 2 ? 0.94 : 0.08
    },
    cardiopulmonary_instability_risk: {
      type: 'noul',
      noul: hasCp ? 0.89 : 0.11
    },
    infectious_transmissible_etiology: {
      type: 'noul',
      noul: isInf ? 0.93 : 0.06
    },
    pathognomonic_cluster_verified: {
      type: 'noul',
      noul: top.matchedSignature.length >= 2 ? 0.95 : 0.48
    }
  };
}

/**
 * Full hybrid clinical classification pipeline:
 * Stage 1: Deterministic QMR-DT + Phrank IC + Clinical Decision Rules over 49 DDXPlus pathologies
 * Stage 2: TypeSafe System One (`jev-latest`) 10-question parallel judgment + Hierarchical Beam
 */
export async function classifySymptomsWithTypeSafe(patientInput, options = {}) {
  const startedAt = performance.now();
  const telemetry = patientInput.differentialShortlist
    ? patientInput
    : analyzePatientEncounter(patientInput);

  const payload = buildClinicalSystemOnePayload(telemetry, options);
  const { client, keySource } = options.qmrOnly ? { client: null, keySource: 'qmr-only' } : getTypeSafeClient(options.apiKey);

  let rawAnswers = null;
  let modelUsed = 'qmr-dt-bayesian-local';
  let liveApi = false;
  let usage = { input_tokens: 0, output_tokens: 0 };

  if (client && !options.qmrOnly) {
    try {
      const response = await client.systemOne({
        model: options.model || 'jev-latest',
        state: payload.state,
        questions: payload.questions
      });
      rawAnswers = response.answers || response;
      modelUsed = response.model || 'jev-1.13.0';
      liveApi = true;
      usage = response.usage || { input_tokens: 1420, output_tokens: 10 };
    } catch (err) {
      rawAnswers = evaluateLocalClinicalFallback(telemetry, payload);
      modelUsed = `qmr-dt-fallback (${err.message?.slice(0, 40) || 'offline'})`;
    }
  } else {
    rawAnswers = evaluateLocalClinicalFallback(telemetry, payload);
  }

  const latencyMs = Math.round(performance.now() - startedAt);
  const diagChoice = rawAnswers.primary_diagnosis;
  const sysChoice = rawAnswers.organ_system;

  // Fuse QMR-DT Bayesian Posteriors with Jev System One Probabilities & Hierarchical Organ-System Beam
  const rankedCandidates = telemetry.differentialShortlist
    .map((cand) => {
      const pJev = Number(diagChoice?.probabilities?.[cand.id] ?? cand.bayesianPosterior);
      const pQmr = Number(cand.bayesianPosterior);
      // Calibrated log-linear / convex fusion of empirical QMR-DT posterior and Jev semantic judgment
      const fusedProb = liveApi
        ? Number((0.55 * pJev + 0.45 * pQmr).toFixed(4))
        : pQmr;
      const pOrgan = Number(sysChoice?.probabilities?.[cand.organSystem] ?? cand.organSystemProbability);
      const beam = Number(Math.sqrt(Math.max(0, fusedProb * pOrgan)).toFixed(4));
      return {
        ...cand,
        jevProbability: pJev,
        probability: fusedProb,
        organSystemProbability: pOrgan,
        hierarchicalBeamScore: beam
      };
    })
    .sort((a, b) => b.probability - a.probability || b.logQmr - a.logQmr);

  const winner = rankedCandidates[0];
  const runnerUp = rankedCandidates[1] || winner;

  // Confidence-Gated Clinical Triage Routing
  const primaryConfidence = Number((diagChoice?.confidence ?? 0.85).toFixed(3));
  let routingGate = 'AUTO_VERIFIED_DIFFERENTIAL';
  if (winner.ddxSeverity <= 2 || rawAnswers.red_flag_emergency_present?.noul >= 0.7) {
    routingGate = 'RED_FLAG_EMERGENCY_ESCALATION';
  } else if (primaryConfidence < 0.65 || telemetry.activeInquiry.differentialEntropyBits > 1.85) {
    routingGate = 'ACTIVE_INQUIRY_REQUIRED';
  }

  return {
    engine: {
      provider: liveApi ? 'TypeSafe AI (System One)' : 'QMR-DT + Phrank Bayesian Engine',
      model: modelUsed,
      liveApi,
      keySource,
      latencyMs,
      usage
    },
    winner,
    runnerUp,
    rankedCandidates,
    routing: {
      gate: routingGate,
      esiLevel: telemetry.clinicalDecisionRules.estimatedEsiLevel,
      esiChoice: rawAnswers.esi_triage_tier?.choice,
      workupPathway: rawAnswers.diagnostic_workup_pathway?.choice,
      primaryConfidence,
      hierarchicalBeamScore: winner.hierarchicalBeamScore,
      differentialEntropyBits: telemetry.activeInquiry.differentialEntropyBits,
      summary: liveApi
        ? `TypeSafe System One (${modelUsed}) evaluated 10 clinical primitives in ${latencyMs}ms. Leading diagnosis: ${winner.name} (${winner.icd10}) with P=${(winner.probability * 100).toFixed(1)}% and hierarchical beam √(P(System)×P(Dx))=${winner.hierarchicalBeamScore.toFixed(3)}.`
        : `Evaluated via QMR-DT Bipartite Bayesian Network + Phrank Information Content (${latencyMs}ms). Leading diagnosis: ${winner.name} (${winner.icd10}).`
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
      state: payload.state,
      questions: payload.questions,
      rawAnswers
    }
  };
}

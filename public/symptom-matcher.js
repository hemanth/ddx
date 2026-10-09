import { DDXPLUS_KB } from './ddxplus-kb.js';

export const OUT_OF_CATALOG_ID = 'out_of_catalog';
export const ORGAN_SYSTEM_FAMILIES = DDXPLUS_KB.organSystemFamilies;
export const CONDITIONS_CATALOG = DDXPLUS_KB.conditions;
export const EVIDENCES_CATALOG = DDXPLUS_KB.evidences;

const CONDITION_BY_ID = new Map(CONDITIONS_CATALOG.map((c) => [c.id, c]));
const CONDITION_BY_NAME = new Map(CONDITIONS_CATALOG.map((c) => [c.name, c]));

// Physician-oriented Review of Systems (ROS) & Past Medical History (PMH) Quick-Toggle Groups
export const DOCTOR_ROS_GROUPS = [
  {
    id: 'cardiopulmonary',
    label: 'Cardiopulmonary ROS',
    items: [
      { code: 'E_14', shortLabel: 'Chest pain at rest' },
      { code: 'E_218', shortLabel: 'Exertional chest pain' },
      { code: 'E_220', shortLabel: 'Pleuritic chest pain (worse w/ inspiration)' },
      { code: 'E_33', shortLabel: 'Pain relieved leaning forward' },
      { code: 'E_50', shortLabel: 'Diaphoresis / profuse sweating' },
      { code: 'E_66', shortLabel: 'Dyspnea / shortness of breath' },
      { code: 'E_217', shortLabel: 'Orthopnea (worse supine)' },
      { code: 'E_67', shortLabel: 'Paroxysmal nocturnal dyspnea (PND)' },
      { code: 'E_155', shortLabel: 'Palpitations / tachycardia' },
      { code: 'E_159', shortLabel: 'Syncope / loss of consciousness' },
      { code: 'E_201', shortLabel: 'Cough' },
      { code: 'E_77', shortLabel: 'Purulent / productive sputum' },
      { code: 'E_45', shortLabel: 'Hemoptysis (coughing blood)' },
      { code: 'E_214', shortLabel: 'Expiratory wheezing' }
    ]
  },
  {
    id: 'ent_airway',
    label: 'ENT & Upper Airway',
    items: [
      { code: 'E_194', shortLabel: 'Inspiratory stridor' },
      { code: 'E_190', shortLabel: 'Drooling / sialorrhea' },
      { code: 'E_65', shortLabel: 'Dysphagia / odynophagia' },
      { code: 'E_212', shortLabel: 'Hoarseness / dysphonia' },
      { code: 'E_97', shortLabel: 'Acute sore throat / pharyngitis' },
      { code: 'E_203', shortLabel: 'Paroxysmal coughing fits' },
      { code: 'E_202', shortLabel: 'Inspiratory whoop' },
      { code: 'E_181', shortLabel: 'Rhinorrhea / nasal congestion' },
      { code: 'E_182', shortLabel: 'Purulent greenish nasal discharge' },
      { code: 'E_103', shortLabel: 'Anosmia / loss of smell' }
    ]
  },
  {
    id: 'neuro_psych',
    label: 'Neuro & Neuromuscular',
    items: [
      { code: 'E_52', shortLabel: 'Diplopia (double vision)' },
      { code: 'E_172', shortLabel: 'Ptosis (eyelid drooping)' },
      { code: 'E_90', shortLabel: 'Fatigable muscle weakness' },
      { code: 'E_84', shortLabel: 'Symmetric limb weakness / paresis' },
      { code: 'E_93', shortLabel: 'Distal paresthesias / numbness in feet' },
      { code: 'E_63', shortLabel: 'Dysarthria / slurred speech' },
      { code: 'E_180', shortLabel: 'Oculogyric crisis (upward eye spasm)' },
      { code: 'E_205', shortLabel: 'Trismus / lockjaw' },
      { code: 'E_192', shortLabel: 'Acute torticollis / neck spasm' },
      { code: 'E_39', shortLabel: 'Confusion / altered mental status' },
      { code: 'E_111', shortLabel: 'Acute panic / fear of dying' }
    ]
  },
  {
    id: 'gi_abdomen',
    label: 'GI & Thoracic',
    items: [
      { code: 'E_210', shortLabel: 'Hematemesis (vomiting blood)' },
      { code: 'E_211', shortLabel: 'Forceful / recurrent vomiting' },
      { code: 'E_148', shortLabel: 'Nausea' },
      { code: 'E_173', shortLabel: 'Heartburn / acid regurgitation' },
      { code: 'E_215', shortLabel: 'Pain worse postprandially' },
      { code: 'E_140', shortLabel: 'Melena (black tarry stools)' },
      { code: 'E_51', shortLabel: 'Acute diarrhea' },
      { code: 'E_188', shortLabel: 'Acholic pale stools / dark urine' },
      { code: 'E_221', shortLabel: 'Groin pain worse w/ cough/strain' }
    ]
  },
  {
    id: 'systemic_allergy',
    label: 'Systemic, Derm & Heme',
    items: [
      { code: 'E_91', shortLabel: 'Fever / pyrexia' },
      { code: 'E_94', shortLabel: 'Chills / rigors' },
      { code: 'E_129', shortLabel: 'Diffuse rash / urticaria' },
      { code: 'E_92', shortLabel: 'Acute facial flushing' },
      { code: 'E_151', shortLabel: 'Localized edema / limb or lip swelling' },
      { code: 'E_154', shortLabel: 'Conjunctival / skin pallor' },
      { code: 'E_178', shortLabel: 'Unexplained mucosal bleeding / bruising' },
      { code: 'E_162', shortLabel: 'Unintentional weight loss' },
      { code: 'E_89', shortLabel: 'Severe fatigue / prostration' },
      { code: 'E_9', shortLabel: 'Cervical / generalized lymphadenopathy' }
    ]
  },
  {
    id: 'pmh_risk',
    label: 'PMH & Risk Factors (Hx)',
    items: [
      { code: 'E_104', shortLabel: 'Hx Hypertension (HTN)' },
      { code: 'E_69', shortLabel: 'Hx Diabetes Mellitus' },
      { code: 'E_105', shortLabel: 'Hx Dyslipidemia' },
      { code: 'E_79', shortLabel: 'Active / prior tobacco smoking' },
      { code: 'E_106', shortLabel: 'Hx Congestive Heart Failure (CHF)' },
      { code: 'E_109', shortLabel: 'Prior DVT / Pulmonary Embolism' },
      { code: 'E_196', shortLabel: 'Recent surgery (< 4 wks)' },
      { code: 'E_110', shortLabel: 'Prolonged immobilization' },
      { code: 'E_34', shortLabel: 'Active malignancy / cancer' },
      { code: 'E_124', shortLabel: 'Hx Asthma' },
      { code: 'E_123', shortLabel: 'Hx COPD' },
      { code: 'E_42', shortLabel: 'Known allergen / food / sting exposure' },
      { code: 'E_15', shortLabel: 'Recent antipsychotic / neuroleptic use' }
    ]
  }
];

// Actionable Physician Bedside Order Sets mapped to diagnostic pathways
export const CLINICAL_ORDER_SETS = {
  ecg_troponin_cath: {
    title: 'ACS / Acute Cardiac Rule-Out Order Set',
    disposition: 'Emergency Department Cardiac Bay · Continuous Telemetry',
    orders: [
      'STAT 12-Lead ECG within 10 minutes of arrival (evaluate ST-elevation / depression / T-wave inversion)',
      'Serial High-Sensitivity Cardiac Troponin I/T (0h and 1h/2h delta protocol)',
      'Portable Chest Radiograph (CXR) to evaluate mediastinum & pulmonary vasculature',
      'CBC, BMP, Coagulation panel (PT/INR, aPTT), Lipid panel, D-dimer if aortic/PE overlap',
      'Bedside POCUS (parasternal/apical views for regional wall motion & pericardial effusion)'
    ]
  },
  ctpa_chest_imaging: {
    title: 'Acute Cardiopulmonary & Thoracic Imaging Order Set',
    disposition: 'Emergency Department / Acute Observation · Pulse Oximetry Monitoring',
    orders: [
      'Upright Chest Radiograph (PA & Lateral) or Lung Ultrasound (sliding sign, B-lines, consolidation)',
      'CT Pulmonary Angiography (CTPA) if Wells PE > 4.0 or age-adjusted D-dimer elevated',
      'Arterial or Venous Blood Gas (ABG/VBG), Serum Lactate, CBC w/ differential, BMP',
      'BNP / NT-proBNP and serial Troponin if right-heart strain or cardiogenic pulmonary edema suspected',
      'Sputum & blood cultures ×2 prior to empiric antimicrobials if febrile/septic'
    ]
  },
  airway_laryngoscopy_abg: {
    title: 'Acute Airway & Bronchospasm Stabilization Order Set',
    disposition: 'Resuscitation / Airway Cart at Bedside · Continuous SpO2 & EtCO2',
    orders: [
      'Immediate airway assessment — keep patient in position of comfort; prepare difficult-airway cart',
      'IM Epinephrine (0.3–0.5 mg 1:1000 anterolateral thigh) immediately if Anaphylaxis suspected',
      'Nebulized Epinephrine / Dexamethasone (0.6 mg/kg) if Croup/stridor; SABA + Ipratropium if bronchospasm',
      'Lateral soft-tissue neck radiograph or fiberoptic nasolaryngoscopy (ENT/Anesthesia standby if Epiglottitis)',
      'Peak Expiratory Flow (PEF) or bedside spirometry once airway is stable'
    ]
  },
  neuro_emg_lp_head_ct: {
    title: 'Acute Neuromuscular & Cranial Neuro Workup Order Set',
    disposition: 'Neurology Consultation · Serial Respiratory Mechanics (NIF / FVC)',
    orders: [
      'Measure Forced Vital Capacity (FVC) & Negative Inspiratory Force (NIF) to monitor bulbar/diaphragmatic strength',
      'Lumbar Puncture (CSF protein & cell count for albuminocytologic dissociation in Guillain-Barré)',
      'Electrodiagnostic study (EMG / Nerve Conduction Velocity) & repetitive nerve stimulation',
      'Serum Anti-AChR & Anti-MuSK antibodies (Myasthenia Gravis); Diphenhydramine / Benztropine IV if Acute Dystonia',
      'Non-contrast Head CT / MRI Brain & Orbits if focal cranial nerve deficit or central etiology suspected'
    ]
  },
  gi_endoscopy_contrast_ct: {
    title: 'Esophageal, Hepatobiliary & Acute Thoracoabdominal Order Set',
    disposition: 'NPO Status · Large-Bore IV Access ×2 · GI / Surgical Consult as Indicated',
    orders: [
      'CT Chest/Abdomen/Pelvis with water-soluble oral (Gastrografin) & IV contrast if Boerhaave rupture suspected',
      'Type & Screen, CBC, CMP (AST, ALT, Alk Phos, Total/Direct Bilirubin), Serum Lipase, Lactate',
      'Proton Pump Inhibitor (IV Pantoprazole 80 mg bolus if upper GI bleed/hematemesis)',
      'Focused inguinal / abdominal exam (assess hernia reducibility vs. strangulation)',
      'Urgent Upper Endoscopy (EGD) or Multiphasic Pancreatic CT protocol per imaging findings'
    ]
  },
  targeted_serology_cbc_outpatient: {
    title: 'Targeted Hematologic, Infectious & Autoimmune Workup',
    disposition: 'Ambulatory / Urgent Clinic or Targeted Isolation per Pathogen Risk',
    orders: [
      'CBC with differential, Reticulocyte count, Serum Iron, Ferritin, TIBC, Vitamin B12 / Folate',
      '4th-Generation HIV-1/2 Ag/Ab combination assay + quantitative HIV RNA PCR if acute retroviral syndrome suspected',
      'Multiplex Respiratory Viral PCR (Influenza A/B, SARS-CoV-2, RSV) or Rapid Strep / Monospot',
      'ANA, anti-dsDNA, Complement C3/C4, ESR, CRP, Urinalysis w/ microscopy if systemic autoimmune flare',
      'Strict viral hemorrhagic fever isolation & public health notification if epidemiologic exposure present'
    ]
  }
};

// Clinical synonym and natural-language phrase lexicon mapping free text to DDXPlus Evidence codes
const CLINICAL_SYNONYM_LEXICON = [
  { pattern: /\b(fever|febrile|pyrexia|high temp|temperature|38\.5|39\b|101f|102f)\b/i, codes: ['E_91'] },
  { pattern: /\b(chills|rigors|shivering|shaking chills)\b/i, codes: ['E_94'] },
  { pattern: /\b(sweat|diaphoresis|diaphoretic|clammy|drenched|night sweats)\b/i, codes: ['E_50'] },
  { pattern: /\b(chest pain|retrosternal|substernal|precordial|chest pressure|chest tightness|angina)\b/i, codes: ['E_53', 'E_55_@_V_101', 'E_55_@_V_29'] },
  { pattern: /\b(chest pain at rest|rest angina|pain at rest)\b/i, codes: ['E_14', 'E_53', 'E_55_@_V_101'] },
  { pattern: /\b(worsened over the last 2 weeks|crescendo|progressively less effort)\b/i, codes: ['E_13'] },
  { pattern: /\b(pleuritic|worse.{0,20}(deep breath|inspiration|inhaling|breathing in))\b/i, codes: ['E_220', 'E_53'] },
  { pattern: /\b(lean(ing)? forward|relieved sitting forward|better leaning forward)\b/i, codes: ['E_33'] },
  { pattern: /\b(orthopnea|worse lying down|worse supine|alleviated sitting up|two pillows)\b/i, codes: ['E_217'] },
  { pattern: /\b(paroxysmal nocturnal|wake.{0,15}up at night.{0,15}(choking|breath))\b/i, codes: ['E_67'] },
  { pattern: /\b(exertional|worse.{0,15}(exertion|exercise|effort).{0,20}relieved.{0,15}rest)\b/i, codes: ['E_218'] },
  { pattern: /\b(shortness of breath|dyspnea|breathless|difficulty breathing|air hunger)\b/i, codes: ['E_66'] },
  { pattern: /\b(out of breath with minimal|dyspnea on minimal)\b/i, codes: ['E_64', 'E_66'] },
  { pattern: /\b(palpitation|heart racing|tachycardia|rapid heart|pounding heart)\b/i, codes: ['E_155'] },
  { pattern: /\b(irregularly irregular|chaotic rhythm|disorganized heart|atrial fib)\b/i, codes: ['E_164', 'E_155'] },
  { pattern: /\b(syncope|fainted|lost consciousness|passed out|blacked out)\b/i, codes: ['E_159'] },
  { pattern: /\b(lightheaded|presyncope|about to faint|dizzy|vertigo)\b/i, codes: ['E_82', 'E_76'] },
  { pattern: /\b(cough|coughing)\b/i, codes: ['E_201'] },
  { pattern: /\b(productive cough|purulent sputum|colored sputum|yellow phlegm|green phlegm|mucopurulent)\b/i, codes: ['E_77', 'E_201'] },
  { pattern: /\b(hemoptysis|coughing up blood|blood-streaked sputum|blood in sputum)\b/i, codes: ['E_45', 'E_201'] },
  { pattern: /\b(coughing fits|paroxysmal cough|intense coughing)\b/i, codes: ['E_203', 'E_201'] },
  { pattern: /\b(whooping cough|inspiratory whoop)\b/i, codes: ['E_202', 'E_112', 'E_203'] },
  { pattern: /\b(vomit.{0,15}after coughing|post-tussive emesis|posttussive vomiting)\b/i, codes: ['E_166', 'E_203'] },
  { pattern: /\b(wheez(e|ing)|expiratory wheeze|bronchospasm)\b/i, codes: ['E_214'] },
  { pattern: /\b(stridor|high[- ]pitched sound when breathing in|inspiratory stridor|barking)\b/i, codes: ['E_194'] },
  { pattern: /\b(hoarse|hoarseness|dysphonia|muffled voice|voice.{0,10}deeper)\b/i, codes: ['E_212'] },
  { pattern: /\b(drooling|sialorrhea|excessive saliva)\b/i, codes: ['E_190'] },
  { pattern: /\b(dysphagia|odynophagia|difficulty swallowing|pain swallowing)\b/i, codes: ['E_65'] },
  { pattern: /\b(sore throat|pharyngitis|throat pain)\b/i, codes: ['E_97', 'E_53', 'E_55_@_V_148'] },
  { pattern: /\b(runny nose|rhinorrhea|nasal congestion|stuffy nose|coryza)\b/i, codes: ['E_181'] },
  { pattern: /\b(greenish|yellowish nasal|purulent nasal|purulent rhinorrhea)\b/i, codes: ['E_182', 'E_181'] },
  { pattern: /\b(anosmia|hyposmia|lost.{0,12}sense of smell|loss of smell)\b/i, codes: ['E_103'] },
  { pattern: /\b(itchy eyes|ocular pruritus|itching in one or both eyes)\b/i, codes: ['E_170'] },
  { pattern: /\b(itchy nose|itchy throat|palatal itch)\b/i, codes: ['E_169'] },
  { pattern: /\b(tearing|lacrimation|watery eyes|excessive tears)\b/i, codes: ['E_127'] },
  { pattern: /\b(red eye|conjunctivitis|ocular redness|uveitis)\b/i, codes: ['E_74'] },
  { pattern: /\b(ear pain|otalgia|earache)\b/i, codes: ['E_53', 'E_55_@_V_129', 'E_55_@_V_130'] },
  { pattern: /\b(heartburn|acid reflux|regurgitation|burning.{0,20}stomach.{0,20}throat|bitter taste)\b/i, codes: ['E_173', 'E_54_@_V_181', 'E_55_@_V_197'] },
  { pattern: /\b(worse after eating|postprandial)\b/i, codes: ['E_215'] },
  { pattern: /\b(hematemesis|thrown up blood|vomiting blood|coffee[- ]ground)\b/i, codes: ['E_210'] },
  { pattern: /\b(vomited several times|forceful retching|recurrent vomiting)\b/i, codes: ['E_211', 'E_148'] },
  { pattern: /\b(nausea|nauseous|feel like vomiting)\b/i, codes: ['E_148'] },
  { pattern: /\b(melena|black tarry stool|stools.{0,10}black)\b/i, codes: ['E_140'] },
  { pattern: /\b(hematochezia|bright red blood in stool|blood clots in stool)\b/i, codes: ['E_179'] },
  { pattern: /\b(diarrhea|loose stools|frequent stools)\b/i, codes: ['E_51'] },
  { pattern: /\b(pale stools|acholic|dark urine|obstructive jaundice)\b/i, codes: ['E_188'] },
  { pattern: /\b(groin pain|inguinal bulge|inguinal pain|scrotal swelling)\b/i, codes: ['E_53', 'E_55_@_V_16', 'E_55_@_V_17', 'E_221'] },
  { pattern: /\b(worse with coughing|lifting a weight|straining|valsalva)\b/i, codes: ['E_221'] },
  { pattern: /\b(ptosis|drooping eyelid|hard time opening.{0,15}eyelid)\b/i, codes: ['E_172'] },
  { pattern: /\b(diplopia|double vision|seeing two images)\b/i, codes: ['E_52'] },
  { pattern: /\b(dysarthria|slurred speech|difficulty articulating)\b/i, codes: ['E_63'] },
  { pattern: /\b(weakness.{0,20}fatigue|fatigable weakness)\b/i, codes: ['E_90', 'E_84'] },
  { pattern: /\b(weakness in both arms|symmetric limb weakness|ascending weakness|paraparesis|quadriparesis)\b/i, codes: ['E_84', 'E_176'] },
  { pattern: /\b(tingling in the feet|numbness in feet|stocking[- ]glove|acral paresthesia)\b/i, codes: ['E_93', 'E_157', 'E_177'] },
  { pattern: /\b(facial weakness|facial paralysis|facial palsy|bell's palsy)\b/i, codes: ['E_83', 'E_156'] },
  { pattern: /\b(trismus|lockjaw|unable to open mouth)\b/i, codes: ['E_205'] },
  { pattern: /\b(oculogyric|unable to control.{0,15}eyes|upward eye deviation)\b/i, codes: ['E_180'] },
  { pattern: /\b(torticollis|neck spasm|turning head)\b/i, codes: ['E_192', 'E_193'] },
  { pattern: /\b(tongue protrusion|keeping tongue in mouth)\b/i, codes: ['E_168'] },
  { pattern: /\b(antipsychotic|haloperidol|metoclopramide|neuroleptic)\b/i, codes: ['E_15', 'E_147'] },
  { pattern: /\b(panic|fear of dying|angor animi|about to die)\b/i, codes: ['E_111', 'E_75'] },
  { pattern: /\b(detached from.{0,15}body|derealization|depersonalization)\b/i, codes: ['E_171'] },
  { pattern: /\b(choking|suffocating)\b/i, codes: ['E_75'] },
  { pattern: /\b(cluster headache|orbital pain|temple pain|periorbital)\b/i, codes: ['E_53', 'E_55_@_V_125', 'E_55_@_V_166', 'E_54_@_V_191', 'E_127'] },
  { pattern: /\b(allergy exposure|ate peanuts|shellfish|bee sting|allergen|food allergy)\b/i, codes: ['E_42', 'E_12', 'E_226'] },
  { pattern: /\b(tuna|mackerel|mahimahi|dark[- ]fleshed fish|swiss cheese|scombroid)\b/i, codes: ['E_187', 'E_92'] },
  { pattern: /\b(flushing|cheeks suddenly turn red|facial flushing)\b/i, codes: ['E_92'] },
  { pattern: /\b(hives|urticaria|rash|skin lesions|erythematous rash)\b/i, codes: ['E_129', 'E_130_@_V_157'] },
  { pattern: /\b(swelling|angioedema|edema|swollen lips|swollen legs|ankle swelling|calf swelling)\b/i, codes: ['E_151'] },
  { pattern: /\b(pallor|pale skin|paler than usual|anemic)\b/i, codes: ['E_154'] },
  { pattern: /\b(heavy menstrual|menorrhagia)\b/i, codes: ['E_145'] },
  { pattern: /\b(fatigue|exhausted|tired|lethargy)\b/i, codes: ['E_89'] },
  { pattern: /\b(bedbound|stuck in bed|prostration)\b/i, codes: ['E_88', 'E_89'] },
  { pattern: /\b(myalgia|muscle aches|diffuse muscle pain|body aches)\b/i, codes: ['E_144'] },
  { pattern: /\b(lymph nodes|lymphadenopathy|swollen glands)\b/i, codes: ['E_9'] },
  { pattern: /\b(mouth ulcers|oral ulcers|aphthous|mucosal sores)\b/i, codes: ['E_206'] },
  { pattern: /\b(weight loss|unintentional weight loss|cachexia)\b/i, codes: ['E_162', 'E_174'] },
  { pattern: /\b(loss of appetite|anorexia|early satiety)\b/i, codes: ['E_161', 'E_32'] },
  { pattern: /\b(confusion|disoriented|altered mental status|delirium)\b/i, codes: ['E_39'] },
  { pattern: /\b(unusual bleeding|bruising|ecchymosis|hemorrhage|petechiae)\b/i, codes: ['E_178'] },
  { pattern: /\b(ebola contact|ebola)\b/i, codes: ['E_73'] },
  { pattern: /\b(dvt|deep vein thrombosis|immobility|recent surgery|active cancer)\b/i, codes: ['E_109', 'E_110', 'E_196', 'E_34'] },
  { pattern: /\b(smoking|smoker|cigarettes|pack-years)\b/i, codes: ['E_79'] },
  { pattern: /\b(copd|emphysema|chronic bronchitis)\b/i, codes: ['E_123'] },
  { pattern: /\b(asthma|bronchodilator|inhaler)\b/i, codes: ['E_124'] },
  { pattern: /\b(hypertension|high blood pressure|\bhtn\b)\b/i, codes: ['E_104'] },
  { pattern: /\b(diabetes|diabetic|\bdm2?\b)\b/i, codes: ['E_69'] },
  { pattern: /\b(high cholesterol|hyperlipidemia|dyslipidemia|\bhld\b)\b/i, codes: ['E_105'] },
  { pattern: /\b(heart failure|\bchf\b)\b/i, codes: ['E_106'] },
  { pattern: /\b(unprotected sex|hiv exposure|iv drug)\b/i, codes: ['E_115', 'E_189', 'E_61'] }
];

// Concise clinician-friendly labels for DDXPlus codes so UI chips read like an EHR chart
export const CLINICIAN_SHORT_LABELS = {
  E_91: 'Fever / pyrexia',
  E_94: 'Chills / rigors',
  E_50: 'Profuse diaphoresis',
  E_53: 'Localized pain',
  E_14: 'Chest pain at rest',
  E_13: 'Crescendo angina (<2 wks)',
  E_220: 'Pleuritic pain (worse w/ inspiration)',
  E_33: 'Relieved leaning forward',
  E_217: 'Orthopnea (worse supine)',
  E_67: 'Paroxysmal nocturnal dyspnea',
  E_218: 'Exertional chest pain',
  E_66: 'Dyspnea / shortness of breath',
  E_64: 'Dyspnea on minimal exertion',
  E_155: 'Palpitations / tachycardia',
  E_164: 'Irregularly irregular pulse',
  E_159: 'Syncope / loss of consciousness',
  E_82: 'Presyncope / lightheadedness',
  E_76: 'Vertigo / dizziness',
  E_201: 'Cough',
  E_77: 'Purulent sputum production',
  E_45: 'Hemoptysis (coughing blood)',
  E_203: 'Paroxysmal coughing fits',
  E_202: 'Inspiratory whoop',
  E_166: 'Post-tussive emesis',
  E_214: 'Expiratory wheezing',
  E_194: 'Inspiratory stridor',
  E_212: 'Hoarseness / dysphonia',
  E_190: 'Drooling / sialorrhea',
  E_65: 'Dysphagia / odynophagia',
  E_97: 'Sore throat / pharyngitis',
  E_181: 'Nasal congestion / rhinorrhea',
  E_182: 'Purulent nasal discharge',
  E_103: 'Anosmia / loss of smell',
  E_170: 'Bilateral ocular pruritus',
  E_169: 'Nasal / palatal pruritus',
  E_127: 'Ipsilateral lacrimation / tearing',
  E_74: 'Conjunctival injection / red eye',
  E_173: 'Heartburn / acid regurgitation',
  E_215: 'Postprandial worsening',
  E_210: 'Hematemesis (vomiting blood)',
  E_211: 'Forceful recurrent vomiting',
  E_148: 'Nausea',
  E_140: 'Melena (black tarry stools)',
  E_179: 'Hematochezia',
  E_51: 'Acute diarrhea',
  E_188: 'Acholic pale stools / dark urine',
  E_221: 'Pain worse w/ Valsalva / cough',
  E_172: 'Ptosis (eyelid drooping)',
  E_52: 'Binocular diplopia',
  E_63: 'Dysarthria / slurred speech',
  E_90: 'Fatigable muscle weakness',
  E_84: 'Symmetric limb weakness',
  E_93: 'Distal lower-extremity paresthesias',
  E_83: 'Facial nerve weakness / palsy',
  E_205: 'Trismus / lockjaw',
  E_180: 'Oculogyric crisis (upward gaze spasm)',
  E_192: 'Acute torticollis / neck spasm',
  E_168: 'Involuntary tongue protrusion',
  E_15: 'Recent neuroleptic / antipsychotic exposure',
  E_111: 'Sense of impending doom / panic',
  E_171: 'Depersonalization / derealization',
  E_75: 'Choking / suffocation sensation',
  E_42: 'Known allergen / food / sting exposure',
  E_187: 'Dark-fleshed fish ingestion (Scombroid)',
  E_92: 'Acute facial flushing',
  E_129: 'Diffuse rash / urticaria',
  E_151: 'Localized edema / limb or lip swelling',
  E_154: 'Skin / mucosal pallor',
  E_145: 'Heavy menstrual bleeding (menorrhagia)',
  E_89: 'Fatigue / lethargy',
  E_88: 'Severe prostration / bedbound',
  E_144: 'Diffuse myalgias',
  E_9: 'Lymphadenopathy',
  E_206: 'Oral mucosal ulcers',
  E_162: 'Unintentional weight loss',
  E_161: 'Anorexia / loss of appetite',
  E_39: 'Acute confusion / delirium',
  E_178: 'Unexplained bleeding / petechiae',
  E_73: 'Confirmed Filovirus / Ebola contact',
  E_109: 'Prior DVT / Pulmonary Embolism',
  E_110: 'Prolonged immobilization',
  E_196: 'Recent surgery (<4 weeks)',
  E_34: 'Active malignancy',
  E_79: 'Tobacco smoking history',
  E_123: 'History of COPD',
  E_124: 'History of Asthma',
  E_104: 'History of Hypertension',
  E_69: 'History of Diabetes Mellitus',
  E_105: 'History of Dyslipidemia',
  E_106: 'History of Heart Failure (CHF)',
  E_115: 'Unprotected sexual exposure'
};

export function getClinicianLabel(code) {
  const base = String(code || '').split('_@_')[0];
  return CLINICIAN_SHORT_LABELS[base] || EVIDENCES_CATALOG[base]?.label || base;
}

export function ageToBucket(age = 42) {
  const a = Number(age) || 42;
  if (a < 5) return 'infant';
  if (a < 18) return 'pediatric';
  if (a < 40) return 'young_adult';
  if (a < 65) return 'middle_aged';
  return 'geriatric';
}

/**
 * Normalize raw evidence array + pertinent negatives + free-text HPI narrative (with NegEx negation support).
 */
export function normalizePatientFeatures({
  evidences = [],
  presentCodes = [],
  absentEvidences = [],
  absentCodes = [],
  narrative = '',
  age = 45,
  sex = 'F'
} = {}) {
  const tokenSet = new Set();
  const absentBaseSet = new Set();

  const rawPresentList = [...(evidences || []), ...(presentCodes || [])];
  const rawAbsentList = [...(absentEvidences || []), ...(absentCodes || [])];

  for (const rawAbs of rawAbsentList) {
    const base = String(rawAbs || '').trim().split('_@_')[0];
    if (base && EVIDENCES_CATALOG[base]) {
      absentBaseSet.add(base);
    }
  }

  for (const rawEv of rawPresentList) {
    const ev = String(rawEv).trim();
    if (!ev || ev === 'E_204_@_V_10') continue;
    const base = ev.split('_@_')[0];
    if (absentBaseSet.has(base)) continue;
    tokenSet.add(base);
    if (ev.includes('_@_')) {
      const val = ev.split('_@_')[1];
      const meta = EVIDENCES_CATALOG[base];
      if (meta?.dataType === 'C' && /^\d+$/.test(val)) {
        const vInt = parseInt(val, 10);
        const bVal = vInt >= 7 ? 'high' : vInt >= 4 ? 'mod' : 'low';
        tokenSet.add(`${base}_@_${bVal}`);
      } else {
        tokenSet.add(ev);
      }
    }
  }

  // NegEx-aware clinical HPI narrative parser: separates affirmed findings from negated clauses ("denies fever, no hemoptysis")
  if (narrative && typeof narrative === 'string') {
    const clauses = narrative.split(/[.;\n]+|,\s*(?=(?:denies|no\b|without|negative for|ruled out|reports|complains|presents|with|has|also))/i);
    for (const clause of clauses) {
      const isNegatedClause = /\b(denies|denied|no\s+|without\s+|negative\s+for|ruled\s+out|absent|not\s+having)\b/i.test(clause);
      for (const rule of CLINICAL_SYNONYM_LEXICON) {
        if (rule.pattern.test(clause)) {
          for (const c of rule.codes) {
            const base = c.split('_@_')[0];
            if (isNegatedClause) {
              if (!tokenSet.has(base)) {
                absentBaseSet.add(base);
              }
            } else if (!absentBaseSet.has(base)) {
              tokenSet.add(base);
              if (c.includes('_@_')) tokenSet.add(c);
            }
          }
        }
      }
    }
  }

  const baseCodes = [...new Set([...tokenSet].map((t) => t.split('_@_')[0]))];
  const activeSymptoms = [];
  const activeAntecedents = [];
  const absentFindings = [];

  for (const code of baseCodes) {
    const meta = EVIDENCES_CATALOG[code];
    if (!meta) continue;
    const details = [...tokenSet]
      .filter((t) => t.startsWith(`${code}_@_` ))
      .map((t) => {
        const val = t.split('_@_')[1];
        return meta.values?.[val] || val;
      });
    const entry = {
      code,
      label: meta.label,
      clinicianLabel: getClinicianLabel(code),
      question: meta.question,
      informationContent: meta.informationContent,
      globalFrequency: meta.globalFrequency,
      details
    };
    if (meta.isAntecedent) {
      activeAntecedents.push(entry);
    } else {
      activeSymptoms.push(entry);
    }
  }

  for (const code of absentBaseSet) {
    const meta = EVIDENCES_CATALOG[code];
    if (!meta) continue;
    absentFindings.push({
      code,
      label: meta.label,
      clinicianLabel: getClinicianLabel(code),
      question: meta.question,
      informationContent: meta.informationContent,
      isAntecedent: meta.isAntecedent
    });
  }

  activeSymptoms.sort((a, b) => b.informationContent - a.informationContent);
  activeAntecedents.sort((a, b) => b.informationContent - a.informationContent);
  absentFindings.sort((a, b) => b.informationContent - a.informationContent);

  return {
    age: Number(age) || 45,
    ageBucket: ageToBucket(age),
    sex: String(sex || 'F').toUpperCase().startsWith('M') ? 'M' : 'F',
    featureTokens: [...tokenSet],
    baseCodes,
    absentCodes: [...absentBaseSet],
    activeSymptoms,
    activeAntecedents,
    absentFindings
  };
}

/**
 * Evaluate Validated Clinical Decision Rules (CDRs) & Emergency Severity Index (ESI v4) in deterministic code:
 * - Modified HEART Pathway (Six et al., 2008)
 * - Wells Pulmonary Embolism Criteria (Wells et al., 2000)
 * - CURB-65 Pneumonia Severity (Lim et al., 2003)
 * - Emergency Red Flag Triggers (ESI v4 Level 1 / Level 2)
 */
export function evaluateClinicalDecisionRules(normalized) {
  const bases = new Set(normalized.baseCodes);
  const tokens = new Set(normalized.featureTokens);
  const age = normalized.age;

  // 1. Modified HEART Pathway (0..7 bedside history + risk factor pre-troponin score)
  const hasChestPain = tokens.has('E_55_@_V_101') || tokens.has('E_55_@_V_29') || bases.has('E_14');
  const cvRiskCount = ['E_104', 'E_69', 'E_105', 'E_79', 'E_70', 'E_225', 'E_108'].filter((c) => bases.has(c)).length;
  let heartScore = 0;
  const heartCriteria = [];
  if (hasChestPain) {
    const highSuspicion = bases.has('E_14') || bases.has('E_50') || bases.has('E_13');
    heartScore += highSuspicion ? 2 : 1;
    heartCriteria.push(highSuspicion ? 'Highly suspicious angina (+2)' : 'Moderately suspicious chest pain (+1)');
  }
  if (age >= 65) {
    heartScore += 2;
    heartCriteria.push(`Age ≥ 65 (${age}y, +2)`);
  } else if (age >= 45) {
    heartScore += 1;
    heartCriteria.push(`Age 45–64 (${age}y, +1)`);
  }
  if (cvRiskCount >= 3 || bases.has('E_108')) {
    heartScore += 2;
    heartCriteria.push(`≥3 CV risk factors (${cvRiskCount}, +2)`);
  } else if (cvRiskCount >= 1) {
    heartScore += 1;
    heartCriteria.push(`${cvRiskCount} CV risk factor(s) (+1)`);
  }
  if (bases.has('E_50') || bases.has('E_218')) {
    heartScore += 1;
    heartCriteria.push('Autonomic diaphoresis / exertional component (+1)');
  }

  // 2. Wells Criteria for Pulmonary Embolism
  let wellsPeScore = 0;
  const wellsCriteria = [];
  if (bases.has('E_109') || bases.has('E_151')) {
    wellsPeScore += 3.0;
    wellsCriteria.push('Clinical DVT signs or prior DVT/PE (+3.0)');
  }
  if (bases.has('E_196') || bases.has('E_110')) {
    wellsPeScore += 1.5;
    wellsCriteria.push('Recent surgery or immobilization (+1.5)');
  }
  if (bases.has('E_45')) {
    wellsPeScore += 1.0;
    wellsCriteria.push('Hemoptysis (+1.0)');
  }
  if (bases.has('E_34')) {
    wellsPeScore += 1.0;
    wellsCriteria.push('Active malignancy (+1.0)');
  }
  if (bases.has('E_155')) {
    wellsPeScore += 1.5;
    wellsCriteria.push('Tachycardia / palpitations (+1.5)');
  }

  // 3. CURB-65 Pneumonia Severity
  let curb65Score = 0;
  const curbCriteria = [];
  if (bases.has('E_39')) {
    curb65Score += 1;
    curbCriteria.push('Confusion (+1)');
  }
  if (bases.has('E_66') || bases.has('E_64')) {
    curb65Score += 1;
    curbCriteria.push('Respiratory distress / tachypnea (+1)');
  }
  if (bases.has('E_82') || bases.has('E_159')) {
    curb65Score += 1;
    curbCriteria.push('Hemodynamic instability / syncope (+1)');
  }
  if (age >= 65) {
    curb65Score += 1;
    curbCriteria.push(`Age ≥ 65 (${age}y, +1)`);
  }

  // 4. Red Flag Life-Threatening Triggers (ESI Level 1 / Level 2)
  const redFlags = [];
  if (bases.has('E_194')) redFlags.push('Inspiratory stridor (acute upper airway obstruction risk)');
  if (bases.has('E_159')) redFlags.push('Syncope / loss of consciousness (hemodynamic or neurologic instability)');
  if (bases.has('E_210')) redFlags.push('Hematemesis (upper GI hemorrhage or Boerhaave esophageal rupture risk)');
  if (bases.has('E_45')) redFlags.push('Hemoptysis (pulmonary embolism, neoplasm, or cavitary infection risk)');
  if (bases.has('E_14') && bases.has('E_50')) redFlags.push('Rest chest pain with diaphoresis (STEMI / NSTEMI / ACS rule-out)');
  if (bases.has('E_84') && bases.has('E_66')) redFlags.push('Neuromuscular weakness with dyspnea (diaphragmatic / bulbar respiratory risk)');
  if (bases.has('E_42') && (bases.has('E_66') || bases.has('E_214') || bases.has('E_151'))) {
    redFlags.push('Allergen exposure with respiratory or angioedema compromise (Anaphylaxis)');
  }
  if (bases.has('E_39')) redFlags.push('Acute confusion / altered mental status');

  return {
    heartPathway: {
      score: heartScore,
      maxScore: 7,
      tier: heartScore >= 4 ? 'HIGH_RISK_ACS' : heartScore >= 2 ? 'MODERATE_RISK' : 'LOW_RISK',
      recommendation:
        heartScore >= 4
          ? 'High MACE risk — STAT ECG, serial 0h/1h hs-Troponin, telemetry & cardiology consult'
          : heartScore >= 2
            ? 'Moderate risk — Serial hs-Troponin & observation pathway'
            : 'Low pre-test ACS risk — Evaluate non-coronary causes if troponin/ECG negative',
      matchedCriteria: heartCriteria
    },
    wellsPe: {
      score: wellsPeScore,
      tier: wellsPeScore >= 4.5 ? 'PE_LIKELY' : wellsPeScore >= 2.0 ? 'MODERATE_PRETEST' : 'PE_UNLIKELY',
      recommendation:
        wellsPeScore >= 4.5
          ? 'PE Likely (>4 pts) — Proceed directly to CT Pulmonary Angiography (CTPA)'
          : wellsPeScore >= 2.0
            ? 'Moderate pretest probability — Order high-sensitivity age-adjusted D-dimer'
            : 'PE Unlikely — Apply PERC rule or D-dimer only if clinically indicated',
      matchedCriteria: wellsCriteria
    },
    curb65: {
      score: curb65Score,
      maxScore: 4,
      tier: curb65Score >= 3 ? 'SEVERE_INPATIENT_ICU' : curb65Score >= 2 ? 'INPATIENT_WARD' : 'OUTPATIENT_CANDIDATE',
      recommendation:
        curb65Score >= 3
          ? 'Severe CAP risk — Inpatient admission; consider ICU if respiratory/hemodynamic support needed'
          : curb65Score >= 2
            ? 'Moderate severity — Short-stay inpatient or supervised hospital observation'
            : 'Low mortality risk — Outpatient oral antimicrobial therapy if applicable',
      matchedCriteria: curbCriteria
    },
    redFlags,
    hasCriticalRedFlag: redFlags.length > 0
  };
}

/**
 * Score all 49 DDXPlus pathologies using 4 scientific methods + explicit Negative Likelihood Ratios (LR-) for Pertinent Negatives:
 * 1. QMR-DT Bipartite Bayesian Network + Absent-Core Penalty + Leakage Penalty (Shwe et al., 1991)
 * 2. Phrank Information-Content (IC) Weighted Phenotype Similarity (Jagadeesh et al., 2019)
 * 3. Bernoulli/Multinomial Naive Bayes (Fansi Tchango et al., NeurIPS 2022 baseline)
 * 4. Unweighted Symptom Jaccard Overlap
 */
export function scoreAllPathologies(normalized, options = {}) {
  const { featureTokens, baseCodes, absentCodes = [], ageBucket, sex } = normalized;
  const seenTokens = new Set(featureTokens);
  const seenBases = new Set(baseCodes);
  const deniedBases = new Set(absentCodes);
  const completeness = options.completeness ?? Math.min(1.0, Math.max(0.35, seenBases.size / 10));

  const rawRows = [];
  for (const cond of CONDITIONS_CATALOG) {
    const allowedBases = new Set([...cond.allowedSymptoms, ...cond.allowedAntecedents]);
    const matchedSignature = [];
    const missingSignature = [];
    const deniedSignature = [];

    // 1. Jaccard Overlap
    let interCount = 0;
    for (const b of seenBases) {
      if (allowedBases.has(b)) interCount += 1;
    }
    const unionCount = new Set([...seenBases, ...allowedBases]).size || 1;
    const jaccardScore = interCount / unionCount;

    // 2. Phrank Information Content (IC) Weighted Similarity
    let phrankIcScore = 0;
    let totalMatchedIc = 0;
    for (const tok of seenTokens) {
      const ic = DDXPLUS_KB.compoundFeatureIc[tok] ?? EVIDENCES_CATALOG[tok]?.informationContent ?? 2.0;
      const pFd = cond.featureProbs[tok] ?? 0;
      if (pFd > 0) {
        phrankIcScore += ic * pFd;
        if (!tok.includes('_@_')) totalMatchedIc += ic;
      }
    }

    // 3. Naive Bayes Log-Posterior (Prior + Demographic + Positive Evidence LRs)
    let logNb = Math.log(cond.prior || 1 / 49);
    logNb += Math.log(cond.ageDistribution?.[ageBucket] ?? 0.2);
    logNb += Math.log(cond.sexDistribution?.[sex] ?? 0.5);

    const floorProb = 0.00035;
    for (const tok of seenTokens) {
      const pFd = cond.featureProbs[tok] ?? floorProb;
      logNb += Math.log(pFd);
    }

    // 4. QMR-DT Full Score (Adds Impossible-Evidence Leakage Penalty + Explicit Pertinent Negative LR- + Absent-Core Penalty)
    let logQmr = logNb;
    let impossibleCount = 0;
    for (const b of seenBases) {
      if (!allowedBases.has(b)) {
        impossibleCount += 1;
        logQmr -= 1.8;
      }
    }

    // Apply explicit Pertinent Negatives (LR- = (1 - P(e|D)) / (1 - P(e|not D))) when clinician marks [- Denies]
    for (const negCode of deniedBases) {
      const pEd = cond.featureProbs[negCode] ?? 0;
      if (pEd > 0.05) {
        const pGlobal = Math.min(0.9, Math.max(0.01, EVIDENCES_CATALOG[negCode]?.globalFrequency ?? 0.08));
        const lrMinus = Math.max(0.04, (1.0 - Math.min(0.96, pEd)) / Math.max(0.1, 1.0 - pGlobal));
        logQmr += 1.35 * Math.log(lrMinus);
        phrankIcScore = Math.max(0, phrankIcScore - pEd * 1.2);
      }
    }

    // Check signature findings for display and pertinent negative / missing tracking
    for (const sig of cond.signatureFindings) {
      const enrichedSig = {
        ...sig,
        clinicianLabel: getClinicianLabel(sig.code)
      };
      if (seenBases.has(sig.code)) {
        matchedSignature.push(enrichedSig);
      } else if (deniedBases.has(sig.code)) {
        deniedSignature.push(enrichedSig);
      } else {
        missingSignature.push(enrichedSig);
      }
    }

    if (completeness >= 0.75) {
      for (const [fKey, pFd] of Object.entries(cond.featureProbs)) {
        if (!fKey.includes('_@_') && !seenTokens.has(fKey) && !deniedBases.has(fKey) && pFd > 0.35) {
          logQmr += Math.log(1.0 - Math.min(0.95, pFd));
        }
      }
    }

    rawRows.push({
      id: cond.id,
      name: cond.name,
      icd10: cond.icd10,
      ddxSeverity: cond.ddxSeverity,
      organSystem: cond.organSystem,
      organSystemLabel: cond.organSystemLabel,
      clinicalPearl: cond.clinicalPearl,
      jaccardScore: Number(jaccardScore.toFixed(4)),
      phrankIcScore: Number(phrankIcScore.toFixed(4)),
      totalMatchedIc: Number(totalMatchedIc.toFixed(2)),
      logNb: Number(logNb.toFixed(4)),
      logQmr: Number(logQmr.toFixed(4)),
      matchedBaseCount: interCount,
      impossibleCount,
      matchedSignature: matchedSignature.slice(0, 5),
      missingSignature: missingSignature.slice(0, 4),
      deniedSignature: deniedSignature.slice(0, 4)
    });
  }

  // Calibrated Softmax over QMR-DT Log-Odds (with temperature scaling tau = 2.4 for well-calibrated differential)
  const tau = 2.4;
  const maxLogQmr = Math.max(...rawRows.map((r) => r.logQmr));
  const exps = rawRows.map((r) => Math.exp((r.logQmr - maxLogQmr) / tau));
  const sumExp = exps.reduce((a, b) => a + b, 0) || 1;

  rawRows.forEach((r, idx) => {
    r.bayesianPosterior = Number((exps[idx] / sumExp).toFixed(4));
  });

  // Compute Organ System Family posteriors by summing member pathology posteriors
  const organPosteriors = {};
  for (const sysKey of Object.keys(ORGAN_SYSTEM_FAMILIES)) {
    organPosteriors[sysKey] = 0;
  }
  for (const r of rawRows) {
    organPosteriors[r.organSystem] = Number(((organPosteriors[r.organSystem] || 0) + r.bayesianPosterior).toFixed(4));
  }

  rawRows.forEach((r) => {
    r.organSystemProbability = Number((organPosteriors[r.organSystem] || 0.05).toFixed(4));
    r.hierarchicalBeamScore = Number(Math.sqrt(Math.max(0, r.bayesianPosterior * r.organSystemProbability)).toFixed(4));
  });

  const rankedByQmr = [...rawRows].sort((a, b) => b.logQmr - a.logQmr);

  // Compute Sequential Value of Information (VOI / Expected Entropy Reduction) for unasked symptoms
  const topCandidates = rankedByQmr.slice(0, 6);
  const topNormSum = topCandidates.reduce((s, c) => s + c.bayesianPosterior, 0) || 1;
  const topProbs = topCandidates.map((c) => c.bayesianPosterior / topNormSum);
  const currentEntropy = -topProbs.reduce((s, p) => (p > 1e-6 ? s + p * Math.log2(p) : s), 0);

  const candidateNextQuestions = [];
  const candidateCodes = new Set();
  for (const c of topCandidates) {
    const condObj = CONDITION_BY_ID.get(c.id);
    for (const sCode of condObj?.allowedSymptoms || []) {
      if (!seenBases.has(sCode) && !deniedBases.has(sCode) && sCode !== 'E_53' && sCode !== 'E_55') {
        candidateCodes.add(sCode);
      }
    }
  }

  for (const code of candidateCodes) {
    const evMeta = EVIDENCES_CATALOG[code];
    if (!evMeta) continue;
    const pYesGivenD = topCandidates.map((c) => {
      const condObj = CONDITION_BY_ID.get(c.id);
      return Math.min(0.95, Math.max(0.03, condObj?.featureProbs?.[code] ?? 0.03));
    });
    const pYes = topProbs.reduce((s, p, i) => s + p * pYesGivenD[i], 0);
    const pNo = 1 - pYes;
    if (pYes < 0.04 || pNo < 0.04) continue;

    const postYes = topProbs.map((p, i) => (p * pYesGivenD[i]) / pYes);
    const postNo = topProbs.map((p, i) => (p * (1 - pYesGivenD[i])) / pNo);
    const hYes = -postYes.reduce((s, p) => (p > 1e-6 ? s + p * Math.log2(p) : s), 0);
    const hNo = -postNo.reduce((s, p) => (p > 1e-6 ? s + p * Math.log2(p) : s), 0);
    const infoGainBits = Math.max(0, currentEntropy - (pYes * hYes + pNo * hNo));

    let maxP = -1;
    let targetDisease = topCandidates[0]?.name || '';
    topCandidates.forEach((c, i) => {
      if (pYesGivenD[i] > maxP) {
        maxP = pYesGivenD[i];
        targetDisease = c.name;
      }
    });

    candidateNextQuestions.push({
      code,
      label: evMeta.label,
      clinicianLabel: getClinicianLabel(code),
      question: evMeta.question,
      informationGainBits: Number(infoGainBits.toFixed(4)),
      informationContent: evMeta.informationContent,
      discriminatesFor: targetDisease,
      sensitivityInTarget: Number(maxP.toFixed(2))
    });
  }

  candidateNextQuestions.sort((a, b) => b.informationGainBits - a.informationGainBits);

  return {
    rankedByQmr,
    shortlistTop12: rankedByQmr.slice(0, 12),
    organPosteriors,
    currentEntropyBits: Number(currentEntropy.toFixed(3)),
    nextBestQuestions: candidateNextQuestions.slice(0, 6)
  };
}

/**
 * Full deterministic clinical telemetry extraction from a patient encounter or symptom selection.
 */
export function analyzePatientEncounter(input = {}) {
  const normalized = normalizePatientFeatures(input);
  const cdrs = evaluateClinicalDecisionRules(normalized);
  const scoring = scoreAllPathologies(normalized, { completeness: input.completeness });
  const topWinner = scoring.shortlistTop12[0];

  // Determine ESI Triage Acuity Level (1..5)
  let esiLevel = 4;
  if (topWinner.ddxSeverity === 1 || (cdrs.hasCriticalRedFlag && topWinner.ddxSeverity <= 2)) {
    esiLevel = 1;
  } else if (topWinner.ddxSeverity === 2 || cdrs.hasCriticalRedFlag || cdrs.heartPathway.score >= 4 || cdrs.wellsPe.score >= 4.5) {
    esiLevel = 2;
  } else if (topWinner.ddxSeverity === 3 || cdrs.curb65.score >= 2) {
    esiLevel = 3;
  } else if (topWinner.ddxSeverity === 4) {
    esiLevel = 4;
  } else {
    esiLevel = 5;
  }

  return {
    patientDemographics: {
      age: normalized.age,
      ageBucket: normalized.ageBucket,
      sex: normalized.sex
    },
    evidenceSummary: {
      totalEvidenceTokens: normalized.featureTokens.length,
      distinctBaseEvidences: normalized.baseCodes.length,
      activeSymptomCount: normalized.activeSymptoms.length,
      activeAntecedentCount: normalized.activeAntecedents.length,
      absentFindingCount: normalized.absentFindings.length,
      topInformationContentFindings: normalized.activeSymptoms.slice(0, 8),
      activeAntecedents: normalized.activeAntecedents.slice(0, 6),
      absentFindings: normalized.absentFindings.slice(0, 8)
    },
    clinicalDecisionRules: {
      ...cdrs,
      estimatedEsiLevel: esiLevel
    },
    organSystemPosteriors: scoring.organPosteriors,
    differentialShortlist: scoring.shortlistTop12,
    allPathologyScores: scoring.rankedByQmr,
    activeInquiry: {
      differentialEntropyBits: scoring.currentEntropyBits,
      nextBestQuestions: scoring.nextBestQuestions
    }
  };
}

export function matchSymptoms(input = {}) {
  const res = analyzePatientEncounter(input);
  return {
    ...res,
    topPrediction: {
      ...res.differentialShortlist[0],
      probability: res.differentialShortlist[0]?.bayesianPosterior ?? 0
    },
    cdr: {
      heart: res.clinicalDecisionRules.heartPathway,
      wellsPE: res.clinicalDecisionRules.wellsPe,
      curb65: res.clinicalDecisionRules.curb65,
      esiLevel: res.clinicalDecisionRules.estimatedEsiLevel,
      redFlags: res.clinicalDecisionRules.redFlags
    },
    activeInquiry: res.activeInquiry.nextBestQuestions
  };
}

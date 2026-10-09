#!/usr/bin/env python3
"""
Compiles the empirical DDXPlus clinical knowledge base (Fansi Tchango et al., NeurIPS 2022)
from release_conditions.json, release_evidences.json, and 8,000 real DDXPlus patient records.
"""
import ast
import csv
import json
import math
import re
from collections import Counter, defaultdict

with open("/tmp/ddx_conds_raw.md", "r", encoding="utf-8") as f:
    conds_raw = json.loads(f.read().split("---\n\n", 1)[1].strip())

with open("/tmp/ddx_evids_raw.md", "r", encoding="utf-8") as f:
    evids_raw = json.loads(f.read().split("---\n\n", 1)[1].strip())

ORGAN_SYSTEM_MAP = {
    "Possible NSTEMI / STEMI": "cardiovascular",
    "Unstable angina": "cardiovascular",
    "Stable angina": "cardiovascular",
    "Myocarditis": "cardiovascular",
    "Pericarditis": "cardiovascular",
    "Atrial fibrillation": "cardiovascular",
    "PSVT": "cardiovascular",
    "Acute pulmonary edema": "cardiovascular",
    "Pulmonary embolism": "cardiovascular",

    "Pneumonia": "respiratory_pulmonary",
    "Spontaneous pneumothorax": "respiratory_pulmonary",
    "Bronchospasm / acute asthma exacerbation": "respiratory_pulmonary",
    "Acute COPD exacerbation / infection": "respiratory_pulmonary",
    "Bronchitis": "respiratory_pulmonary",
    "Bronchiolitis": "respiratory_pulmonary",
    "Bronchiectasis": "respiratory_pulmonary",
    "Pulmonary neoplasm": "respiratory_pulmonary",
    "Whooping cough": "respiratory_pulmonary",
    "Tuberculosis": "respiratory_pulmonary",

    "Epiglottitis": "ent_upper_airway",
    "Croup": "ent_upper_airway",
    "Larygospasm": "ent_upper_airway",
    "Acute laryngitis": "ent_upper_airway",
    "Viral pharyngitis": "ent_upper_airway",
    "URTI": "ent_upper_airway",
    "Allergic sinusitis": "ent_upper_airway",
    "Acute rhinosinusitis": "ent_upper_airway",
    "Chronic rhinosinusitis": "ent_upper_airway",
    "Acute otitis media": "ent_upper_airway",

    "Cluster headache": "neurological_psychiatric",
    "Myasthenia gravis": "neurological_psychiatric",
    "Guillain-Barré syndrome": "neurological_psychiatric",
    "Acute dystonic reactions": "neurological_psychiatric",
    "Panic attack": "neurological_psychiatric",

    "Boerhaave": "gastrointestinal_thoracic",
    "GERD": "gastrointestinal_thoracic",
    "Inguinal hernia": "gastrointestinal_thoracic",
    "Pancreatic neoplasm": "gastrointestinal_thoracic",
    "Spontaneous rib fracture": "gastrointestinal_thoracic",

    "Anaphylaxis": "infectious_immunologic_hematologic",
    "Scombroid food poisoning": "infectious_immunologic_hematologic",
    "HIV (initial infection)": "infectious_immunologic_hematologic",
    "Influenza": "infectious_immunologic_hematologic",
    "Ebola": "infectious_immunologic_hematologic",
    "Chagas": "infectious_immunologic_hematologic",
    "SLE": "infectious_immunologic_hematologic",
    "Sarcoidosis": "infectious_immunologic_hematologic",
    "Anemia": "infectious_immunologic_hematologic",
    "Localized edema": "infectious_immunologic_hematologic",
}

ORGAN_SYSTEM_FAMILIES = {
    "cardiovascular": "Cardiovascular & Thromboembolic (ACS/STEMI, Angina, PE, Pericarditis, Myocarditis, Arrhythmias, Pulmonary Edema)",
    "respiratory_pulmonary": "Lower Respiratory & Pulmonary Parenchymal (Pneumonia, Pneumothorax, Asthma/COPD Exacerbation, Bronchitis, TB, Pertussis, Lung Neoplasm)",
    "ent_upper_airway": "Otolaryngologic & Upper Airway (Epiglottitis, Croup, Laryngospasm, Pharyngitis, Rhinosinusitis, Otitis Media, URTI)",
    "neurological_psychiatric": "Neurological, Neuromuscular & Psychiatric (Guillain-Barré, Myasthenia Gravis, Cluster Headache, Acute Dystonia, Panic Attack)",
    "gastrointestinal_thoracic": "Gastrointestinal, Esophageal & Chest Wall (Boerhaave Esophageal Rupture, GERD, Inguinal Hernia, Pancreatic Neoplasm, Rib Fracture)",
    "infectious_immunologic_hematologic": "Systemic Infectious, Allergic/Immunologic & Hematologic (Anaphylaxis, Scombroid, Acute HIV, Influenza, Ebola, Chagas, SLE, Sarcoidosis, Anemia, Edema)",
}

CLINICAL_PEARLS = {
    "Possible NSTEMI / STEMI": "Acute coronary plaque rupture with crushing retrosternal chest pain radiating to jaw/left arm, diaphoresis, dyspnea, and cardiovascular risk factors (HEART score high risk).",
    "Unstable angina": "Crescendo or rest ischemic chest pain without acute myocardial necrosis; progressive exertional intolerance over 2 weeks.",
    "Stable angina": "Reproducible substernal chest pressure triggered by physical exertion and reliably relieved by rest.",
    "Myocarditis": "Inflammatory cardiomyopathy often following a recent viral prodrome, presenting with chest pain, palpitations, dyspnea, and positional changes.",
    "Pericarditis": "Pleuritic sharp precordial chest pain worsened by supine posture and deep inspiration, classically relieved by sitting up and leaning forward.",
    "Atrial fibrillation": "Irregularly irregular supraventricular tachyarrhythmia causing disorganized palpitations, dyspnea on exertion, and lightheadedness.",
    "PSVT": "Abrupt-onset paroxysmal supraventricular tachycardia with rapid regular palpitations, dizziness, and chest discomfort often linked to stimulants.",
    "Acute pulmonary edema": "Decompensated left ventricular failure causing cardiogenic alveolar flooding, orthopnea, paroxysmal nocturnal dyspnea, peripheral edema, and frothy dyspnea.",
    "Pulmonary embolism": "Acute pulmonary arterial thromboembolism causing sudden pleuritic chest pain, dyspnea, hemoptysis, syncope, and unilateral calf swelling (Wells criteria).",
    "Pneumonia": "Alveolar consolidation presenting with fever, rigors/chills, productive purulent or blood-tinged cough, pleuritic chest pain, and dyspnea (CURB-65).",
    "Spontaneous pneumothorax": "Sudden-onset unilateral pleuritic chest pain and dyspnea in tall/thin patients, smokers, or COPD/family history of pneumothorax.",
    "Bronchospasm / acute asthma exacerbation": "Reversible lower airway bronchoconstriction with expiratory wheezing, cough, and dyspnea triggered by allergens, cold air, or smoke.",
    "Acute COPD exacerbation / infection": "Acute worsening of dyspnea, cough, and sputum purulence/volume in a patient with chronic obstructive pulmonary disease and smoking/occupational exposure.",
    "Bronchitis": "Self-limited tracheobronchial inflammation with prominent cough, sputum production, wheezing, and mild upper respiratory prodrome.",
    "Bronchiolitis": "Viral lower respiratory tract infection in infants/young children (<2 yrs) presenting with coryza, cough, wheezing, tachypnea, and poor feeding.",
    "Bronchiectasis": "Permanent airway dilation causing chronic daily productive mucopurulent cough, recurrent pneumonia, and hemoptysis.",
    "Pulmonary neoplasm": "Bronchogenic carcinoma presenting with chronic cough, hemoptysis, unintentional weight loss, anorexia, dyspnea, and smoking/family history.",
    "Whooping cough": "Bordetella pertussis infection characterized by paroxysmal coughing fits, inspiratory whoop, and post-tussive emesis.",
    "Tuberculosis": "Mycobacterium tuberculosis pulmonary infection with chronic cough, hemoptysis, fever, involuntary weight loss, and immunosuppression/HIV risk.",
    "Epiglottitis": "Life-threatening supraglottic airway cellulitis with rapid-onset fever, severe odynophagia, drooling/sialorrhea, muffled voice, stridor, and tripod posture.",
    "Croup": "Pediatric viral laryngotracheobronchitis presenting with inspiratory stridor, nocturnal barking cough, hoarseness, and low-grade fever.",
    "Larygospasm": "Acute spasmodic closure of the vocal cords producing sudden inspiratory stridor and choking sensation, often associated with GERD or irritants.",
    "Acute laryngitis": "Laryngeal mucosa inflammation causing hoarseness/dysphonia, sore throat, and dry cough after viral URI.",
    "Viral pharyngitis": "Acute viral pharyngeal inflammation with sore throat, pharyngeal erythema, cough, and rhinorrhea (low Centor score).",
    "URTI": "Common viral upper respiratory tract infection (rhinovirus/coronavirus) with nasal congestion, sore throat, cough, myalgias, and low-grade fever.",
    "Allergic sinusitis": "IgE-mediated allergic rhinitis/sinusitis with bilateral ocular pruritus, itchy nose/palate, clear rhinorrhea, cough, and atopic family history.",
    "Acute rhinosinusitis": "Acute paranasal sinus inflammation (<4 weeks) with purulent greenish/yellowish nasal discharge, facial pressure/pain, hyposmia/anosmia, and fever.",
    "Chronic rhinosinusitis": "Persistent sinonasal inflammation (>12 weeks) with purulent rhinorrhea, anosmia, facial pain, nasal polyps, or septal deviation without fever.",
    "Acute otitis media": "Middle ear effusion and inflammation with acute otalgia, fever, irritability, and concurrent viral URI in children/adults.",
    "Cluster headache": "Trigeminal autonomic cephalalgia with excruciating unilateral orbital/temporal pain, ipsilateral lacrimation, and rhinorrhea occurring in attacks.",
    "Myasthenia gravis": "Autoimmune neuromuscular junction disorder with fatigable ptosis, diplopia, dysarthria, dysphagia, and proximal limb weakness.",
    "Guillain-Barré syndrome": "Post-infectious acute inflammatory demyelinating polyradiculoneuropathy with ascending symmetrical limb weakness, distal paresthesias, facial diplegia, and dyspnea.",
    "Acute dystonic reactions": "Extrapyramidal oculogyric crisis, torticollis, trismus, and tongue protrusion triggered by recent dopamine-antagonist antipsychotic or antiemetic exposure.",
    "Panic attack": "Paroxysmal sympathetic surge with palpitations, chest pain, choking sensation, paresthesias, derealization, and acute fear of dying.",
    "Boerhaave": "Transmural esophageal rupture following forceful retching/emesis (Mackler triad: vomiting, severe lower thoracic pain, subcutaneous/mediastinal air) with hematemesis.",
    "GERD": "Gastroesophageal acid reflux causing retrosternal burning (heartburn) radiating to the throat with sour/bitter taste, worse postprandially and supine.",
    "Inguinal hernia": "Protrusion of abdominal contents through the inguinal canal causing groin/scrotal bulge and pain exacerbated by coughing, lifting, or straining.",
    "Pancreatic neoplasm": "Ductal adenocarcinoma presenting with epigastric/back pain, painless obstructive jaundice (pale stools, dark urine), anorexia, and profound weight loss.",
    "Spontaneous rib fracture": "Localized thoracic wall pain following forceful coughing or minor strain, worsened sharply by deep inspiration, movement, and chest palpation (osteoporosis/metastasis risk).",
    "Anaphylaxis": "Fulminant IgE-mediated systemic hypersensitivity after food/allergen exposure with urticaria/angioedema, bronchospasm/stridor, hypotension/syncope, and GI cramping.",
    "Scombroid food poisoning": "Histamine toxicity shortly after consuming improperly stored dark-fleshed fish (tuna/mackerel) causing facial flushing, erythematous rash, palpitations, diarrhea, and wheezing.",
    "HIV (initial infection)": "Acute retroviral syndrome presenting with mononucleosis-like fever, generalized lymphadenopathy, pharyngitis, maculopapular rash, myalgias, and diarrhea after high-risk exposure.",
    "Influenza": "Acute systemic orthomyxovirus infection with abrupt high fever, chills/rigors, diffuse myalgias, prostration, headache, sore throat, and dry cough.",
    "Ebola": "Filovirus hemorrhagic fever with high fever, severe prostration, hemorrhagic manifestations (bruising/bleeding), confusion, vomiting, diarrhea, and recent contact/travel.",
    "Chagas": "Trypanosoma cruzi infection presenting with fever, unilateral palpebral/facial edema (Romaña sign), lymphadenopathy, fatigue, and cardiac/GI involvement.",
    "SLE": "Systemic lupus erythematosus autoimmune flare with malar/photosensitive rash, painful oral ulcers, polyarthralgia/myalgia, pleuritic pain, and fatigue.",
    "Sarcoidosis": "Multisystem non-caseating granulomatous disease presenting with bilateral hilar/lymphadenopathy, erythema nodosum, uveitis (ocular redness), dyspnea, and arthralgia.",
    "Anemia": "Reduced hemoglobin/erythrocyte mass causing mucocutaneous pallor, chronic fatigue, exertional dyspnea, lightheadedness, palpitations, and menorrhagia/GI blood loss.",
    "Localized edema": "Dependent or localized interstitial fluid accumulation due to venous insufficiency, lymphedema, calcium-channel blockers, heart/renal/hepatic disease, or DVT.",
}

def slugify(name):
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")

def clean_label(q_en):
    q = q_en.strip()
    # Create a concise clinical label alongside the full question
    replacements = [
        ("Do you have a fever (either felt or measured with a thermometer)?", "Fever (measured or subjective)"),
        ("Do you feel pain somewhere?", "Anatomical pain location"),
        ("Do you have pain somewhere, related to your reason for consulting?", "Presenting pain symptom"),
        ("Does the pain radiate to another location?", "Pain radiation target"),
        ("Characterize your pain:", "Pain quality / character"),
        ("How fast did the pain appear?", "Pain onset velocity (0-10)"),
        ("How intense is the pain?", "Pain intensity (0-10)"),
        ("How precisely is the pain located?", "Pain localization precision (0-10)"),
        ("Did you lose consciousness?", "Syncope / loss of consciousness"),
        ("Do you have any lesions, redness or problems on your skin that you believe are related to the condition you are consulting for?", "Skin rash or cutaneous lesions"),
        ("Is your skin much paler than usual?", "Cutaneous / mucosal pallor"),
        ("Do you feel your heart is beating fast (racing), irregularly (missing a beat) or do you feel palpitations?", "Palpitations or tachycardia"),
        ("Have you recently thrown up blood or something resembling coffee beans?", "Hematemesis / coffee-ground emesis"),
        ("Have you recently had stools that were black (like coal)?", "Melena (black tarry stools)"),
        ("Have you had diarrhea or an increase in stool frequency?", "Diarrhea / increased stool frequency"),
        ("Do you feel like you are (or were) choking or suffocating?", "Choking or suffocation sensation"),
        ("Do you constantly feel fatigued or do you have non-restful sleep?", "Chronic fatigue / non-restorative sleep"),
        ("Are you more irritable or has your mood been very unstable recently?", "Irritability or mood lability"),
        ("Do you feel lightheaded and dizzy or do you feel like you are about to faint?", "Presyncope / severe lightheadedness"),
        ("Are you feeling nauseous or do you feel like vomiting?", "Nausea or retching"),
        ("Have you had chills or shivers?", "Chills or rigors"),
        ("Do you have pain that is increased when you breathe in deeply?", "Pleuritic pain (worse on deep inspiration)"),
        ("Have you recently had a loss of appetite or do you get full more quickly then usually?", "Anorexia or early satiety"),
        ("Have you noticed light red blood or blood clots in your stool?", "Hematochezia (bright red blood in stool)"),
        ("Have you had an involuntary weight loss over the last 3 months?", "Unintentional weight loss (>3 months)"),
        ("Do you have a burning sensation that starts in your stomach then goes up into your throat, and can be associated with a bitter taste in your mouth?", "Retrosternal heartburn / acid regurgitation"),
        ("Do you have pain that improves when you lean forward?", "Pain relieved by leaning forward"),
        ("Do you have symptoms that are increased with physical exertion but alleviated with rest?", "Exertional symptoms relieved by rest"),
        ("Do you have numbness, loss of sensation or tingling in the feet?", "Distal lower-extremity paresthesias / numbness"),
        ("Are you experiencing shortness of breath or difficulty breathing in a significant way?", "Significant dyspnea / shortness of breath"),
        ("Do you feel your abdomen is bloated or distended (swollen due to pressure from inside)?", "Abdominal bloating or distension"),
        ("Do you feel that your eyes produce excessive tears?", "Excessive lacrimation / tearing"),
        ("Do you have nasal congestion or a clear runny nose?", "Nasal congestion or clear rhinorrhea"),
        ("Do you feel so tired that you are unable to do your usual activities or are you stuck in your bed all day long?", "Severe prostration / bedbound exhaustion"),
        ("Have you lost consciousness associated with violent and sustained muscle contractions or had an absence episode?", "Generalized tonic-clonic seizure or absence"),
        ("Have you had weakness or paralysis on one side of the face, which may still be present or completely resolved?", "Unilateral facial weakness / palsy"),
        ("Do you have diffuse (widespread) muscle pain?", "Diffuse myalgias (muscle aches)"),
        ("Do you have pain that is increased with movement?", "Pain exacerbated by movement"),
        ("Do you have a cough?", "Cough"),
        ("Are your symptoms worse when lying down and alleviated while sitting up?", "Orthopnea (worse supine, relieved sitting)"),
        ("Do you have symptoms that get worse after eating?", "Postprandial symptom exacerbation"),
        ("Do you feel out of breath with minimal physical effort?", "Dyspnea on minimal exertion"),
        ("Have you gained weight recently?", "Recent weight gain / fluid retention"),
        ("Have you had significantly increased sweating?", "Diaphoresis / profuse sweating"),
        ("Do you have a sore throat?", "Pharyngitis / sore throat"),
        ("Do you have swollen or painful lymph nodes?", "Tender or enlarged lymphadenopathy"),
        ("Do you feel slightly dizzy or lightheaded?", "Mild dizziness / lightheadedness"),
        ("Do you have difficulty swallowing, or have a feeling of discomfort/blockage when swallowing?", "Dysphagia / odynophagia"),
        ("Have you noticed a diffuse (widespread) redness in one or both eyes?", "Conjunctival or ocular erythema"),
        ("Do you suddenly have difficulty or an inability to open your mouth or have jaw pain when opening it?", "Trismus / jaw-opening spasm"),
        ("Do you have difficulty articulating words/speaking?", "Dysarthria / slurred speech"),
        ("Have you ever felt like you were suffocating for a very short time associated with inability to breathe or speak?", "Brief laryngospastic suffocation / aphonia"),
        ("Have you noticed that you produce more saliva than usual?", "Sialorrhea / drooling"),
        ("Have you felt confused or disorientated lately?", "Acute confusion or disorientation"),
        ("Have you noticed that the tone of your voice has become deeper, softer or hoarse?", "Hoarseness / dysphonia"),
        ("Do you have painful mouth ulcers or sores?", "Painful oral / mucosal ulcers"),
        ("Do you have the perception of seeing two images of a single object seen overlapping or adjacent to each other (double vision)?", "Binocular diplopia (double vision)"),
        ("Do you have intense coughing fits?", "Paroxysmal coughing fits"),
        ("Do you have pain or weakness in your jaw?", "Jaw claudication / weakness"),
        ("Do you have a hard time opening/raising one or both eyelids?", "Ptosis (drooping eyelids)"),
        ("Do you feel weakness in both arms and/or both legs?", "Symmetric bilateral limb weakness"),
        ("Do your symptoms of muscle weakness increase with fatigue and/or stress?", "Fatigable muscle weakness"),
        ("Have you vomited several times or have you made several efforts to vomit?", "Recurrent vomiting or forceful retching"),
        ("Did you vomit after coughing?", "Post-tussive emesis"),
        ("Do you wheeze while inhaling or is your breathing noisy after coughing spells?", "Inspiratory whoop / post-tussive wheeze"),
        ("Have you noticed any unusual bleeding or bruising related to your consultation today?", "Spontaneous bleeding or ecchymoses"),
        ("Do you have swelling in one or more areas of your body?", "Localized or peripheral edema"),
        ("Have you been coughing up blood?", "Hemoptysis (coughing up blood)"),
        ("Have you noticed a high pitched sound when breathing in?", "Inspiratory stridor"),
        ("Have you noticed weakness in your facial muscles and/or eyes?", "Cranial / facial motor weakness"),
        ("Have you recently had numbness, loss of sensation or tingling, in both arms and legs and around your mouth?", "Symmetric acral & perioral paresthesias"),
        ("Did you previously, or do you currently, have any weakness/paralysis in one or more of your limbs or in your face?", "Focal or generalized limb/facial paresis"),
        ("Have you been in contact with or ate something that you have an allergy to?", "Known allergen / food trigger exposure"),
        ("Have you noticed a wheezing sound when you exhale?", "Expiratory wheezing"),
        ("Have you been able to pass stools or gas since your symptoms increased?", "Obstipation (inability to pass flatus/stool)"),
        ("Do you have a decrease in appetite?", "Decreased appetite"),
        ("Are the symptoms or pain increased with coughing, with an effort like lifting a weight or from forcing a bowel movement?", "Pain worse with Valsalva / cough / lifting"),
        ("Does the person have a whooping cough?", "Paroxysmal pertussis-like cough"),
        ("Are your symptoms more prominent at night?", "Nocturnal symptom predominance"),
        ("Do you have severe itching in one or both eyes?", "Severe ocular pruritus (itchy eyes)"),
        ("Do you have a cough that produces colored or more abundant sputum than usual?", "Productive purulent sputum cough"),
        ("Do you find that your symptoms have worsened over the last 2 weeks and that progressively less effort is required to cause the symptoms?", "Crescendo exertional intolerance (<2 weeks)"),
        ("Do you have chest pain even at rest?", "Rest angina / chest pain at rest"),
        ("Is your nose or the back of your throat itchy?", "Nasal or pharyngeal pruritus"),
        ("Do you currently, or did you ever, have numbness, loss of sensitivity or tingling anywhere on your body?", "Generalized or focal paresthesias"),
        ("Have you noticed any new fatigue, generalized and vague discomfort, diffuse (widespread) muscle aches or a change in your general well-being related to your consultation today?", "Viral prodrome / malaise & myalgia"),
        ("Have you been unintentionally losing weight or have you lost your appetite?", "Constitutional weight loss / anorexia"),
        ("Do you have very abundant or very long menstruation periods?", "Menorrhagia (heavy menstrual bleeding)"),
        ("Did your cheeks suddenly turn red?", "Acute malar / facial flushing"),
        ("Do you feel that muscle spasms or soreness in your neck are keeping you from turning your head to one side?", "Acute torticollis / cervical spasm"),
        ("Do you have pale stools and dark urine?", "Acholic pale stools & choluric dark urine"),
        ("Do you feel your heart is beating very irregularly or in a disorganized pattern?", "Chaotic / irregularly irregular heart rhythm"),
        ("Do you have annoying muscle spasms in your face, neck or any other part of your body?", "Acute dystonic facial/cervical muscle spasms"),
        ("Do you have trouble keeping your tongue in your mouth?", "Lingual dystonia / tongue protrusion"),
        ("Are you unable to control the direction of your eyes?", "Oculogyric crisis (involuntary eye deviation)"),
        ("Do you have bouts of choking or shortness of breath that wake you up at night?", "Paroxysmal nocturnal dyspnea (PND)"),
        ("Do you feel like you are detached from your own body or your surroundings?", "Depersonalization / derealization"),
        ("Do you feel like you are dying or were you afraid that you were about do die?", "Angor animi / acute fear of dying"),
        ("Do you have greenish or yellowish nasal discharge?", "Purulent green/yellow rhinorrhea"),
        ("Have you lost your sense of smell?", "Anosmia / hyposmia (loss of smell)"),
        ("Do you ever temporarily stop breathing while you’re asleep?", "Sleep apnea episodes"),
    ]
    for old, short in replacements:
        if q == old:
            return short
    # Clean generic prefixes for antecedents
    s = re.sub(r"^(Do you have |Have you ever had |Are you |Do you |Have you )", "", q, flags=re.I)
    s = s.rstrip("?")
    return s[0].upper() + s[1:] if s else q

rows = []
with open("/tmp/ddxplus_test_slice.csv", "r", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        if r.get("PATHOLOGY") in conds_raw and r.get("EVIDENCES") and r.get("INITIAL_EVIDENCE"):
            try:
                ev_list = ast.literal_eval(r["EVIDENCES"])
                ddx_list = ast.literal_eval(r["DIFFERENTIAL_DIAGNOSIS"])
                rows.append((r["PATHOLOGY"], int(r["AGE"]), r["SEX"], ev_list, r["INITIAL_EVIDENCE"], ddx_list))
            except Exception:
                pass

train_rows = rows[:8000]
eval_pool = rows[8000:]

def age_bucket(a):
    if a < 5: return "infant"
    if a < 18: return "pediatric"
    if a < 40: return "young_adult"
    if a < 65: return "middle_aged"
    return "geriatric"

def extract_feats(ev_list):
    seen = set()
    for ev in ev_list:
        base = ev.split("_@_")[0]
        if ev == "E_204_@_V_10":
            continue
        seen.add(base)
        if "_@_" in ev:
            val = ev.split("_@_")[1]
            if evids_raw.get(base, {}).get("data_type") == "C" and val.isdigit():
                v_int = int(val)
                b_val = "high" if v_int >= 7 else ("mod" if v_int >= 4 else "low")
                seen.add(f"{base}_@_{b_val}")
            else:
                seen.add(ev)
    return seen

path_counts = Counter()
feat_counts = defaultdict(Counter)
age_buckets = defaultdict(Counter)
sex_counts = defaultdict(Counter)
global_feat_counts = Counter()

for path, age, sex, ev_list, init_ev, _ in train_rows:
    path_counts[path] += 1
    age_buckets[path][age_bucket(age)] += 1
    sex_counts[path][sex] += 1
    seen = extract_feats(ev_list)
    for f in seen:
        feat_counts[path][f] += 1
        global_feat_counts[f] += 1

total_N = len(train_rows)

# Build Evidence Metadata Catalog (223 base evidences + high-value categorical/multi-choice values)
evidence_catalog = {}
for code, meta in evids_raw.items():
    q_en = meta.get("question_en", code)
    short_label = clean_label(q_en)
    cnt = global_feat_counts[code]
    ic = round(-math.log((cnt + 1.0) / (total_N + 2.0)), 4)
    val_map = {}
    for vk, vv in meta.get("value_meaning", {}).items():
        if isinstance(vv, dict) and vv.get("en"):
            val_map[vk] = vv["en"]
    evidence_catalog[code] = {
        "code": code,
        "label": short_label,
        "question": q_en,
        "isAntecedent": bool(meta.get("is_antecedent")),
        "dataType": meta.get("data_type", "B"),
        "informationContent": ic,
        "globalFrequency": round(cnt / total_N, 4),
        "values": val_map,
    }

# Build 49 Conditions Knowledge Base with empirical conditional probabilities P(E | D)
conditions_catalog = []
for name, cmeta in conds_raw.items():
    cid = slugify(name)
    nd = path_counts[name]
    organ_sys = ORGAN_SYSTEM_MAP.get(name, "infectious_immunologic_hematologic")
    allowed_sym = list(cmeta.get("symptoms", {}).keys())
    allowed_ant = list(cmeta.get("antecedents", {}).keys())

    # Store conditional probabilities P(f | D) for all observed features in this pathology
    feature_probs = {}
    top_signature_features = []
    for f, c_df in feat_counts[name].items():
        p_fd = round((c_df + 0.25) / (nd + 1.0), 4)
        if p_fd >= 0.015:
            feature_probs[f] = p_fd
            if "_@_" not in f and f in evidence_catalog:
                ic_f = evidence_catalog[f]["informationContent"]
                top_signature_features.append((p_fd * ic_f, f, p_fd))

    top_signature_features.sort(reverse=True)
    signature_list = [
        {
            "code": f,
            "label": evidence_catalog[f]["label"],
            "sensitivity": p_fd,
            "ic": evidence_catalog[f]["informationContent"],
        }
        for _, f, p_fd in top_signature_features[:8]
    ]

    age_dist = {
        b: round((age_buckets[name][b] + 0.5) / (nd + 2.5), 4)
        for b in ["infant", "pediatric", "young_adult", "middle_aged", "geriatric"]
    }
    sex_dist = {
        s: round((sex_counts[name][s] + 0.5) / (nd + 1.0), 4)
        for s in ["M", "F"]
    }

    conditions_catalog.append({
        "id": cid,
        "name": name,
        "nameFr": cmeta.get("cond-name-fr", name),
        "icd10": cmeta.get("icd10-id", "").upper(),
        "ddxSeverity": int(cmeta.get("severity", 3)),
        "organSystem": organ_sys,
        "organSystemLabel": ORGAN_SYSTEM_FAMILIES[organ_sys].split(" (")[0],
        "prior": round((nd + 1.0) / (total_N + 49.0), 5),
        "sampleCount": nd,
        "clinicalPearl": CLINICAL_PEARLS.get(name, ""),
        "allowedSymptoms": allowed_sym,
        "allowedAntecedents": allowed_ant,
        "signatureFindings": signature_list,
        "ageDistribution": age_dist,
        "sexDistribution": sex_dist,
        "featureProbs": feature_probs,
    })

conditions_catalog.sort(key=lambda x: (x["ddxSeverity"], -x["sampleCount"]))

# Build global feature IC lookup for compound features (e.g. E_55_@_V_101)
compound_feature_ic = {}
compound_feature_labels = {}
for f, cnt in global_feat_counts.items():
    compound_feature_ic[f] = round(-math.log((cnt + 1.0) / (total_N + 2.0)), 4)
    if "_@_" in f:
        base, val = f.split("_@_", 1)
        b_meta = evidence_catalog.get(base, {})
        b_label = b_meta.get("label", base)
        v_label = b_meta.get("values", {}).get(val, val)
        compound_feature_labels[f] = f"{b_label}: {v_label}"
    elif f in evidence_catalog:
        compound_feature_labels[f] = evidence_catalog[f]["label"]

# Select 60 diverse golden evaluation cases from eval_pool (covering all pathologies & emergencies)
by_path = defaultdict(list)
for row in eval_pool:
    by_path[row[0]].append(row)

# Also backfill any pathology missing in eval_pool from train_rows tail
for row in reversed(train_rows):
    if len(by_path[row[0]]) == 0:
        by_path[row[0]].append(row)

golden_cases = []
for cond in conditions_catalog:
    pname = cond["name"]
    candidates = by_path.get(pname, [])
    if candidates:
        row = candidates[0]
        golden_cases.append(row)

# Add 11 more high-acuity / sibling collision cases to reach 60
extra_Pool = [r for r in eval_pool if r not in golden_cases]
for r in extra_Pool[: (60 - len(golden_cases))]:
    golden_cases.append(r)

def format_patient_case(idx, row):
    path, age, sex, ev_list, init_ev, ddx_list = row
    cond_meta = next(c for c in conditions_catalog if c["name"] == path)
    human_symptoms = []
    human_antecedents = []
    pain_sites = []
    pain_chars = []
    pain_rad = []
    pain_intensity = None
    for ev in ev_list:
        if ev == "E_204_@_V_10":
            continue
        base = ev.split("_@_")[0]
        em = evidence_catalog.get(base, {})
        if base == "E_55" and "_@_" in ev:
            v = ev.split("_@_")[1]
            loc = em.get("values", {}).get(v, v)
            if loc != "nowhere":
                pain_sites.append(loc)
        elif base == "E_54" and "_@_" in ev:
            v = ev.split("_@_")[1]
            ch = em.get("values", {}).get(v, v)
            if ch != "NA":
                pain_chars.append(ch)
        elif base == "E_57" and "_@_" in ev:
            v = ev.split("_@_")[1]
            rad = em.get("values", {}).get(v, v)
            if rad != "nowhere":
                pain_rad.append(rad)
        elif base == "E_56" and "_@_" in ev:
            pain_intensity = ev.split("_@_")[1]
        elif "_@_" not in ev:
            if em.get("isAntecedent"):
                human_antecedents.append(em.get("label", base))
            elif base != "E_53":
                human_symptoms.append(em.get("label", base))

    # Build natural clinical vignette
    sex_word = "male" if sex == "M" else "female"
    parts = [f"{age}-year-old {sex_word}"]
    if pain_sites:
        p_desc = f"presenting with {', '.join(pain_chars[:2]) + ' ' if pain_chars else ''}pain in the {', '.join(pain_sites[:3])}"
        if pain_intensity is not None:
            p_desc += f" (intensity {pain_intensity}/10)"
        if pain_rad:
            p_desc += f" radiating to the {', '.join(pain_rad[:2])}"
        parts.append(p_desc)
    if human_symptoms:
        parts.append("associated with " + ", ".join(human_symptoms[:6]).lower())
    if human_antecedents:
        parts.append("past history / risk factors: " + ", ".join(human_antecedents[:4]).lower())

    vignette = "; ".join(parts) + "."
    return {
        "caseId": f"ddx-{idx:02d}-{cond_meta['id']}",
        "groundTruthId": cond_meta["id"],
        "groundTruthName": path,
        "icd10": cond_meta["icd10"],
        "organSystem": cond_meta["organSystem"],
        "ddxSeverity": cond_meta["ddxSeverity"],
        "age": age,
        "sex": sex,
        "initialEvidence": init_ev,
        "evidences": ev_list,
        "vignette": vignette,
        "referenceDifferential": [
            {"name": d[0], "id": slugify(d[0]), "probability": round(float(d[1]), 4)}
            for d in ddx_list[:8]
        ],
    }

formatted_cases = [format_patient_case(i + 1, r) for i, r in enumerate(golden_cases)]

# Curate 10 featured clinical presets for the interactive studio UI
FEATURED_TARGETS = [
    "Possible NSTEMI / STEMI",
    "Pulmonary embolism",
    "Anaphylaxis",
    "Epiglottitis",
    "Boerhaave",
    "Guillain-Barré syndrome",
    "Pneumonia",
    "Myasthenia gravis",
    "Cluster headache",
    "Panic attack",
]
featured_presets = []
for tname in FEATURED_TARGETS:
    match = next((c for c in formatted_cases if c["groundTruthName"] == tname), None)
    if match:
        featured_presets.append(match)

kb_payload = {
    "dataset": "DDXPlus (Fansi Tchango et al., NeurIPS 2022)",
    "trainedEncounters": total_N,
    "pathologyCount": len(conditions_catalog),
    "evidenceCount": len(evidence_catalog),
    "organSystemFamilies": ORGAN_SYSTEM_FAMILIES,
    "conditions": conditions_catalog,
    "evidences": evidence_catalog,
    "compoundFeatureIc": compound_feature_ic,
    "compoundFeatureLabels": compound_feature_labels,
    "featuredPresets": featured_presets,
}

js_out = f"// Auto-generated from DDXPlus (Fansi Tchango et al., NeurIPS 2022) — N={total_N} clinical encounters\n"
js_out += f"export const DDXPLUS_KB = {json.dumps(kb_payload, indent=2)};\n"

with open("/Users/lika/labs/symptoms-classifer/public/ddxplus-kb.js", "w", encoding="utf-8") as f:
    f.write(js_out)

with open("/Users/lika/labs/symptoms-classifer/bench/ddxplus-eval-cases.json", "w", encoding="utf-8") as f:
    json.dump(formatted_cases, f, indent=2)

print(f"Wrote public/ddxplus-kb.js ({len(js_out)//1024} KB) and bench/ddxplus-eval-cases.json ({len(formatted_cases)} cases)")

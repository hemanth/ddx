let Wllama = null;
let LoggerWithoutDebug = null;

if (typeof self !== 'undefined' && typeof self.fetch === 'function') {
  const browserFetch = self.fetch.bind(self);
  self.fetch = (input, init = {}) => browserFetch(input, { ...init, referrerPolicy: 'no-referrer' });
  const mod = await import('./vendor/wllama/index.js');
  Wllama = mod.Wllama;
  LoggerWithoutDebug = mod.LoggerWithoutDebug;
}

// Ordered with the top-accuracy in-browser OpenJev model first (Qwen3.5-4B: 84.5% TypeSafe agreement)
export const OPENJEV_MODELS = {
  'qwen3.5-4b': {
    name: 'Qwen3.5 4B (Top In-Browser · 84.5% Jev Agreement)',
    shortName: 'Qwen3.5 4B',
    size: '3.01 GB',
    typesafeAgreement: 0.845,
    authoredAccuracy: 0.813,
    url: 'https://huggingface.co/bartowski/Qwen_Qwen3.5-4B-GGUF/resolve/4168f45a16a1290d65a4ec0fa312ae917a4c15d6/Qwen_Qwen3.5-4B-Q4_K_M.gguf',
    labelBase: 32
  },
  'minicpm5-2b': {
    name: 'MiniCPM5 2B (Balanced Desktop · 63.7% Jev Agreement)',
    shortName: 'MiniCPM5 2B',
    size: '1.56 GB',
    typesafeAgreement: 0.637,
    authoredAccuracy: 0.686,
    url: 'https://huggingface.co/openbmb/MiniCPM5-2B-GGUF/resolve/2079a22f3beaa4e306449978533478fe0522f4b3/MiniCPM5-2B-Q4_K_M.gguf',
    labelBase: 54
  },
  'qwen3-0.6b': {
    name: 'Qwen3 0.6B (Fast Compact · 40.7% Jev Agreement)',
    shortName: 'Qwen3 0.6B',
    size: '639 MB',
    typesafeAgreement: 0.407,
    authoredAccuracy: 0.440,
    url: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf',
    labelBase: 32
  }
};

const labelsFor = (count) => Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
let engine = null;
let loadedModelId = null;

function send(type, data = {}) {
  self.postMessage({ type, ...data });
}

function softmax(values) {
  const maxVal = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - maxVal));
  const total = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / total);
}

function extractOptionLogprobs(response, labels) {
  const entries = response.choices?.[0]?.logprobs?.content?.[0]?.top_logprobs ?? [];
  return labels.map((label) => {
    const ascii = label.charCodeAt(0);
    const entry = entries.find((item) => item.token === label || (item.bytes?.length === 1 && item.bytes[0] === ascii));
    return Number.isFinite(Number(entry?.logprob)) ? Number(entry.logprob) : -12;
  });
}

async function loadModel(requestedModelId = 'qwen3.5-4b') {
  if (engine && loadedModelId === requestedModelId) {
    const selected = OPENJEV_MODELS[loadedModelId];
    send('ready', { warmupMs: 0, modelId: loadedModelId, modelName: selected.shortName });
    return;
  }
  if (engine) {
    try {
      await engine.exit();
    } catch {
      // ignore cleanup error
    }
    engine = null;
    loadedModelId = null;
  }

  if (!Object.hasOwn(OPENJEV_MODELS, requestedModelId)) {
    throw new Error(`Unknown OpenJev model: ${requestedModelId}`);
  }

  const selected = OPENJEV_MODELS[requestedModelId];
  const wasmUrl = new URL('./vendor/wllama/wasm/wllama.wasm', self.location.href).href;

  engine = new Wllama(
    { default: wasmUrl },
    { logger: LoggerWithoutDebug, suppressNativeLog: true, parallelDownloads: 4 }
  );

  send('loading', { message: `Downloading or reading ${selected.shortName} (${selected.size}) from browser cache...` });
  const loadStart = performance.now();

  await engine.loadModelFromUrl(selected.url, {
    n_ctx: 2048,
    n_batch: 512,
    n_gpu_layers: 999,
    cache_prompt: false,
    progressCallback: ({ loaded, total }) => {
      const pct = total ? Math.round((loaded / total) * 100) : 0;
      send('progress', {
        loaded,
        total,
        percent: pct,
        text: total ? `${pct}% of ${selected.shortName} (${selected.size})` : `Loading ${selected.shortName}...`
      });
    }
  });

  const loadMs = Math.round(performance.now() - loadStart);
  send('loaded', { loadMs, modelId: requestedModelId, modelName: selected.shortName });
  send('loading', { message: `Warming up ${selected.shortName} 1-token direct logit pass...` });

  const warmupStart = performance.now();
  await engine.createChatCompletion({
    messages: [{ role: 'user', content: 'Reply with the single word ready.' }],
    max_tokens: 1,
    temperature: 0,
    cache_prompt: false,
    chat_template_kwargs: { enable_thinking: false }
  });

  loadedModelId = requestedModelId;
  send('ready', {
    warmupMs: Math.round(performance.now() - warmupStart),
    loadMs,
    modelId: loadedModelId,
    modelName: selected.shortName
  });
}

async function runSingleDirectChoice(stateText, questionText, optionItems) {
  const labels = labelsFor(optionItems.length);
  const optionLines = optionItems.map((item, idx) => `${labels[idx]}. ${item.description}`).join('\n');
  const grammar = `root ::= ${labels.map((l) => `"${l}"`).join(' | ')}`;
  const labelBase = OPENJEV_MODELS[loadedModelId].labelBase;

  const response = await engine.createChatCompletion({
    messages: [
      {
        role: 'system',
        content: 'Make the requested clinical differential diagnosis decision from the supplied patient state. Follow the output format exactly.'
      },
      {
        role: 'user',
        content: `State:\n${stateText}\n\nQuestion:\n${questionText}\n\nAllowed options:\n${optionLines}\n\nReply with exactly one option letter from: ${labels.join(', ')}.`
      }
    ],
    max_tokens: 1,
    temperature: 1,
    top_k: 0,
    top_p: 1,
    logprobs: true,
    top_logprobs: 20,
    logit_bias: Object.fromEntries(labels.map((_, idx) => [String(labelBase + idx), 100])),
    grammar,
    cache_prompt: false,
    chat_template_kwargs: { enable_thinking: false }
  });

  const logits = extractOptionLogprobs(response, labels);
  const probs = softmax(logits);
  const probMap = {};
  let bestKey = optionItems[0].key;
  let bestProb = -1;

  optionItems.forEach((item, idx) => {
    const p = Number(probs[idx].toFixed(4));
    probMap[item.key] = p;
    if (p > bestProb) {
      bestProb = p;
      bestKey = item.key;
    }
  });

  return {
    choice: bestKey,
    confidence: Number(Math.min(0.99, Math.max(0.45, bestProb * 1.15)).toFixed(3)),
    probabilities: probMap,
    inputTokens: response.usage?.prompt_tokens ?? 0
  };
}

async function evaluateClinicalState({ state, candidates, organSystems }) {
  if (!engine || !loadedModelId) {
    throw new Error('OpenJev model is not loaded yet. Click "Load OpenJev Model" first.');
  }

  const startedAt = performance.now();
  const compactState = JSON.stringify(
    {
      patient_demographics: state.patient_demographics,
      presenting_symptoms_by_information_content: state.presenting_symptoms_by_information_content?.slice(0, 7),
      medical_history_antecedents: state.medical_history_antecedents?.slice(0, 5),
      clinical_decision_rules: state.clinical_decision_rules,
      qmr_dt_candidate_shortlist: state.qmr_dt_candidate_shortlist?.slice(0, 6)
    },
    null,
    2
  );

  // 1. Direct 1-token logit readout for primary_diagnosis (top 12 shortlisted candidates)
  const diagOptions = candidates.slice(0, 12).map((c) => ({
    key: c.id,
    description: `${c.name} (ICD-10 ${c.icd10}, ${c.organSystemLabel}) · QMR-DT Posterior: ${c.bayesianPosterior}; Matched Findings: ${c.matchedSignature.map((s) => s.label).join(', ')}`
  }));

  const primaryDiagRes = await runSingleDirectChoice(
    compactState,
    'Which diagnosis best accounts for this patient presentation based on symptom information content, antecedents, and QMR-DT posteriors?',
    diagOptions
  );

  // 2. Direct 1-token logit readout for organ_system (6 organ systems A..F)
  const sysOptions = Object.entries(organSystems).map(([key, desc]) => ({
    key,
    description: desc
  }));

  const organSysRes = await runSingleDirectChoice(
    compactState,
    'Which primary organ system family governs the pathophysiology of this presentation?',
    sysOptions
  );

  // 3. Direct 1-token logit readout for esi_triage_tier (5 ESI levels A..E)
  const esiOptions = [
    { key: 'esi_1_resuscitation', description: 'ESI Level 1 · Immediate life-saving resuscitation required' },
    { key: 'esi_2_emergent', description: 'ESI Level 2 · High-risk emergent condition requiring rapid ED intervention' },
    { key: 'esi_3_urgent', description: 'ESI Level 3 · Urgent stable presentation requiring multiple diagnostic resources' },
    { key: 'esi_4_less_urgent', description: 'ESI Level 4 · Less urgent localized presentation requiring 1 resource' },
    { key: 'esi_5_non_urgent', description: 'ESI Level 5 · Non-urgent ambulatory care presentation' }
  ];

  const esiRes = await runSingleDirectChoice(
    compactState,
    'Which Emergency Severity Index (ESI v4) triage level applies to this patient?',
    esiOptions
  );

  // 4. Direct 1-token logit readout for red_flag_emergency_present Noul (A = Yes, B = No)
  const redFlagRes = await runSingleDirectChoice(
    compactState,
    'Are life-threatening red-flag emergency warning signs or ESI Level 1/2 acuity present in this patient?',
    [
      { key: 'yes', description: 'Yes · critical red-flag signs or emergent high-risk pathology are present' },
      { key: 'no', description: 'No · stable presentation without immediate life-threatening red flags' }
    ]
  );

  const latencyMs = Math.round(performance.now() - startedAt);
  const selectedModel = OPENJEV_MODELS[loadedModelId];

  send('evaluated', {
    model: `openjev/${loadedModelId} (${selectedModel.shortName})`,
    latencyMs,
    inputTokens:
      primaryDiagRes.inputTokens +
      organSysRes.inputTokens +
      esiRes.inputTokens +
      redFlagRes.inputTokens,
    readouts: 4,
    primary_diagnosis: primaryDiagRes,
    organ_system: organSysRes,
    esi_triage_tier: esiRes,
    red_flag_noul: redFlagRes.probabilities.yes ?? 0.5
  });
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', async ({ data }) => {
    try {
      if (data.type === 'load') {
        await loadModel(data.modelId);
      } else if (data.type === 'evaluate') {
        await evaluateClinicalState(data.payload);
      }
    } catch (err) {
      send('error', { message: err?.message || String(err) });
    }
  });
}

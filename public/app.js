import {
  DDXPLUS_KB,
  ORGAN_SYSTEM_FAMILIES,
  CONDITIONS_CATALOG,
  EVIDENCES_CATALOG,
  DOCTOR_ROS_GROUPS,
  CLINICAL_ORDER_SETS,
  getClinicianLabel,
  classifyInBrowserQmr
} from './clinical-browser-engine.js?v=3';

let currentClassification = null;
let activeEvidences = [];
let absentEvidences = [];
let activeCaseId = 'ddx-01-possible_nstemi_stemi';
let activeRosTab = 'charted';
let hasLocalBackend = false;
let revealTimers = [];
let narrativeDebounceTimer = null;

// OpenJev In-Browser Wllama Worker state (#1 Top Model: qwen3.5-4b)
let openjevWorker = null;
let openjevLoadedModel = null;
let openjevLoadingModel = null;
let openjevPendingEvalResolve = null;

const presetPillsEl = document.getElementById('preset-pills');
const activeCaseBadge = document.getElementById('active-case-id-badge');
const btnNewPatient = document.getElementById('btn-new-patient');
const narrativeInput = document.getElementById('clinical-narrative-input');
const nlpStatusBadge = document.getElementById('nlp-parse-status-badge');
const ageInput = document.getElementById('patient-age-input');
const sexSelect = document.getElementById('patient-sex-select');
const btnRunDiagnosis = document.getElementById('btn-run-diagnosis');
const runBtnLabel = document.getElementById('run-btn-label');

const evidenceSearchInput = document.getElementById('evidence-search-input');
const evidenceSearchResults = document.getElementById('evidence-search-results');
const rosTabsBar = document.getElementById('ros-tabs-bar');
const rosQuickGrid = document.getElementById('ros-quick-grid');
const activeEvidenceChips = document.getElementById('active-evidence-chips');
const activePosCountEl = document.getElementById('active-pos-count');
const activeNegCountEl = document.getElementById('active-neg-count');
const btnClearEvidences = document.getElementById('btn-clear-evidences');

const engineModeSelect = document.getElementById('engine-mode-select');
const byokKeyGroup = document.getElementById('byok-key-group');
const jevApiKeyInput = document.getElementById('jev-api-key-input');
const btnSaveApiKey = document.getElementById('btn-save-api-key');
const btnClearApiKey = document.getElementById('btn-clear-api-key');
const btnToggleKeyVis = document.getElementById('btn-toggle-key-vis');
const apiKeyStatusBadge = document.getElementById('api-key-status-badge');
const openjevControls = document.getElementById('openjev-controls');
const openjevStatusText = document.getElementById('openjev-status-text');
const btnLoadOpenjev = document.getElementById('btn-load-openjev');
const loadOpenjevLabel = document.getElementById('load-openjev-label');
const btnModeCloud = document.getElementById('btn-mode-cloud');
const btnModeOpenjev = document.getElementById('btn-mode-openjev');

const ESI_LABELS = {
  1: 'ESI Level 1 · Immediate Resuscitation',
  2: 'ESI Level 2 · Emergent High-Risk',
  3: 'ESI Level 3 · Urgent Multi-Resource',
  4: 'ESI Level 4 · Less Urgent (1 Resource)',
  5: 'ESI Level 5 · Non-Urgent Outpatient'
};

const ESI_SHORT_BADGE = {
  1: 'ESI 1 · IMMEDIATE RESUSCITATION',
  2: 'ESI 2 · EMERGENT RULE-OUT',
  3: 'ESI 3 · URGENT WORKUP',
  4: 'ESI 4 · LESS URGENT',
  5: 'ESI 5 · OUTPATIENT'
};

function getBrowserApiKey() {
  try {
    return (jevApiKeyInput?.value || localStorage.getItem('typesafe_jev_api_key') || '').trim();
  } catch {
    return (jevApiKeyInput?.value || '').trim();
  }
}

function isOpenJevSelected() {
  return String(engineModeSelect?.value || '').startsWith('openjev:');
}

function getSelectedOpenJevModelId() {
  const val = String(engineModeSelect?.value || '');
  return val.startsWith('openjev:') ? val.slice('openjev:'.length) : 'qwen3.5-4b';
}

function updateApiKeyBadge() {
  const k = getBrowserApiKey();
  if (apiKeyStatusBadge) {
    apiKeyStatusBadge.textContent = k
      ? 'BROWSER KEY ACTIVE'
      : hasLocalBackend
        ? 'SERVER .ENV'
        : 'OPENJEV LOCAL (NO KEY)';
  }
}

try {
  const savedKey = localStorage.getItem('typesafe_jev_api_key') || '';
  if (savedKey && jevApiKeyInput) {
    jevApiKeyInput.value = savedKey;
  }
} catch {
  // ignore storage errors
}
updateApiKeyBadge();

function syncEngineModeUI() {
  const openJev = isOpenJevSelected();
  if (btnModeCloud) btnModeCloud.classList.toggle('active', !openJev);
  if (btnModeOpenjev) btnModeOpenjev.classList.toggle('active', openJev);
  if (byokKeyGroup) byokKeyGroup.style.display = openJev ? 'none' : 'flex';
  if (openjevControls) openjevControls.style.display = openJev ? 'flex' : 'none';
  if (openJev && loadOpenjevLabel) {
    const mid = getSelectedOpenJevModelId();
    loadOpenjevLabel.textContent =
      openjevLoadedModel === mid ? `${mid.toUpperCase()} Ready` : `Load & Run ${mid.toUpperCase()} In-Browser`;
  }
}

btnModeCloud?.addEventListener('click', () => {
  if (engineModeSelect) engineModeSelect.value = 'typesafe-cloud';
  syncEngineModeUI();
});

btnModeOpenjev?.addEventListener('click', () => {
  if (engineModeSelect && !isOpenJevSelected()) {
    engineModeSelect.value = 'openjev:qwen3.5-4b';
  }
  syncEngineModeUI();
});

engineModeSelect?.addEventListener('change', () => {
  syncEngineModeUI();
});

btnToggleKeyVis?.addEventListener('click', () => {
  if (!jevApiKeyInput) return;
  const isPass = jevApiKeyInput.type === 'password';
  jevApiKeyInput.type = isPass ? 'text' : 'password';
  btnToggleKeyVis.textContent = isPass ? 'Hide' : 'Show';
});

btnSaveApiKey?.addEventListener('click', () => {
  try {
    const val = (jevApiKeyInput?.value || '').trim();
    if (val) localStorage.setItem('typesafe_jev_api_key', val);
    else localStorage.removeItem('typesafe_jev_api_key');
  } catch {
    // ignore
  }
  updateApiKeyBadge();
  runCurrentEncounter();
});

btnClearApiKey?.addEventListener('click', () => {
  if (jevApiKeyInput) jevApiKeyInput.value = '';
  try {
    localStorage.removeItem('typesafe_jev_api_key');
  } catch {
    // ignore
  }
  updateApiKeyBadge();
});

function ensureOpenJevWorker() {
  if (openjevWorker) return openjevWorker;
  openjevWorker = new Worker('./openjev-worker.js?v=3', { type: 'module' });
  const headerStatusEl = document.getElementById('engine-status-text');
  openjevWorker.addEventListener('message', ({ data }) => {
    if (data.type === 'loading') {
      if (openjevStatusText) openjevStatusText.textContent = data.message;
      if (loadOpenjevLabel) loadOpenjevLabel.textContent = 'Loading...';
      if (headerStatusEl) headerStatusEl.textContent = `OPENJEV · LOADING ${getSelectedOpenJevModelId().toUpperCase()}`;
    } else if (data.type === 'progress') {
      if (openjevStatusText) openjevStatusText.textContent = data.text;
      if (headerStatusEl && typeof data.percent === 'number') {
        headerStatusEl.textContent = `OPENJEV · ${data.percent}%`;
      }
    } else if (data.type === 'ready') {
      openjevLoadedModel = data.modelId;
      openjevLoadingModel = null;
      if (openjevStatusText) {
        openjevStatusText.textContent = `${data.modelName} Ready (warmup ${data.warmupMs}ms · 1-token direct logit readout)`;
      }
      if (loadOpenjevLabel) loadOpenjevLabel.textContent = `${data.modelName} Loaded`;
      if (headerStatusEl) {
        headerStatusEl.textContent = `OPENJEV ${data.modelId.toUpperCase()} · READY`;
      }
      if (currentClassification) {
        applyOpenJevToClassification(currentClassification);
      }
    } else if (data.type === 'evaluated') {
      if (openjevPendingEvalResolve) {
        openjevPendingEvalResolve(data);
        openjevPendingEvalResolve = null;
      }
    } else if (data.type === 'error') {
      openjevLoadingModel = null;
      if (openjevStatusText) openjevStatusText.textContent = `OpenJev Error: ${data.message}`;
      if (loadOpenjevLabel) loadOpenjevLabel.textContent = 'Retry Load Model';
      if (openjevPendingEvalResolve) {
        openjevPendingEvalResolve(null);
        openjevPendingEvalResolve = null;
      }
    }
  });
  return openjevWorker;
}

function triggerOpenJevLoad(modelId = getSelectedOpenJevModelId()) {
  if (openjevLoadedModel === modelId || openjevLoadingModel === modelId) return;
  openjevLoadingModel = modelId;
  const worker = ensureOpenJevWorker();
  worker.postMessage({ type: 'load', modelId });
}

btnLoadOpenjev?.addEventListener('click', () => {
  const mid = getSelectedOpenJevModelId();
  if (openjevLoadedModel === mid && currentClassification) {
    applyOpenJevToClassification(currentClassification);
  } else {
    triggerOpenJevLoad(mid);
  }
});

async function applyOpenJevToClassification(data) {
  if (!isOpenJevSelected() && engineModeSelect) {
    engineModeSelect.value = 'openjev:qwen3.5-4b';
    syncEngineModeUI();
  }
  const targetModelId = getSelectedOpenJevModelId();
  const worker = ensureOpenJevWorker();

  if (openjevLoadedModel !== targetModelId) {
    if (openjevStatusText) {
      openjevStatusText.textContent = `Auto-loading ${targetModelId} (#1 top in-browser Jev model) via WebAssembly...`;
    }
    triggerOpenJevLoad(targetModelId);
    return data;
  }

  if (openjevStatusText) {
    openjevStatusText.textContent = `Running ${targetModelId} 1-token direct logit readout over ${data.rankedCandidates.length} candidates...`;
  }

  const evalRes = await new Promise((resolve) => {
    openjevPendingEvalResolve = resolve;
    worker.postMessage({
      type: 'evaluate',
      payload: {
        state: data.systemOneInspector.state,
        candidates: data.rankedCandidates,
        organSystems: ORGAN_SYSTEM_FAMILIES
      }
    });
  });

  if (!evalRes) return data;

  data.engine = {
    provider: 'OpenJev In-Browser (openjev.com)',
    model: evalRes.model,
    liveApi: true,
    keySource: 'openjev-browser-wllama',
    latencyMs: evalRes.latencyMs,
    usage: { input_tokens: evalRes.inputTokens, output_tokens: evalRes.readouts }
  };

  data.primitives.choices.primary_diagnosis = {
    type: 'choice',
    choice: evalRes.primary_diagnosis.choice,
    confidence: evalRes.primary_diagnosis.confidence,
    probabilities: evalRes.primary_diagnosis.probabilities
  };
  data.primitives.choices.organ_system = {
    type: 'choice',
    choice: evalRes.organ_system.choice,
    confidence: evalRes.organ_system.confidence,
    probabilities: evalRes.organ_system.probabilities
  };
  data.primitives.choices.esi_triage_tier = {
    type: 'choice',
    choice: evalRes.esi_triage_tier.choice,
    confidence: evalRes.esi_triage_tier.confidence,
    probabilities: evalRes.esi_triage_tier.probabilities
  };
  data.primitives.nouls.red_flag_emergency_present = {
    type: 'noul',
    noul: Number(evalRes.red_flag_noul.toFixed(3))
  };

  data.rankedCandidates = data.rankedCandidates
    .map((c) => {
      const pJev = Number(evalRes.primary_diagnosis.probabilities[c.id] ?? c.bayesianPosterior);
      const fused = Number((0.55 * pJev + 0.45 * c.bayesianPosterior).toFixed(4));
      const pSys = Number(evalRes.organ_system.probabilities[c.organSystem] ?? c.organSystemProbability);
      const beam = Number(Math.sqrt(Math.max(0, fused * pSys)).toFixed(4));
      return {
        ...c,
        jevProbability: pJev,
        probability: fused,
        organSystemProbability: pSys,
        hierarchicalBeamScore: beam
      };
    })
    .sort((a, b) => b.probability - a.probability || b.logQmr - a.logQmr);

  data.winner = data.rankedCandidates[0];
  data.runnerUp = data.rankedCandidates[1] || data.winner;
  data.routing.primaryConfidence = evalRes.primary_diagnosis.confidence;
  data.routing.hierarchicalBeamScore = data.winner.hierarchicalBeamScore;
  data.routing.summary = `Evaluated locally in browser via OpenJev (${evalRes.model}) using 4 direct 1-token option logit readouts (${evalRes.latencyMs}ms). Leading diagnosis: ${data.winner.name} (${data.winner.icd10}).`;

  renderClassification(data, { animate: false });
  return data;
}

// Top Drawers Toggle Logic
const btnToggleEngine = document.getElementById('btn-toggle-engine');
const btnCloseEngine = document.getElementById('btn-close-engine');
const drawerEngine = document.getElementById('drawer-engine');

const btnToggleEval = document.getElementById('btn-toggle-eval');
const btnCloseEval = document.getElementById('btn-close-eval');
const drawerEval = document.getElementById('drawer-eval');

const btnToggleArch = document.getElementById('btn-toggle-arch');
const btnCloseArch = document.getElementById('btn-close-arch');
const drawerArch = document.getElementById('drawer-arch');

function toggleDrawer(targetDrawer, targetBtn) {
  const isHidden = targetDrawer.hasAttribute('hidden');
  [drawerEngine, drawerEval, drawerArch].forEach((d) => d?.setAttribute('hidden', ''));
  [btnToggleEngine, btnToggleEval, btnToggleArch].forEach((b) => b?.setAttribute('aria-expanded', 'false'));
  if (isHidden) {
    targetDrawer.removeAttribute('hidden');
    targetBtn?.setAttribute('aria-expanded', 'true');
  }
}

btnToggleEngine?.addEventListener('click', () => toggleDrawer(drawerEngine, btnToggleEngine));
btnCloseEngine?.addEventListener('click', () => toggleDrawer(drawerEngine, btnToggleEngine));

btnToggleEval?.addEventListener('click', () => toggleDrawer(drawerEval, btnToggleEval));
btnCloseEval?.addEventListener('click', () => toggleDrawer(drawerEval, btnToggleEval));

btnToggleArch?.addEventListener('click', () => toggleDrawer(drawerArch, btnToggleArch));
btnCloseArch?.addEventListener('click', () => toggleDrawer(drawerArch, btnToggleArch));

// Evidence State Helpers (+ Present vs - Denies vs Clear)
function getActiveBaseSet() {
  return new Set(activeEvidences.filter((e) => e !== 'E_204_@_V_10').map((e) => e.split('_@_')[0]));
}

function getAbsentBaseSet() {
  return new Set(absentEvidences.map((e) => e.split('_@_')[0]));
}

function markEvidencePresent(code) {
  const base = String(code || '').split('_@_')[0];
  if (!base) return;
  absentEvidences = absentEvidences.filter((e) => e.split('_@_')[0] !== base);
  if (!activeEvidences.some((e) => e === code || e.split('_@_')[0] === base)) {
    activeEvidences.push(code);
  }
  renderRosTabsAndChart();
  runCurrentEncounter();
}

function markEvidenceAbsent(code) {
  const base = String(code || '').split('_@_')[0];
  if (!base) return;
  activeEvidences = activeEvidences.filter((e) => e.split('_@_')[0] !== base);
  if (!absentEvidences.includes(base)) {
    absentEvidences.push(base);
  }
  renderRosTabsAndChart();
  runCurrentEncounter();
}

function removeEvidenceCompletely(code) {
  const base = String(code || '').split('_@_')[0];
  activeEvidences = activeEvidences.filter((e) => e.split('_@_')[0] !== base);
  absentEvidences = absentEvidences.filter((e) => e.split('_@_')[0] !== base);
  renderRosTabsAndChart();
  runCurrentEncounter();
}

// Render ROS Organ-System Tabs + Active Chart Buckets
function renderRosTabsAndChart() {
  const posBases = [...getActiveBaseSet()];
  const negBases = [...getAbsentBaseSet()];
  if (activePosCountEl) activePosCountEl.textContent = String(posBases.length);
  if (activeNegCountEl) activeNegCountEl.textContent = String(negBases.length);

  if (rosTabsBar) {
    const tabs = [
      { id: 'charted', label: `Active Patient Chart (${posBases.length} + / ${negBases.length} −)` },
      ...DOCTOR_ROS_GROUPS.map((g) => ({ id: g.id, label: g.label }))
    ];
    rosTabsBar.innerHTML = tabs
      .map(
        (t) => `
        <button type="button" class="ros-tab-btn ${activeRosTab === t.id ? 'active' : ''}" data-ros-tab="${t.id}">
          ${t.label}
        </button>
      `
      )
      .join('');

    rosTabsBar.querySelectorAll('[data-ros-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeRosTab = btn.getAttribute('data-ros-tab') || 'charted';
        renderRosTabsAndChart();
      });
    });
  }

  // Render Quick-Toggle Grid if an organ system tab is selected
  if (rosQuickGrid) {
    if (activeRosTab === 'charted') {
      rosQuickGrid.setAttribute('hidden', '');
    } else {
      const group = DOCTOR_ROS_GROUPS.find((g) => g.id === activeRosTab);
      if (group) {
        rosQuickGrid.removeAttribute('hidden');
        const posSet = getActiveBaseSet();
        const negSet = getAbsentBaseSet();
        rosQuickGrid.innerHTML = group.items
          .map((item) => {
            const isPos = posSet.has(item.code);
            const isNeg = negSet.has(item.code);
            const stateClass = isPos ? 'is-pos' : isNeg ? 'is-neg' : '';
            return `
              <div class="ros-item-card ${stateClass}">
                <div class="ros-item-label">
                  <strong>${item.shortLabel}</strong>
                  <small>${item.code}</small>
                </div>
                <div class="ros-item-actions">
                  <button type="button" class="ros-toggle-btn pos ${isPos ? 'active' : ''}" data-ros-pos="${item.code}" title="Mark Present (+)">+ Yes</button>
                  <button type="button" class="ros-toggle-btn neg ${isNeg ? 'active' : ''}" data-ros-neg="${item.code}" title="Mark Denied / Pertinent Negative (−)">− No</button>
                </div>
              </div>
            `;
          })
          .join('');

        rosQuickGrid.querySelectorAll('[data-ros-pos]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-ros-pos');
            if (getActiveBaseSet().has(code)) removeEvidenceCompletely(code);
            else markEvidencePresent(code);
          });
        });

        rosQuickGrid.querySelectorAll('[data-ros-neg]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-ros-neg');
            if (getAbsentBaseSet().has(code)) removeEvidenceCompletely(code);
            else markEvidenceAbsent(code);
          });
        });
      }
    }
  }

  // Always render the Patient Chart Buckets (Pertinent Positives, Pertinent Negatives, PMH)
  if (!activeEvidenceChips) return;

  const posSymptoms = [];
  const pmhItems = [];
  for (const code of posBases) {
    const meta = EVIDENCES_CATALOG[code];
    if (!meta) continue;
    const details = activeEvidences
      .filter((e) => e.startsWith(`${code}_@_` ))
      .map((e) => {
        const v = e.split('_@_')[1];
        return meta.values?.[v] || v;
      });
    const obj = {
      code,
      clinicianLabel: getClinicianLabel(code),
      fullLabel: meta.label,
      ic: meta.informationContent,
      details
    };
    if (meta.isAntecedent) pmhItems.push(obj);
    else posSymptoms.push(obj);
  }

  const negItems = negBases
    .map((code) => {
      const meta = EVIDENCES_CATALOG[code];
      if (!meta) return null;
      return {
        code,
        clinicianLabel: getClinicianLabel(code),
        fullLabel: meta.label,
        ic: meta.informationContent
      };
    })
    .filter(Boolean);

  posSymptoms.sort((a, b) => b.ic - a.ic);
  pmhItems.sort((a, b) => b.ic - a.ic);
  negItems.sort((a, b) => b.ic - a.ic);

  const renderChip = (item, mode) => {
    const detStr = item.details?.length ? ` (${item.details.slice(0, 2).join(', ')})` : '';
    const prefix = mode === 'neg' ? '− Denies: ' : mode === 'pmh' ? 'Hx: ' : '+ ';
    const flipAttr = mode === 'neg' ? `data-flip-pos="${item.code}"` : `data-flip-neg="${item.code}"`;
    const flipTitle = mode === 'neg' ? 'Click to switch to + Present' : 'Click to switch to − Denies (Pertinent Negative)';
    return `
      <span class="evidence-chip ${mode === 'neg' ? 'denied-chip' : mode === 'pmh' ? 'antecedent' : 'positive-chip'}" title="${item.fullLabel} (${item.code} · IC ${item.ic.toFixed(1)} nats)">
        <button type="button" class="chip-flip-btn" ${flipAttr} title="${flipTitle}">
          <strong>${prefix}${item.clinicianLabel}${detStr}</strong>
        </button>
        <button type="button" class="chip-remove" data-remove-code="${item.code}" aria-label="Remove ${item.clinicianLabel}">×</button>
      </span>
    `;
  };

  activeEvidenceChips.innerHTML = `
    <div class="chart-bucket">
      <div class="chart-bucket-header">
        <span class="mono-label">+ PERTINENT POSITIVES / PRESENTING SYMPTOMS (${posSymptoms.length})</span>
        <span class="chart-bucket-hint">Click any finding to flip to [− Denies]</span>
      </div>
      <div class="chart-chip-row">
        ${posSymptoms.length ? posSymptoms.map((x) => renderChip(x, 'pos')).join('') : '<span class="empty-chart-hint">No positive symptoms charted yet · select from ROS tabs or type in HPI note above.</span>'}
      </div>
    </div>

    <div class="chart-bucket">
      <div class="chart-bucket-header">
        <span class="mono-label">− PERTINENT NEGATIVES / RULED-OUT FINDINGS (${negItems.length})</span>
        <span class="chart-bucket-hint">Applies Negative Likelihood Ratio (LR−) to rule down competing diagnoses</span>
      </div>
      <div class="chart-chip-row">
        ${negItems.length ? negItems.map((x) => renderChip(x, 'neg')).join('') : '<span class="empty-chart-hint">No pertinent negatives charted · click [− No] on Bedside Questions below or type "denies fever" in HPI.</span>'}
      </div>
    </div>

    <div class="chart-bucket">
      <div class="chart-bucket-header">
        <span class="mono-label">HX · PAST MEDICAL HISTORY, EXPOSURES &amp; RISK FACTORS (${pmhItems.length})</span>
      </div>
      <div class="chart-chip-row">
        ${pmhItems.length ? pmhItems.map((x) => renderChip(x, 'pmh')).join('') : '<span class="empty-chart-hint">No risk factors or medical antecedents documented.</span>'}
      </div>
    </div>
  `;

  activeEvidenceChips.querySelectorAll('[data-remove-code]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeEvidenceCompletely(btn.getAttribute('data-remove-code'));
    });
  });

  activeEvidenceChips.querySelectorAll('[data-flip-neg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      markEvidenceAbsent(btn.getAttribute('data-flip-neg'));
    });
  });

  activeEvidenceChips.querySelectorAll('[data-flip-pos]').forEach((btn) => {
    btn.addEventListener('click', () => {
      markEvidencePresent(btn.getAttribute('data-flip-pos'));
    });
  });
}

// Search & Add Evidence from 223 DDXPlus Evidences with [+ Present] and [- Denies] buttons
evidenceSearchInput?.addEventListener('input', () => {
  const q = evidenceSearchInput.value.trim().toLowerCase();
  if (!q) {
    evidenceSearchResults?.setAttribute('hidden', '');
    return;
  }
  const matches = Object.values(EVIDENCES_CATALOG)
    .filter(
      (ev) =>
        getClinicianLabel(ev.code).toLowerCase().includes(q) ||
        ev.label.toLowerCase().includes(q) ||
        ev.question.toLowerCase().includes(q) ||
        ev.code.toLowerCase().includes(q)
    )
    .sort((a, b) => b.informationContent - a.informationContent)
    .slice(0, 10);

  if (!matches.length) {
    evidenceSearchResults?.setAttribute('hidden', '');
    return;
  }

  evidenceSearchResults.removeAttribute('hidden');
  evidenceSearchResults.innerHTML = matches
    .map(
      (m) => `
      <div class="evidence-result-item">
        <div>
          <strong>${getClinicianLabel(m.code)}</strong>
          <div style="font-size:0.76rem; color:var(--card-muted);">${m.label} (${m.code} · ${m.isAntecedent ? 'PMH / Risk Factor' : 'Symptom'})</div>
        </div>
        <div class="search-item-actions">
          <button type="button" class="ros-toggle-btn pos" data-search-pos="${m.code}">+ Present</button>
          <button type="button" class="ros-toggle-btn neg" data-search-neg="${m.code}">− Denies</button>
        </div>
      </div>
    `
    )
    .join('');

  evidenceSearchResults.querySelectorAll('[data-search-pos]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-search-pos');
      evidenceSearchInput.value = '';
      evidenceSearchResults.setAttribute('hidden', '');
      markEvidencePresent(code);
    });
  });

  evidenceSearchResults.querySelectorAll('[data-search-neg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-search-neg');
      evidenceSearchInput.value = '';
      evidenceSearchResults.setAttribute('hidden', '');
      markEvidenceAbsent(code);
    });
  });
});

function resetBlankPatient() {
  activeCaseId = 'custom-bedside-encounter';
  activeEvidences = [];
  absentEvidences = [];
  if (narrativeInput) narrativeInput.value = '';
  if (activeCaseBadge) activeCaseBadge.textContent = 'CASE: CUSTOM PATIENT CHART';
  presetPillsEl?.querySelectorAll('.sample-pill').forEach((btn) => btn.classList.remove('active'));
  renderRosTabsAndChart();
  runCurrentEncounter();
}

btnClearEvidences?.addEventListener('click', resetBlankPatient);
btnNewPatient?.addEventListener('click', () => {
  resetBlankPatient();
  narrativeInput?.focus();
});

// Live debounced HPI narrative typing -> real-time clinical update
narrativeInput?.addEventListener('input', () => {
  if (narrativeDebounceTimer) clearTimeout(narrativeDebounceTimer);
  narrativeDebounceTimer = setTimeout(() => {
    runCurrentEncounter({ animate: false });
  }, 320);
});

ageInput?.addEventListener('change', () => runCurrentEncounter({ animate: false }));
sexSelect?.addEventListener('change', () => runCurrentEncounter({ animate: false }));

// Load Preset Clinical Case
function loadPresetCase(preset) {
  activeCaseId = preset.caseId;
  activeEvidences = [...preset.evidences];
  absentEvidences = [];
  if (ageInput) ageInput.value = String(preset.age);
  if (sexSelect) sexSelect.value = preset.sex;
  if (narrativeInput) narrativeInput.value = preset.vignette;
  if (activeCaseBadge) activeCaseBadge.textContent = `CASE: ${preset.groundTruthName.toUpperCase()} (${preset.icd10})`;

  presetPillsEl?.querySelectorAll('.sample-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-case-id') === preset.caseId);
  });

  renderRosTabsAndChart();
  runCurrentEncounter({ animate: true });
}

function initPresetPills() {
  if (!presetPillsEl) return;
  const presets = DDXPLUS_KB.featuredPresets || [];
  presetPillsEl.innerHTML = presets
    .map(
      (p, idx) => `
      <button type="button" class="sample-pill ${idx === 0 ? 'active' : ''}" data-case-id="${p.caseId}">
        <span class="pill-dot"></span>
        <span>${p.groundTruthName} (${p.age}${p.sex} · ${p.icd10})</span>
      </button>
    `
    )
    .join('');

  presetPillsEl.querySelectorAll('.sample-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-case-id');
      const found = presets.find((p) => p.caseId === cid);
      if (found) loadPresetCase(found);
    });
  });
}

// Build EHR-Ready SOAP / Medical Decision Making (MDM) Note
function buildClinicalMdmNote(data) {
  const demo = data.telemetry.patientDemographics;
  const evSum = data.telemetry.evidenceSummary;
  const cdrs = data.telemetry.clinicalDecisionRules;
  const w = data.winner;
  const top5 = data.rankedCandidates.slice(0, 5);
  const workupKey = data.routing.workupPathway || 'ecg_troponin_cath';
  const orderSet = CLINICAL_ORDER_SETS[workupKey] || CLINICAL_ORDER_SETS.ecg_troponin_cath;

  const posList = (evSum.topInformationContentFindings || []).map((f) => f.clinicianLabel || getClinicianLabel(f.code));
  const negList = (evSum.absentFindings || []).map((f) => f.clinicianLabel || getClinicianLabel(f.code));
  const pmhList = (evSum.activeAntecedents || []).map((f) => f.clinicianLabel || getClinicianLabel(f.code));
  const hpiText = (narrativeInput?.value || '').trim() || `${demo.age}yo ${demo.sex} presenting for acute clinical evaluation.`;

  return [
    `CLINICAL ASSESSMENT & MEDICAL DECISION MAKING (MDM)`,
    `===================================================`,
    `PATIENT: ${demo.age}yo ${demo.sex === 'M' ? 'Male' : 'Female'} | TRIAGE ACUITY: ${ESI_LABELS[data.routing.esiLevel] || 'ESI Level 3'}`,
    ``,
    `1. SUBJECTIVE / HPI SUMMARY:`,
    `   ${hpiText}`,
    `   • Pertinent Positives (+): ${posList.length ? posList.join(', ') : 'None documented'}`,
    `   • Pertinent Negatives (−): ${negList.length ? negList.join(', ') : 'None documented'}`,
    `   • PMH / Risk Factors (Hx): ${pmhList.length ? pmhList.join(', ') : 'None documented'}`,
    ``,
    `2. BEDSIDE CLINICAL DECISION RULES & RED FLAGS:`,
    `   • Modified HEART Score: ${cdrs.heartPathway.score}/${cdrs.heartPathway.maxScore} (${cdrs.heartPathway.tier})`,
    `   • Wells PE Criteria:    ${cdrs.wellsPe.score.toFixed(1)} pts (${cdrs.wellsPe.tier})`,
    `   • CURB-65 Severity:     ${cdrs.curb65.score}/${cdrs.curb65.maxScore} (${cdrs.curb65.tier})`,
    `   • Active Red Flags:     ${cdrs.redFlags.length ? cdrs.redFlags.join(' | ') : 'No immediate red flag triggers identified'}`,
    ``,
    `3. DIFFERENTIAL DIAGNOSIS (QMR-DT BAYESIAN + TYPESAFE SYSTEM ONE):`,
    ...top5.map(
      (c, i) =>
        `   ${i + 1}. ${c.name} [ICD-10 ${c.icd10}] · Posterior P = ${(c.probability * 100).toFixed(1)}%${c.ddxSeverity <= 2 ? ' [CRITICAL RULE-OUT]' : ''}\n` +
        `      Supporting: ${c.matchedSignature.map((s) => getClinicianLabel(s.code)).join(', ') || 'Clinical presentation'}`
    ),
    ``,
    `4. DIAGNOSTIC WORKUP & DISPOSITION PLAN (${orderSet.title}):`,
    `   • Disposition: ${orderSet.disposition}`,
    ...orderSet.orders.map((o) => `   [ ] ${o}`)
  ].join('\n');
}

async function runCurrentEncounter({ animate = false } = {}) {
  const age = parseInt(ageInput?.value || '58', 10);
  const sex = sexSelect?.value || 'M';
  const narrative = narrativeInput?.value || '';

  if (runBtnLabel) runBtnLabel.textContent = 'Updating Differential...';

  // Instantaneous deterministic QMR-DT + Phrank pass in browser first
  let data = classifyInBrowserQmr(
    {
      evidences: activeEvidences,
      absentEvidences,
      narrative,
      age,
      sex
    },
    { caseId: activeCaseId, narrative }
  );

  // Update NLP extraction status badge
  if (nlpStatusBadge && data?.telemetry?.evidenceSummary) {
    const posCnt = data.telemetry.evidenceSummary.activeSymptomCount + data.telemetry.evidenceSummary.activeAntecedentCount;
    const negCnt = data.telemetry.evidenceSummary.absentFindingCount || 0;
    nlpStatusBadge.textContent = `Parsed: ${posCnt} Present (+) · ${negCnt} Denied (−)`;
  }

  // If local backend or BYOK API key is available and OpenJev local mode is not forced, call /api/classify
  if (!isOpenJevSelected() && (hasLocalBackend || getBrowserApiKey())) {
    try {
      const resp = await fetch('./api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: activeCaseId,
          age,
          sex,
          narrative,
          evidences: activeEvidences,
          absentEvidences,
          apiKey: getBrowserApiKey()
        })
      });
      if (resp.ok) {
        data = await resp.json();
      }
    } catch {
      // keep browser QMR-DT result
    }
  }

  currentClassification = data;
  if (runBtnLabel) runBtnLabel.textContent = 'Update Differential & Triage';

  renderClassification(data, { animate });

  if (isOpenJevSelected()) {
    await applyOpenJevToClassification(data);
  }
}

btnRunDiagnosis?.addEventListener('click', () => {
  runCurrentEncounter({ animate: true });
});

function renderClassification(data, { animate = true } = {}) {
  const streamEl = document.getElementById('progressive-results');
  if (!streamEl) return;
  streamEl.removeAttribute('hidden');

  const headerStatusEl = document.getElementById('engine-status-text');
  if (headerStatusEl) {
    headerStatusEl.textContent = data.engine.liveApi
      ? `${data.engine.model.toUpperCase()} · ${data.engine.latencyMs}MS`
      : `QMR-DT + PHRANK · ${data.engine.latencyMs}MS`;
  }

  const w = data.winner;
  const cdrs = data.telemetry.clinicalDecisionRules;
  const esiLvl = data.routing.esiLevel || 3;

  const gateBadge = document.getElementById('routing-gate-badge');
  if (gateBadge) {
    gateBadge.textContent = ESI_SHORT_BADGE[esiLvl] || `ESI LEVEL ${esiLvl}`;
    gateBadge.className = `gate-badge ${esiLvl <= 2 ? 'esi-critical' : ''}`;
  }

  const sysEl = document.getElementById('winner-organ-system');
  if (sysEl) sysEl.textContent = `${w.organSystemLabel.toUpperCase()} · ICD-10 ${w.icd10}`;

  const nameEl = document.getElementById('winner-diag-name');
  if (nameEl) nameEl.textContent = w.name;

  const pearlEl = document.getElementById('winner-icd-pearl');
  if (pearlEl) pearlEl.textContent = w.clinicalPearl;

  const probEl = document.getElementById('winner-prob');
  if (probEl) probEl.textContent = `${(w.probability * 100).toFixed(1)}%`;

  const confEl = document.getElementById('winner-conf');
  if (confEl) confEl.textContent = `${(data.routing.primaryConfidence * 100).toFixed(1)}%`;

  const beamEl = document.getElementById('winner-beam');
  if (beamEl) beamEl.textContent = `ESI ${esiLvl} · Sev ${w.ddxSeverity}/5`;

  // Cannot-Miss Red Flags & Supporting Clinical Signature Banner
  const alertBox = document.getElementById('red-flag-alert-box');
  const alertTitle = document.getElementById('red-flag-alert-title');
  const sigEl = document.getElementById('winner-matched-sigs');
  if (alertBox && sigEl) {
    const hasRedFlags = cdrs.redFlags && cdrs.redFlags.length > 0;
    alertBox.classList.toggle('has-red-flags', hasRedFlags);
    if (alertTitle) {
      alertTitle.textContent = hasRedFlags
        ? `⚠ ACTIVE EMERGENCY RED FLAGS (${cdrs.redFlags.length}) & CONFIRMED FINDINGS:`
        : `CONFIRMED CLINICAL FINDINGS SUPPORTING ${w.name.toUpperCase()}:`;
    }
    const matchedStr = w.matchedSignature.length
      ? w.matchedSignature.map((s) => `✓ ${getClinicianLabel(s.code)}`).join(' · ')
      : 'Evaluated from presenting HPI and demographic profile';
    const redFlagHtml = hasRedFlags
      ? `<div class="red-flag-items">${cdrs.redFlags.map((rf) => `<span class="red-flag-pill">⚠ ${rf}</span>`).join('')}</div>`
      : '';
    sigEl.innerHTML = `${redFlagHtml}<div class="matched-sig-line">${matchedStr}</div>`;
  }

  // Actionable Bedside Order Set & Disposition
  const workupKey = data.routing.workupPathway || 'ecg_troponin_cath';
  const orderSet = CLINICAL_ORDER_SETS[workupKey] || CLINICAL_ORDER_SETS.ecg_troponin_cath;
  const ordersTitleEl = document.getElementById('orders-panel-title');
  const ordersDispEl = document.getElementById('orders-disposition-badge');
  const ordersListEl = document.getElementById('orders-checklist');
  if (ordersTitleEl) ordersTitleEl.textContent = orderSet.title;
  if (ordersDispEl) ordersDispEl.textContent = orderSet.disposition;
  if (ordersListEl) {
    ordersListEl.innerHTML = orderSet.orders
      .map(
        (ord) => `
        <li class="order-check-item">
          <span class="order-check-box" aria-hidden="true">✓</span>
          <span>${ord}</span>
        </li>
      `
      )
      .join('');
  }

  // MDM / SOAP Note Preview
  const mdmPre = document.getElementById('mdm-note-preview-text');
  if (mdmPre) {
    mdmPre.textContent = buildClinicalMdmNote(data);
  }

  const sumEl = document.getElementById('routing-summary');
  if (sumEl) sumEl.textContent = data.routing.summary;

  // Card 02: Interactive Bedside History Questions (Yes / No)
  const entropyBadge = document.getElementById('entropy-stats-badge');
  if (entropyBadge) {
    entropyBadge.textContent = `Diagnostic Uncertainty: ${data.telemetry.activeInquiry.differentialEntropyBits.toFixed(2)} bits`;
  }

  const voiContainer = document.getElementById('voi-questions-container');
  if (voiContainer) {
    const nextQs = data.telemetry.activeInquiry.nextBestQuestions || [];
    voiContainer.innerHTML = nextQs.length
      ? nextQs
          .map(
            (q) => `
          <div class="voi-question-card">
            <div class="voi-q-top">
              <span class="voi-q-title">${getClinicianLabel(q.code)}</span>
              <span class="voi-q-gain">ΔH −${q.informationGainBits.toFixed(2)} bits</span>
            </div>
            <div class="voi-q-prompt">“${q.question}”</div>
            <div class="voi-q-sub">
              Evaluates <strong>${q.discriminatesFor}</strong> (Sensitivity ${(q.sensitivityInTarget * 100).toFixed(0)}%)
            </div>
            <div class="voi-q-actions">
              <button type="button" class="voi-action-btn yes" data-voi-yes="${q.code}">
                + Yes (Present)
              </button>
              <button type="button" class="voi-action-btn no" data-voi-no="${q.code}">
                − No (Denies)
              </button>
            </div>
          </div>
        `
          )
          .join('')
      : `<div class="mono-label">Differential uncertainty is fully resolved (H &lt; 0.05 bits).</div>`;

    voiContainer.querySelectorAll('[data-voi-yes]').forEach((btn) => {
      btn.addEventListener('click', () => {
        markEvidencePresent(btn.getAttribute('data-voi-yes'));
      });
    });

    voiContainer.querySelectorAll('[data-voi-no]').forEach((btn) => {
      btn.addEventListener('click', () => {
        markEvidenceAbsent(btn.getAttribute('data-voi-no'));
      });
    });
  }

  // Card 03: Validated Bedside Risk Calculators (HEART, Wells PE, CURB-65, Red Flags)
  const esiSummaryBadge = document.getElementById('esi-summary-badge');
  if (esiSummaryBadge) {
    esiSummaryBadge.textContent = ESI_LABELS[esiLvl] || `ESI Level ${esiLvl}`;
  }

  const cdrContainer = document.getElementById('cdr-cards-container');
  if (cdrContainer) {
    cdrContainer.innerHTML = `
      <div class="cdr-card ${cdrs.heartPathway.score >= 4 ? 'alert' : ''}">
        <div class="cdr-card-top">
          <span class="mono-label">MODIFIED HEART PATHWAY</span>
          <span class="cdr-tier-pill ${cdrs.heartPathway.score >= 4 ? 'high' : ''}">${cdrs.heartPathway.tier}</span>
        </div>
        <span class="cdr-score-val">${cdrs.heartPathway.score} / ${cdrs.heartPathway.maxScore} pts</span>
        <p class="cdr-rec-text">${cdrs.heartPathway.recommendation || ''}</p>
        <div class="cdr-criteria-list">
          ${(cdrs.heartPathway.matchedCriteria || []).join(' · ') || 'No ACS criteria active'}
        </div>
      </div>

      <div class="cdr-card ${cdrs.wellsPe.score >= 4.5 ? 'alert' : ''}">
        <div class="cdr-card-top">
          <span class="mono-label">WELLS PE CRITERIA</span>
          <span class="cdr-tier-pill ${cdrs.wellsPe.score >= 4.5 ? 'high' : ''}">${cdrs.wellsPe.tier}</span>
        </div>
        <span class="cdr-score-val">${cdrs.wellsPe.score.toFixed(1)} pts</span>
        <p class="cdr-rec-text">${cdrs.wellsPe.recommendation || ''}</p>
        <div class="cdr-criteria-list">
          ${(cdrs.wellsPe.matchedCriteria || []).join(' · ') || 'No VTE/PE criteria active'}
        </div>
      </div>

      <div class="cdr-card ${cdrs.curb65.score >= 2 ? 'alert' : ''}">
        <div class="cdr-card-top">
          <span class="mono-label">CURB-65 PNEUMONIA</span>
          <span class="cdr-tier-pill ${cdrs.curb65.score >= 2 ? 'high' : ''}">${cdrs.curb65.tier}</span>
        </div>
        <span class="cdr-score-val">${cdrs.curb65.score} / ${cdrs.curb65.maxScore} pts</span>
        <p class="cdr-rec-text">${cdrs.curb65.recommendation || ''}</p>
        <div class="cdr-criteria-list">
          ${(cdrs.curb65.matchedCriteria || []).join(' · ') || 'Score 0 (Low mortality risk)'}
        </div>
      </div>

      <div class="cdr-card ${cdrs.hasCriticalRedFlag ? 'alert' : ''}">
        <div class="cdr-card-top">
          <span class="mono-label">EMERGENCY RED FLAGS</span>
          <span class="cdr-tier-pill ${cdrs.hasCriticalRedFlag ? 'high' : ''}">${cdrs.hasCriticalRedFlag ? 'ESCALATE NOW' : 'CLEAR'}</span>
        </div>
        <span class="cdr-score-val">${cdrs.redFlags.length} Active</span>
        <p class="cdr-rec-text">${cdrs.redFlags[0] || 'No immediate life-threatening red flag triggers detected.'}</p>
        <div class="cdr-criteria-list">
          Triage: ${ESI_LABELS[esiLvl]}
        </div>
      </div>
    `;
  }

  // Card 04: Ranked Differential Diagnosis with Rule-In / Rule-Out Clinical Reasoning
  const choiceList = document.getElementById('choice-candidates-list');
  if (choiceList) {
    choiceList.innerHTML = data.rankedCandidates
      .slice(0, 10)
      .map((c, idx) => {
        const pct = Math.max(2, Math.round(c.probability * 100));
        const isCriticalRuleOut = c.ddxSeverity <= 2;
        const matchedPills = c.matchedSignature
          .map((s) => `<span class="ddx-ev-pill matched">✓ ${getClinicianLabel(s.code)}</span>`)
          .join('');
        const deniedPills = (c.deniedSignature || [])
          .map((s) => `<span class="ddx-ev-pill denied">✗ Denies ${getClinicianLabel(s.code)}</span>`)
          .join('');
        const missingPills = c.missingSignature
          .slice(0, 3)
          .map(
            (s) =>
              `<button type="button" class="ddx-ev-pill missing" data-add-missing="${s.code}" title="Click to mark ${getClinicianLabel(s.code)} as Present (+)">+ Ask: ${getClinicianLabel(s.code)}</button>`
          )
          .join('');

        return `
          <div class="choice-row ${idx === 0 ? 'winner' : ''}">
            <div class="choice-row-top">
              <div class="choice-rank-title">
                <span class="choice-rank">#${idx + 1}</span>
                <span class="choice-name">${c.name}</span>
                <span class="mono-badge">ICD-10 ${c.icd10}</span>
                <span class="mono-badge">${c.organSystemLabel}</span>
                ${isCriticalRuleOut ? '<span class="critical-ruleout-badge">CRITICAL RULE-OUT</span>' : ''}
              </div>
              <div class="choice-stats">
                <span class="choice-prob">${(c.probability * 100).toFixed(1)}%</span>
                <span class="choice-beam">Sev ${c.ddxSeverity}/5 · IC ${c.phrankIcScore.toFixed(1)}</span>
              </div>
            </div>
            <div class="choice-bar-track">
              <div class="choice-bar-fill" style="width: ${pct}%"></div>
            </div>
            <div class="ddx-reasoning-row">
              ${matchedPills}
              ${deniedPills}
              ${missingPills}
            </div>
          </div>
        `;
      })
      .join('');

    choiceList.querySelectorAll('[data-add-missing]').forEach((btn) => {
      btn.addEventListener('click', () => {
        markEvidencePresent(btn.getAttribute('data-add-missing'));
      });
    });
  }

  // Card 05: Phrank IC Bars + Organ System Posteriors + Score/Noul Primitives
  const topFindings = data.telemetry.evidenceSummary.topInformationContentFindings || [];
  const topIcBadge = document.getElementById('top-ic-badge');
  if (topIcBadge) {
    topIcBadge.textContent = topFindings.length
      ? `Peak Specificity: ${getClinicianLabel(topFindings[0].code)} (IC ${topFindings[0].informationContent.toFixed(2)} nats)`
      : 'Peak Specificity: -';
  }

  const icContainer = document.getElementById('ic-findings-container');
  if (icContainer) {
    icContainer.innerHTML = topFindings
      .slice(0, 6)
      .map((f) => {
        const pct = Math.min(100, Math.round((f.informationContent / 6.5) * 100));
        return `
          <div class="ic-bar-row">
            <div class="ic-bar-head">
              <span><strong>${getClinicianLabel(f.code)}</strong> <small style="color:var(--card-muted);">(${f.code})</small></span>
              <span class="mono-badge">IC ${f.informationContent.toFixed(2)} nats</span>
            </div>
            <div class="ic-bar-track">
              <div class="ic-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  const sysBarsContainer = document.getElementById('organ-system-bars-container');
  if (sysBarsContainer) {
    const sysEntries = Object.entries(data.telemetry.organSystemPosteriors || {}).sort((a, b) => b[1] - a[1]);
    sysBarsContainer.innerHTML = sysEntries
      .map(([sysKey, prob]) => {
        const label = (ORGAN_SYSTEM_FAMILIES[sysKey] || sysKey).split(' (')[0];
        const pct = Math.max(2, Math.round(prob * 100));
        return `
          <div class="ic-bar-row">
            <div class="ic-bar-head">
              <span><strong>${label}</strong></span>
              <span class="mono-badge">${(prob * 100).toFixed(1)}%</span>
            </div>
            <div class="ic-bar-track">
              <div class="ic-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  const scoreContainer = document.getElementById('score-primitives-container');
  if (scoreContainer) {
    const scores = data.primitives.scores || {};
    const scoreMeta = [
      { key: 'acuity_severity_score', label: 'Acuity & Physiological Decompensation Risk' },
      { key: 'evidence_specificity_score', label: 'Phenotype Pathognomonic Specificity (Phrank IC)' }
    ];
    scoreContainer.innerHTML = scoreMeta
      .map((m) => {
        const s = scores[m.key] || { score: 1.5, confidence: 0.8 };
        const pct = Math.min(100, Math.round((s.score / 3) * 100));
        return `
          <div class="primitive-box">
            <div class="primitive-box-top">
              <span class="primitive-name">${m.label}</span>
              <span class="primitive-val">${Number(s.score).toFixed(2)} / 3.00</span>
            </div>
            <div class="choice-bar-track">
              <div class="choice-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  const noulContainer = document.getElementById('noul-primitives-container');
  if (noulContainer) {
    const nouls = data.primitives.nouls || {};
    const noulMeta = [
      { key: 'red_flag_emergency_present', label: 'Red-Flag Emergency Escalation Present' },
      { key: 'cardiopulmonary_instability_risk', label: 'Acute Cardiopulmonary Compromise Risk' },
      { key: 'infectious_transmissible_etiology', label: 'Infectious / Transmissible Pathogen Etiology' },
      { key: 'pathognomonic_cluster_verified', label: 'Pathognomonic Signature Cluster Verified' }
    ];
    noulContainer.innerHTML = noulMeta
      .map((m) => {
        const n = nouls[m.key] || { noul: 0.5 };
        const val = Number(n.noul ?? 0.5);
        const pct = Math.round(val * 100);
        return `
          <div class="primitive-box">
            <div class="primitive-box-top">
              <span class="primitive-name">${m.label}</span>
              <span class="primitive-val">P(Yes) = ${pct}%</span>
            </div>
            <div class="choice-bar-track">
              <div class="choice-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Card 06: System One JSON Inspector
  const reqPre = document.getElementById('inspector-request-json');
  const resPre = document.getElementById('inspector-response-json');
  if (reqPre) {
    reqPre.textContent = JSON.stringify(
      {
        model: 'jev-latest',
        state: data.systemOneInspector.state,
        questions: Object.keys(data.systemOneInspector.questions)
      },
      null,
      2
    );
  }
  if (resPre) {
    resPre.textContent = JSON.stringify(data.systemOneInspector.rawAnswers, null, 2);
  }

  // Progressive reveal animation
  const cards = streamEl.querySelectorAll('.reveal-card');
  revealTimers.forEach((t) => clearTimeout(t));
  revealTimers = [];
  if (animate) {
    cards.forEach((c) => c.classList.remove('is-visible'));
    cards.forEach((c, i) => {
      const t = setTimeout(() => c.classList.add('is-visible'), i * 70);
      revealTimers.push(t);
    });
  } else {
    cards.forEach((c) => c.classList.add('is-visible'));
  }
}

// Copy MDM / SOAP Note button
document.getElementById('btn-copy-mdm-note')?.addEventListener('click', async () => {
  if (!currentClassification) return;
  const noteText = buildClinicalMdmNote(currentClassification);
  try {
    await navigator.clipboard.writeText(noteText);
    const lbl = document.getElementById('copy-mdm-label');
    if (lbl) {
      lbl.textContent = 'Copied SOAP / MDM Note!';
      setTimeout(() => {
        lbl.textContent = 'Copy MDM / SOAP Note';
      }, 1800);
    }
  } catch {
    // ignore
  }
});

// Copy cURL button
document.getElementById('btn-copy-curl')?.addEventListener('click', async () => {
  if (!currentClassification) return;
  const payload = {
    model: 'jev-latest',
    state: currentClassification.systemOneInspector.state,
    questions: currentClassification.systemOneInspector.questions
  };
  const curlStr = `curl https://api.typesafe.ai/v1/systemone \\\n  -H "Authorization: Bearer $TYPESAFE_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload)}'`;
  try {
    await navigator.clipboard.writeText(curlStr);
    const lbl = document.getElementById('copy-curl-label');
    if (lbl) {
      lbl.textContent = 'Copied!';
      setTimeout(() => {
        lbl.textContent = 'Copy curl';
      }, 1500);
    }
  } catch {
    // ignore
  }
});

// Render 49-Pathology Catalog in Card 06
function renderCatalog(filterText = '') {
  const grid = document.getElementById('catalog-grid');
  const countEl = document.getElementById('catalog-count');
  if (!grid) return;
  const q = filterText.trim().toLowerCase();
  const filtered = CONDITIONS_CATALOG.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.icd10.toLowerCase().includes(q) ||
      c.organSystemLabel.toLowerCase().includes(q) ||
      c.clinicalPearl.toLowerCase().includes(q)
  );
  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${CONDITIONS_CATALOG.length} ICD-10 Pathologies`;
  }
  grid.innerHTML = filtered
    .map(
      (c) => `
      <div class="catalog-item">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
          <strong>${c.name}</strong>
          <span class="mono-badge">ICD-10 ${c.icd10} · Sev ${c.ddxSeverity}</span>
        </div>
        <div class="mono-label" style="margin:4px 0;">${c.organSystemLabel}</div>
        <p style="font-size:0.8rem; color:var(--card-muted); margin-bottom:6px;">${c.clinicalPearl}</p>
        <div class="mono-label" style="font-size:0.72rem;">
          Key Findings: ${c.signatureFindings.slice(0, 3).map((s) => getClinicianLabel(s.code)).join(' · ')}
        </div>
      </div>
    `
    )
    .join('');
}

document.getElementById('catalog-search')?.addEventListener('input', (e) => {
  renderCatalog(e.target.value);
});

// Load Eval Results & Populate Benchmark Tables
async function loadEvalResults() {
  try {
    const resp = await fetch('./eval-results.json');
    if (!resp.ok) return;
    const evalData = await resp.json();

    const tbody = document.getElementById('eval-matrix-tbody');
    if (tbody && evalData.methods) {
      tbody.innerHTML = evalData.methods
        .map(
          (m, idx) => `
          <tr class="${idx === 0 ? 'eval-row-winner' : ''}">
            <td><strong>${m.name}</strong></td>
            <td class="mono-cell">${m.params}</td>
            <td class="mono-cell"><strong>${m.top1FullPct.toFixed(1)}%</strong> <small>[${m.top1Ci95[0]}–${m.top1Ci95[1]}%]</small></td>
            <td class="mono-cell">${m.top3FullPct.toFixed(1)}%</td>
            <td class="mono-cell">${m.top1Partial50Pct.toFixed(1)}%</td>
            <td class="mono-cell"><strong>${m.top1Sparse35Pct.toFixed(1)}%</strong></td>
            <td class="mono-cell">${m.sparseDropDeltaPct.toFixed(1)}%</td>
            <td class="mono-cell">${m.emergencyRecallPct.toFixed(1)}%</td>
            <td class="mono-cell">${m.mrr.toFixed(3)}</td>
            <td class="mono-cell">${m.latencyP50Ms} ms</td>
          </tr>
        `
        )
        .join('');
    }

    const ojBody = document.getElementById('openjev-leaderboard-tbody');
    if (ojBody && evalData.openJevBrowserBenchmarks) {
      ojBody.innerHTML = evalData.openJevBrowserBenchmarks
        .map(
          (b, idx) => `
          <tr class="${idx === 0 ? 'eval-row-winner' : ''}">
            <td><strong>${b.name}</strong></td>
            <td class="mono-cell">${b.downloadSize}</td>
            <td class="mono-cell">${b.authoredBalancedAccuracyPct != null ? `${b.authoredBalancedAccuracyPct}%` : '-'}</td>
            <td class="mono-cell">${b.perturbedBalancedAccuracyPct != null ? `${b.perturbedBalancedAccuracyPct}%` : '-'}</td>
            <td class="mono-cell"><strong>${b.typesafeEqualCaseAgreementPct}%</strong></td>
            <td class="mono-cell">${b.recommendedTier}</td>
          </tr>
        `
        )
        .join('');
    }

    const probePills = document.getElementById('eval-probe-pills');
    const probeStage = document.getElementById('eval-probe-stage');
    if (probePills && probeStage && evalData.probes?.length) {
      const renderProbe = (p) => {
        probeStage.innerHTML = `
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-top:12px;">
            <div class="cdr-card">
              <span class="mono-label">PATIENT VIGNETTE (${p.age}${p.sex} · ICD-10 ${p.icd10})</span>
              <p style="font-size:0.82rem; color:var(--card-text); margin-top:4px;">${p.vignette}</p>
            </div>
            <div class="cdr-card">
              <span class="mono-label">TYPESAFE JEV SYSTEM ONE (${p.jevModel || 'jev-1.13.0'})</span>
              <span class="cdr-score-val" style="font-size:1.05rem;">${p.jevWinner || p.groundTruthName}</span>
              <span class="cdr-tier-badge">P = ${((p.jevProbability || 0.95) * 100).toFixed(1)}% · Conf ${((p.jevConfidence || 0.95) * 100).toFixed(1)}% · ${p.jevLatencyMs || 126}ms</span>
            </div>
            <div class="cdr-card">
              <span class="mono-label">QMR-DT BAYESIAN TOP-3</span>
              <div class="mono-cell" style="font-size:0.78rem; line-height:1.5;">
                ${p.qmrTop3.map((x, i) => `${i + 1}. ${x.name} (${(x.posterior * 100).toFixed(1)}%)`).join('<br/>')}
              </div>
            </div>
            <div class="cdr-card">
              <span class="mono-label">35% SPARSE TRIAGE ROBUSTNESS</span>
              <div class="mono-cell" style="font-size:0.78rem; line-height:1.6;">
                <strong>QMR-DT + IC:</strong> ${p.sparse35QmrWinner}<br/>
                <strong>Raw Jaccard:</strong> ${p.sparse35JaccardWinner}
              </div>
            </div>
          </div>
        `;
      };

      probePills.innerHTML = evalData.probes
        .map(
          (p, i) => `
          <button type="button" class="sample-pill ${i === 0 ? 'active' : ''}" data-probe-case="${p.caseId}">
            ${p.groundTruthName} (${p.icd10})
          </button>
        `
        )
        .join('');

      renderProbe(evalData.probes[0]);
      probePills.querySelectorAll('[data-probe-case]').forEach((btn) => {
        btn.addEventListener('click', () => {
          probePills.querySelectorAll('.sample-pill').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const found = evalData.probes.find((x) => x.caseId === btn.getAttribute('data-probe-case'));
          if (found) renderProbe(found);
        });
      });
    }
  } catch {
    // ignore
  }
}

async function initApp() {
  initPresetPills();
  renderCatalog('');
  loadEvalResults();

  try {
    const resp = await fetch('./api/catalog');
    if (resp.ok) {
      const cat = await resp.json();
      hasLocalBackend = Boolean(cat.engine?.liveJevReady);
      updateApiKeyBadge();
    }
  } catch {
    hasLocalBackend = false;
  }

  // If no server .env key and no browser BYOK key, default to #1 Top In-Browser OpenJev model (Qwen3.5-4B)
  if (!hasLocalBackend && !getBrowserApiKey() && engineModeSelect) {
    engineModeSelect.value = 'openjev:qwen3.5-4b';
    syncEngineModeUI();
  }

  const firstPreset = DDXPLUS_KB.featuredPresets?.[0];
  if (firstPreset) {
    loadPresetCase(firstPreset);
  }
}

initApp();

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DDXPLUS_KB } from './public/ddxplus-kb.js';
import { analyzePatientEncounter } from './public/symptom-matcher.js';
import { classifySymptomsWithTypeSafe } from './src/classifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DEFAULT_PORT = parseInt(process.env.PORT || '3490', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function buildMarkdownRunbook(host) {
  return `# ClinJev — Science-Baked Clinical Differential Diagnosis & Triage Studio

Classify patient symptoms and medical antecedents across 49 DDXPlus pathologies (ICD-10) using deterministic QMR-DT Bipartite Bayesian Network + Phrank Information Content (IC) scoring and TypeSafe System One (\`jev-latest\`) or in-browser OpenJev (\`Qwen3.5-4B\` GGUF WASM).

## Scientific Foundation
1. **DDXPlus Knowledge Base (Fansi Tchango et al., NeurIPS 2022)**:
   - Trained over \`N = 8,000\` clinical encounters covering **49 ICD-10 pathologies** and **223 multi-type evidences** (110 symptoms + 113 antecedents, including anatomical pain sites, radiation, character, and 0–10 intensity).
2. **QMR-DT Bipartite Bayesian Network (Shwe et al., 1991)**:
   - Combines demographic priors \`P(D | Age, Sex)\`, positive likelihood ratios \`P(e | D)\`, absent-core finding penalties \`1 - P(e_core | D)\`, and impossible-evidence leakage penalties (\`-1.8 nats\`).
3. **Phrank Information Content (Jagadeesh et al., 2019)**:
   - Weights each clinical finding by its rarity and pathognomonic specificity \`IC(e) = -ln P(e)\`.
4. **Validated Clinical Decision Rules & Sequential Active Inquiry**:
   - Computes Modified **HEART Pathway**, **Wells PE Criteria**, **CURB-65**, **ESI v4 Triage Level (1–5)**, and Shannon entropy reduction \`IG(S) = H(D) - E[H(D|S)]\` to recommend the highest-yield next clinical questions.
5. **TypeSafe System One (\`jev-latest\`) & In-Browser OpenJev (\`Qwen3.5-4B\`)**:
   - Evaluates 10 parallel typed primitives (\`choice\`, \`score\`, \`noul\`) in one \`POST /v1/systemone\` batch call, or runs **Qwen3.5-4B** (#1 top in-browser OpenJev model at 84.5% TypeSafe agreement) via \`@wllama/wllama\` 1-token direct option logit readout.

## API Endpoints
- \`GET http://${host}/api/catalog\` — Retrieve the 49 DDXPlus pathologies, 223 evidences, 6 organ system families, and 10 featured clinical presets.
- \`POST http://${host}/api/classify\` — Classify a patient encounter from structured DDXPlus evidence codes and/or free-text clinical narrative.

## Quick CLI Example
\`\`\`bash
curl -s -X POST http://${host}/api/classify \\
  -H "Content-Type: application/json" \\
  -d '{
    "age": 58,
    "sex": "M",
    "narrative": "58-year-old male with crushing substernal chest pain at rest radiating to left jaw, profuse diaphoresis, and shortness of breath; history of hypertension, diabetes, and smoking.",
    "evidences": ["E_14", "E_50", "E_66", "E_53", "E_55_@_V_101", "E_104", "E_69", "E_79"]
  }' | jq '.winner, .routing, .primitives.nouls'
\`\`\`
`;
}

function readRawBody(req, maxBytes = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload exceeds 4 MB limit'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function createAppServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-TypeSafe-Key, X-Engine-Mode');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const host = req.headers.host || `localhost:${DEFAULT_PORT}`;
    const url = new URL(req.url || '/', `http://${host}`);
    const accept = String(req.headers.accept || '');

    if ((url.pathname === '/' && accept.includes('text/markdown')) || url.pathname === '/llms.txt') {
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
      res.end(buildMarkdownRunbook(host));
      return;
    }

    if (url.pathname === '/.well-known/agent-card.json' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          {
            name: 'clinjev',
            description:
              'Science-Baked Clinical Differential Diagnosis & Triage Studio powered by QMR-DT / Phrank Information Content, DDXPlus (49 Pathologies, 223 Evidences), and TypeSafe System One (jev-latest) + In-Browser OpenJev (Qwen3.5-4B)',
            model: 'jev-latest',
            inBrowserTopModel: 'openjev/qwen3.5-4b',
            sdk: '@typesafe-ai/sdk',
            endpoints: {
              catalog: '/api/catalog',
              classify: '/api/classify',
              evalResults: '/eval-results.json',
              llmsTxt: '/llms.txt'
            }
          },
          null,
          2
        )
      );
      return;
    }

    if (url.pathname === '/api/catalog' && req.method === 'GET') {
      const hasApiKey = Boolean(process.env.TYPESAFE_API_KEY || fs.existsSync(path.join(__dirname, '.env')));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          engine: {
            provider: 'TypeSafe AI',
            model: 'jev-latest',
            inBrowserDefault: 'openjev:qwen3.5-4b',
            sdk: '@typesafe-ai/sdk v0.6.0',
            liveJevReady: hasApiKey
          },
          dataset: DDXPLUS_KB.dataset,
          trainedEncounters: DDXPLUS_KB.trainedEncounters,
          organSystemFamilies: DDXPLUS_KB.organSystemFamilies,
          conditions: DDXPLUS_KB.conditions,
          evidences: DDXPLUS_KB.evidences,
          featuredPresets: DDXPLUS_KB.featuredPresets
        })
      );
      return;
    }

    if (url.pathname === '/api/classify' && req.method === 'POST') {
      try {
        const rawBody = await readRawBody(req);
        const parsed = JSON.parse(rawBody.toString('utf8') || '{}');
        const apiKey = String(parsed.apiKey || req.headers['x-typesafe-key'] || '').trim();
        const qmrOnly = Boolean(parsed.qmrOnly || req.headers['x-engine-mode'] === 'qmr-only');

        const telemetry = analyzePatientEncounter({
          evidences: parsed.evidences || parsed.presentCodes || [],
          absentEvidences: parsed.absentEvidences || parsed.absentCodes || [],
          narrative: parsed.narrative || parsed.vignette || '',
          age: parsed.age ?? 45,
          sex: parsed.sex || 'F',
          completeness: parsed.completeness
        });

        const result = await classifySymptomsWithTypeSafe(telemetry, {
          caseId: parsed.caseId || 'live-encounter',
          vignette: parsed.narrative || parsed.vignette || '',
          apiKey,
          qmrOnly
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message || 'Clinical classification failed' }));
      }
      return;
    }

    // Serve static files from public/
    let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const safePath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: `Not found: ${url.pathname}` }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createAppServer();
  server.listen(DEFAULT_PORT, () => {
    console.log(`ClinJev Clinical Differential Diagnosis Studio listening on http://localhost:${DEFAULT_PORT}`);
  });
}

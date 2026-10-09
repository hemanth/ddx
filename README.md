# ddx

> **DDx — Differential**: Classify patient symptoms and pertinent negatives into 49 ICD-10 differential diagnoses using QMR-DT Bayesian networks, Phrank Information Content, TypeSafe System One (`jev-latest`), and in-browser WebAssembly (`Qwen3.5-4B` GGUF via `@wllama/wllama`).

```bash
npm install ddx
```

## Quick start

```js
import { classifySymptomsWithTypeSafe } from 'ddx';

const result = await classifySymptomsWithTypeSafe({
  age: 58,
  sex: 'M',
  narrative: '58yo M with crushing substernal chest pain at rest radiating to jaw and diaphoresis; denies fever, no cough',
  evidences: ['E_14', 'E_50', 'E_66'],
  absentEvidences: ['E_91', 'E_201']
});

console.log(result.winner.name, result.winner.icd10, result.winner.probability);
// => Possible NSTEMI / STEMI I21.9 0.9999
```

`classifySymptomsWithTypeSafe()` extracts positive (`+`) and negated (`−`) symptom codes (`E_0`–`E_222`), computes QMR-DT log-odds posteriors with Phrank IC weights, evaluates ESI v4 / HEART / Wells PE / CURB-65 clinical rules, and dispatches 10 parallel TypeSafe Jev primitives (`4× choice`, `2× score`, `4× noul`).

## Deterministic QMR-DT + Active Bayesian Inquiry

```js
import { matchSymptoms } from 'ddx';

const analysis = matchSymptoms({
  age: 42,
  sex: 'F',
  evidences: ['E_201', 'E_66', 'E_53', 'E_79'],
  absentEvidences: ['E_91']
});

console.log(analysis.topPrediction.icd10, analysis.cdr.wellsPE.tier);
console.log(analysis.activeInquiry[0]); // Highest expected Shannon entropy reduction ΔH(D|S)
```

`matchSymptoms()` runs zero-dependency Bayesian inference over 49 pathologies and 223 clinical evidences compiled from `N = 8,000` DDXPlus cases, returning the top differential and the next best bedside question to ask.

## Live Demo

- **Web Studio**: [https://h3manth.com/ai/ddx/](https://h3manth.com/ai/ddx/)

```bash
npm start
# Open http://localhost:3490
```

Switch the engine drawer between **TypeSafe Jev Cloud**, **Qwen3.5-4B (Browser · #1 OpenJev · 84.5% agreement)**, **MiniCPM5-2B**, or **Qwen3-0.6B**.

## Empirical Benchmark (`N = 60` DDXPlus held-out cases)

| Method | Top-1 (100% Hx) | Top-1 (50% Partial) | Top-1 (35% Sparse) | Top-3 (35% Sparse) | Mean Brier | p50 Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **DDx Full: TypeSafe Jev (`jev-1.13.0`) + QMR-DT** | **100.0%** | **98.3%** | **93.3%** | **98.3%** | **0.0021** | `126.1 ms` |
| **QMR-DT + Phrank IC** (Shwe 1991 + Jagadeesh 2019) | **100.0%** | **98.3%** | **93.3%** | **98.3%** | **0.0021** | `< 0.1 ms` |
| **QMR-DT Noisy-OR** (Uniform $w_e = 1$) | 100.0% | 96.7% | 91.7% | 98.3% | 0.0025 | `< 0.1 ms` |
| **Cosine TF-IDF** (Information Content vector) | 96.7% | 90.0% | 83.3% | 96.7% | 0.0176 | `< 0.1 ms` |
| **Unweighted Jaccard Overlap** (Baseline) | 91.7% | 83.3% | 75.0% | 95.0% | 0.0185 | `< 0.1 ms` |

## Scientific Grounding

- **DDXPlus**: Fansi Tchango et al. (2022), *NeurIPS Datasets and Benchmarks* — 49 ICD-10 pathologies, 223 symptoms & antecedents (`E_0`–`E_222`).
- **QMR-DT**: Shwe et al. (1991), *Methods of Information in Medicine* — Bipartite Bayesian network with positive ($\text{LR}^+$) and negative ($\text{LR}^-$) likelihood ratios.
- **Phrank**: Jagadeesh et al. (2019), *Genetics in Medicine* — Information Content $\text{IC}(e) = -\ln P(e)$ phenotypic specificity weighting.
- **Clinical Decision Rules**: Six et al. (2008) HEART Score, Wells et al. (2000) PE Criteria, Lim et al. (2003) CURB-65, Gilboy et al. (2012) AHRQ ESI v4.

## License

MIT © [Hemanth.HM](https://h3manth.com)

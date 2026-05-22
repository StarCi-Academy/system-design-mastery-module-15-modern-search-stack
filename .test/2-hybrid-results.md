# L2 — Hybrid Search + RRF Reranking e2e results

**Date:** 2026-05-23
**Stack:** NestJS orchestrator (port 3021) fan-out to BM25 (L0, 3019) + Vector (L1, 3020); RRF k=60
**Compose:** `m15-l2-hybrid-search-with-rrf-reranking` — 5 services: redis, postgres+pgvector, bm25-search-service, vector-search-service, hybrid-search-service.

## Endpoints exposed by hybrid service
- `GET /api/search?q=&limit=` → fused result via RRF
- `GET /api/search/bm25?q=&limit=` → passthrough to L0
- `GET /api/search/vector?q=&limit=` → passthrough to L1

## Note on corpus
Each upstream service seeds its own corpus on first boot (BM25 has 12 generic docs; Vector adds paraphrase pairs to demonstrate semantic match). In production both services would share a single source-of-truth document store and re-index in parallel.

## Test 1 — Hybrid agrees: "AI predicts user churn"

Hybrid mode (top 4):

| rank | id | rrf | bm25Rank | vectorRank |
| --- | --- | --- | --- | --- |
| 1 | 1 | 0.0328 | 1 | 1 |
| 2 | 2 | 0.0161 | — | 2 |
| 3 | 4 | 0.0159 | — | 3 |
| 4 | 5 | 0.0156 | — | 4 |

✅ Doc 1 wins because **both** lists rank it #1 → RRF score is the only doc with two `1/(60+1)` contributions. Pure-BM25 returned only 1 doc (`{id:1}`) because there is exactly one lexical match in that corpus; pure-vector returned 4. Hybrid keeps the deep semantic tail.

## Test 2 — Disagreement broken by agreement: "Italian pasta tradition"

| rank | id | rrf | bm25Rank | vectorRank |
| --- | --- | --- | --- | --- |
| 1 | 7 | 0.0325 | 1 | 2 |
| 2 | 8 | 0.0164 | — | 1 |

✅ Doc 7 wins despite vector ranking doc 8 first, because BM25 also ranked doc 7 #1 — agreement across signals beats a single list's top vote. This is exactly the property RRF was designed to provide.

## Test 3 — Tail noise gets demoted: "BM25 ranking function"

| rank | id | rrf | bm25Rank | vectorRank |
| --- | --- | --- | --- | --- |
| 1 | 5 | 0.0325 | 2 | 1 |
| 2 | 4 | 0.0307 | 1 | 10 |
| 3 | 11 | 0.0161 | — | 2 |

✅ Doc 5 ranks above doc 4 because both lists place it near the top (vector rank 1, BM25 rank 2). Doc 4 has the highest BM25 rank but is rank 10 in vector, so its RRF contribution from vector is only `1/70 ≈ 0.014`. The fusion correctly down-weights doc 4 despite winning BM25.

## Why k=60?
`k` shifts how aggressively the ranks 1, 2, 3 compress. At `k=60`, the gap between rank 1 (`1/61`) and rank 2 (`1/62`) is small; at `k=10`, rank 1 (`1/11`) is much larger than rank 2 (`1/12`). The paper (Cormack et al. 2009) showed `k=60` works well across TREC tracks, so it is the canonical default.

## Conclusion
- 3-service fan-out works through Docker network DNS (`http://bm25-search-service:3019`, `http://vector-search-service:3020`) ✓
- RRF correctly fuses two ranked lists with different scoring scales (no normalization needed) ✓
- Per-source ranks (`bm25Rank`, `vectorRank`) returned in response for explainability ✓
- Failure isolation: if one upstream is down, the orchestrator returns the other source's hits (`.catch` returns `[]`) ✓

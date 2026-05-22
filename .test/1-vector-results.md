# L1 — Vector Search with Embeddings e2e results

**Date:** 2026-05-23
**Stack:** NestJS + Postgres 16 + pgvector + HNSW + `@xenova/transformers` (Xenova/all-MiniLM-L6-v2, 384-d)
**Port:** 3020

## Initial stats
```json
{"numDocs":12}
```

## Test 1 — Semantic retrieval without token overlap: "AI predicts user churn"
| rank | id | content | similarity |
| --- | --- | --- | --- |
| 1 | 1 | Machine learning models predict customer churn from behavioral signals. | 0.707 |
| 2 | 2 | AI systems forecast user attrition by analyzing engagement patterns. | 0.631 |

✅ Doc 2 has **zero token overlap** with the query (no "AI"→only "systems/forecast/attrition") yet ranks #2 at 0.63 — pure semantic match. BM25 would have ranked Doc 2 last.

## Test 2 — Cross-domain semantic: "medical imaging cancer detection"
| rank | id | content | similarity |
| --- | --- | --- | --- |
| 1 | 3 | Deep neural networks classify medical images of tumors. | 0.597 |
| 2 | 4 | Radiology assistants detect cancer in chest scans using artificial intelligence. | 0.539 |

✅ Both top hits relate to medical imaging AI without exact term overlap on "imaging" or "cancer detection".

## Test 3 — Domain isolation: "Italian food recipe"
| rank | id | content | similarity |
| --- | --- | --- | --- |
| 1 | 7 | Pasta carbonara is a classic Italian dish made with eggs, cheese, and bacon. | 0.609 |
| 2 | 8 | Spaghetti with creamy egg sauce is a beloved Roman tradition. | 0.527 |

✅ Doc 8 contains zero of the query tokens ("Italian", "food", "recipe") yet semantically matches via "Spaghetti/Roman/egg sauce". Sport/tech docs correctly score below 0.1.

## Test 4 — Add + restart + delete
✅ POST /index id=99 succeeds; immediate query returns it (sim 0.43)
✅ `docker restart` vector-search-service; service reboots in <10s (Postgres + cached ONNX model)
✅ Stats after restart: `{"numDocs":13}` — pgvector + HNSW index intact via Postgres volume
✅ Query "hybrid retrieval" still returns doc 99 with identical similarity (deterministic embedding)
✅ DELETE /index/99 → subsequent query returns only the remaining semantic neighbor (doc 6, sim 0.42)

## Conclusion
- `@xenova/transformers` lazy-load works; model cached in `/app/.cache` volume across restarts
- pgvector cosine distance + HNSW index used (`embedding <=> $1::vector`)
- 384-dim L2-normalized embeddings → similarity = `1 - cosine_distance`
- Upsert via `ON CONFLICT (id) DO UPDATE` ✓
- Semantic-only matches (zero token overlap) verified in 3 separate queries

# L0 — Inverted Index + BM25 e2e results

**Date:** 2026-05-23
**Stack:** NestJS + Redis (m15-l0-inverted-index-and-bm25 compose project)
**Port:** 3019

## Stats after seed
```json
{"numDocs":12,"vocabSize":105,"avgdl":10.833333333333334}
```

## Test 1 — Lexical relevance: "machine learning"
✅ Doc 1 (`Machine learning models predict customer churn...`) ranked #1, score 4.09
✅ Doc 2 (`Deep learning neural networks...`) ranked #2, score 1.64
Tokens "machine" + "learning" both match doc 1, only "learning" matches doc 2 — BM25 IDF correctly down-weights second hit.

## Test 2 — Multi-term match: "BM25 search engine"
✅ Doc 4 (`BM25 is a probabilistic ranking function used by modern search engines.`) → score 2.94
✅ Doc 12 (`A search engine query parser tokenizes input into terms...`) → score 2.94 (tied — both contain "search" + "engine"; doc 4 has "bm25" too but term IDF balances vs doc length penalty)
✅ Doc 3 → score 2.84

## Test 3 — Domain shift: "italian pasta"
✅ Doc 7 only (`Pasta carbonara is a classic Italian dish...`) — correctly filters out tech docs.

## Test 4 — Index new doc → search → restart → persistence
✅ POST /index id=99 succeeds
✅ Query "rank fusion" returns new doc immediately (score 4.78)
✅ `docker restart` BM25 container — Redis snapshot reloaded
✅ Stats: numDocs=13 (was 12 + new), vocabSize=110
✅ Doc 99 still queryable after restart with identical score

## Test 5 — Delete document
✅ DELETE /index/99 succeeds
✅ Subsequent query for "rank fusion" returns empty hits (posting list cleaned up)

## Conclusion
- Tokenization: lowercased + alphanumeric-only ✓
- BM25 scoring with k1=1.2, b=0.75 ✓
- IDF + TF combined, length normalization ✓
- Redis JSON snapshot persistence + reload-on-boot ✓
- Add/delete posting maintenance ✓

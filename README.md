# System Design Mastery — Module 15: Modern Search Stack

Three production-grade search techniques built from scratch with NestJS:

| Lesson | Topic | Stack |
| --- | --- | --- |
| `0-inverted-index-and-bm25-from-scratch` | Keyword search with BM25 scoring | NestJS + Redis |
| `1-vector-search-with-embeddings` | Semantic search with embeddings + pgvector ANN | NestJS + Postgres + pgvector + `@xenova/transformers` |
| `2-hybrid-search-with-rrf-reranking` | Hybrid (BM25 + vector) with Reciprocal Rank Fusion | NestJS orchestrator |

## Quickstart

```bash
cd 0-inverted-index-and-bm25-from-scratch/.docker
docker compose up -d --build
```

Ports: 3019 (BM25), 3020 (Vector), 3021 (Hybrid).

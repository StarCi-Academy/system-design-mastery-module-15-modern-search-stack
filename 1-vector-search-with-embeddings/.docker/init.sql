CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS docs (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(384)
);

-- HNSW approximate-nearest-neighbor index for cosine distance
CREATE INDEX IF NOT EXISTS docs_embedding_hnsw_idx
    ON docs USING hnsw (embedding vector_cosine_ops);

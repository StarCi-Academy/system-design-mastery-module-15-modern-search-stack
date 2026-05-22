import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Pool } from "pg"
import type { PgConfig } from "../config"
import { EmbeddingService } from "./embedding.service"

const SEED_DOCS: Array<{ id: string; content: string }> = [
    { id: "1", content: "Machine learning models predict customer churn from behavioral signals." },
    { id: "2", content: "AI systems forecast user attrition by analyzing engagement patterns." },
    { id: "3", content: "Deep neural networks classify medical images of tumors." },
    { id: "4", content: "Radiology assistants detect cancer in chest scans using artificial intelligence." },
    { id: "5", content: "BM25 is a probabilistic ranking function used by modern search engines." },
    { id: "6", content: "Vector databases store high-dimensional embeddings for semantic similarity." },
    { id: "7", content: "Pasta carbonara is a classic Italian dish made with eggs, cheese, and bacon." },
    { id: "8", content: "Spaghetti with creamy egg sauce is a beloved Roman tradition." },
    { id: "9", content: "Cristiano Ronaldo scored a hat-trick against Manchester United in the final." },
    { id: "10", content: "The footballer netted three goals to clinch the championship trophy." },
    { id: "11", content: "Distributed systems use sharding and replication for horizontal scalability." },
    { id: "12", content: "Quantum computers exploit superposition to solve certain problems exponentially faster." },
]

export interface VectorHit {
    id: string
    content: string
    similarity: number
}

@Injectable()
export class SearchService implements OnModuleInit {
    private readonly logger = new Logger(SearchService.name)
    private pool!: Pool

    constructor(
        private readonly config: ConfigService,
        private readonly embedding: EmbeddingService,
    ) {}

    async onModuleInit(): Promise<void> {
        const cfg = this.config.get<PgConfig>("pg")!
        this.pool = new Pool({
            host: cfg.host,
            port: cfg.port,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
        })
        await this.waitForReady()
        const { rows } = await this.pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM docs")
        if (Number(rows[0].count) === 0) {
            this.logger.log("Empty docs table — seeding default corpus...")
            await this.seed()
        } else {
            this.logger.log(`docs table already has ${rows[0].count} rows — skipping seed`)
        }
    }

    private async waitForReady(): Promise<void> {
        for (let i = 0; i < 30; i++) {
            try {
                await this.pool.query("SELECT 1")
                return
            } catch {
                await new Promise(r => setTimeout(r, 1000))
            }
        }
        throw new Error("Postgres never became ready")
    }

    private async seed(): Promise<void> {
        for (const doc of SEED_DOCS) await this.addDocument(doc.id, doc.content)
        this.logger.log(`Seeded ${SEED_DOCS.length} documents with embeddings`)
    }

    async addDocument(id: string, content: string): Promise<void> {
        const vec = await this.embedding.embed(content)
        const literal = `[${vec.join(",")}]`
        await this.pool.query(
            `INSERT INTO docs (id, content, embedding) VALUES ($1, $2, $3::vector)
             ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding`,
            [id, content, literal],
        )
    }

    async removeDocument(id: string): Promise<boolean> {
        const r = await this.pool.query("DELETE FROM docs WHERE id = $1", [id])
        return (r.rowCount ?? 0) > 0
    }

    async search(query: string, limit: number): Promise<VectorHit[]> {
        const vec = await this.embedding.embed(query)
        const literal = `[${vec.join(",")}]`
        const { rows } = await this.pool.query<{ id: string; content: string; distance: string }>(
            `SELECT id, content, (embedding <=> $1::vector) AS distance
             FROM docs
             ORDER BY embedding <=> $1::vector
             LIMIT $2`,
            [literal, limit],
        )
        return rows.map(r => ({
            id: r.id,
            content: r.content,
            similarity: 1 - Number(r.distance),
        }))
    }

    async stats(): Promise<{ numDocs: number }> {
        const { rows } = await this.pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM docs")
        return { numDocs: Number(rows[0].count) }
    }

    async reset(): Promise<void> {
        await this.pool.query("DELETE FROM docs")
        await this.seed()
    }
}

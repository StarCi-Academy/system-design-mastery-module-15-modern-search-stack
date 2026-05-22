import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import Redis from "ioredis"
import type { RedisConfig } from "../config"
import { BM25Index, SearchHit } from "./bm25"

const STATE_KEY = "bm25:index:snapshot"

const SEED_DOCS: Array<{ id: string; content: string }> = [
    { id: "1", content: "Machine learning models predict customer churn from behavioral signals." },
    { id: "2", content: "Deep learning neural networks excel at image recognition and computer vision." },
    { id: "3", content: "A search engine uses an inverted index to map terms to documents." },
    { id: "4", content: "BM25 is a probabilistic ranking function used by modern search engines." },
    { id: "5", content: "Elasticsearch and Lucene implement BM25 scoring under the hood by default." },
    { id: "6", content: "Vector databases store high-dimensional embeddings for semantic similarity." },
    { id: "7", content: "Pasta carbonara is a classic Italian dish made with eggs, cheese, and bacon." },
    { id: "8", content: "Sourdough bread requires a wild yeast starter and a long fermentation." },
    { id: "9", content: "Cristiano Ronaldo scored a hat-trick against Manchester United in the final." },
    { id: "10", content: "The marathon runner trained for months to break the world record." },
    { id: "11", content: "Distributed systems use sharding and replication for horizontal scalability." },
    { id: "12", content: "A search engine query parser tokenizes input into terms before retrieval." },
]

@Injectable()
export class SearchService implements OnModuleInit {
    private readonly logger = new Logger(SearchService.name)
    private readonly index = new BM25Index()
    private redis: Redis | null = null

    constructor(private readonly config: ConfigService) {}

    async onModuleInit(): Promise<void> {
        const redisCfg = this.config.get<RedisConfig>("redis")
        if (!redisCfg) {
            this.seedDefaults()
            return
        }
        try {
            this.redis = new Redis({
                host: redisCfg.host,
                port: redisCfg.port,
                maxRetriesPerRequest: 1,
                lazyConnect: true,
            })
            await this.redis.connect()
            await this.loadState()
        } catch (err) {
            this.logger.warn(`Redis unavailable — running with in-memory index only: ${(err as Error).message}`)
            this.seedDefaults()
        }
    }

    private seedDefaults(): void {
        for (const doc of SEED_DOCS) this.index.addDocument(doc.id, doc.content)
        this.logger.log(`Seeded ${SEED_DOCS.length} default documents`)
    }

    private async loadState(): Promise<void> {
        if (!this.redis) return
        const saved = await this.redis.get(STATE_KEY)
        if (saved) {
            this.index.deserialize(saved)
            this.logger.log(`BM25 index restored from Redis (${this.index.stats().numDocs} docs)`)
        } else {
            this.seedDefaults()
            await this.persist()
        }
    }

    private async persist(): Promise<void> {
        if (!this.redis) return
        await this.redis.set(STATE_KEY, this.index.serialize())
    }

    async addDocument(id: string, content: string): Promise<void> {
        this.index.addDocument(id, content)
        await this.persist()
    }

    async removeDocument(id: string): Promise<boolean> {
        const ok = this.index.removeDocument(id)
        if (ok) await this.persist()
        return ok
    }

    search(query: string, limit: number): SearchHit[] {
        return this.index.search(query, limit)
    }

    stats() {
        return this.index.stats()
    }

    async reset(): Promise<void> {
        this.index.clear()
        this.seedDefaults()
        await this.persist()
    }
}

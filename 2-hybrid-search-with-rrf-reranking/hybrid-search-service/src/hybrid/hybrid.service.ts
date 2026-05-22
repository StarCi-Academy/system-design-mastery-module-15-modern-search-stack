import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { SourcesConfig } from "../config"
import { FusedHit, RankedHit, reciprocalRankFusion } from "./rrf"

interface Bm25Response { query: string; hits: Array<{ id: string; score: number; content: string }> }
interface VectorResponse { query: string; hits: Array<{ id: string; similarity: number; content: string }> }

@Injectable()
export class HybridService {
    private readonly logger = new Logger(HybridService.name)
    private readonly cfg: SourcesConfig

    constructor(config: ConfigService) {
        this.cfg = config.get<SourcesConfig>("sources")!
    }

    private async fetchJson<T>(url: string): Promise<T> {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
        return res.json() as Promise<T>
    }

    async bm25(q: string, limit: number): Promise<RankedHit[]> {
        const url = `${this.cfg.bm25BaseUrl}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
        const data = await this.fetchJson<Bm25Response>(url)
        return data.hits.map(h => ({ id: h.id, content: h.content }))
    }

    async vector(q: string, limit: number): Promise<RankedHit[]> {
        const url = `${this.cfg.vectorBaseUrl}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
        const data = await this.fetchJson<VectorResponse>(url)
        return data.hits.map(h => ({ id: h.id, content: h.content }))
    }

    async hybrid(q: string, limit: number, fetchSize = 10): Promise<FusedHit[]> {
        const [bm25Hits, vectorHits] = await Promise.all([
            this.bm25(q, fetchSize).catch(err => { this.logger.warn(`BM25 failed: ${err.message}`); return [] }),
            this.vector(q, fetchSize).catch(err => { this.logger.warn(`Vector failed: ${err.message}`); return [] }),
        ])
        return reciprocalRankFusion(bm25Hits, vectorHits, this.cfg.rrfK, limit)
    }
}

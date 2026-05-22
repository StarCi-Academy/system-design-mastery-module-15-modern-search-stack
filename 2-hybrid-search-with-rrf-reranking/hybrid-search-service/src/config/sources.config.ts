import { registerAs } from "@nestjs/config"

export interface SourcesConfig {
    bm25BaseUrl: string
    vectorBaseUrl: string
    rrfK: number
}

export const sourcesConfig = registerAs("sources", (): SourcesConfig => ({
    bm25BaseUrl: process.env.BM25_BASE_URL ?? "http://localhost:3019",
    vectorBaseUrl: process.env.VECTOR_BASE_URL ?? "http://localhost:3020",
    rrfK: Number(process.env.RRF_K) || 60,
}))

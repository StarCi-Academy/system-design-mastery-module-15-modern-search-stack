import { Injectable, Logger } from "@nestjs/common"

const MODEL_ID = "Xenova/all-MiniLM-L6-v2"

type Embedder = (text: string, opts?: unknown) => Promise<{ data: Float32Array }>

/**
 * Loads sentence-transformer "all-MiniLM-L6-v2" (384 dims, mean-pooled, L2-normalized)
 * via @xenova/transformers (ONNX runtime, CPU-only, no API key, no GPU).
 * The ESM-only package is loaded via dynamic import; the model is lazily fetched
 * on the first embed() call so module-init order does not matter.
 */
@Injectable()
export class EmbeddingService {
    private readonly logger = new Logger(EmbeddingService.name)
    private embedderPromise: Promise<Embedder> | null = null

    private loadEmbedder(): Promise<Embedder> {
        if (this.embedderPromise) return this.embedderPromise
        this.logger.log(`Loading embedding model ${MODEL_ID} (first boot downloads ~25 MB)...`)
        const dynImport = new Function("p", "return import(p)") as (p: string) => Promise<unknown>
        this.embedderPromise = (async () => {
            const mod = (await dynImport("@xenova/transformers")) as {
                pipeline: (task: string, model: string) => Promise<Embedder>
                env: { cacheDir?: string; allowRemoteModels?: boolean }
            }
            mod.env.cacheDir = process.env.TRANSFORMERS_CACHE ?? "/app/.cache"
            mod.env.allowRemoteModels = true
            const embedder = await mod.pipeline("feature-extraction", MODEL_ID)
            this.logger.log("Embedding model ready")
            return embedder
        })()
        return this.embedderPromise
    }

    async embed(text: string): Promise<number[]> {
        const embedder = await this.loadEmbedder()
        const result = await embedder(text, { pooling: "mean", normalize: true })
        return Array.from(result.data)
    }
}

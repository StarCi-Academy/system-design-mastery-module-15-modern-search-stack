import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from "@nestjs/common"
import { HybridService } from "./hybrid.service"

@Controller("api/search")
export class HybridController {
    constructor(private readonly service: HybridService) {}

    @Get()
    async hybrid(
        @Query("q") q = "",
        @Query("limit", new DefaultValuePipe(5), ParseIntPipe) limit = 5,
    ) {
        const hits = await this.service.hybrid(q, limit)
        return { query: q, mode: "hybrid_rrf", hits }
    }

    @Get("bm25")
    async bm25(
        @Query("q") q = "",
        @Query("limit", new DefaultValuePipe(5), ParseIntPipe) limit = 5,
    ) {
        const hits = await this.service.bm25(q, limit)
        return { query: q, mode: "bm25_only", hits }
    }

    @Get("vector")
    async vector(
        @Query("q") q = "",
        @Query("limit", new DefaultValuePipe(5), ParseIntPipe) limit = 5,
    ) {
        const hits = await this.service.vector(q, limit)
        return { query: q, mode: "vector_only", hits }
    }
}

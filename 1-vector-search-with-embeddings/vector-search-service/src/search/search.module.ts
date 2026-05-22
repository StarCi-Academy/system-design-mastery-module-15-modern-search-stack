import { Module } from "@nestjs/common"
import { EmbeddingService } from "./embedding.service"
import { SearchController } from "./search.controller"
import { SearchService } from "./search.service"

@Module({
    controllers: [SearchController],
    providers: [EmbeddingService, SearchService],
})
export class SearchModule {}

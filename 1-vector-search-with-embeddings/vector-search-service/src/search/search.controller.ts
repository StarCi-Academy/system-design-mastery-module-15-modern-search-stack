import {
    Body,
    Controller,
    DefaultValuePipe,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
} from "@nestjs/common"
import { IsString, MinLength } from "class-validator"
import { SearchService } from "./search.service"

class IndexDocDto {
    @IsString()
    @MinLength(1)
    id!: string

    @IsString()
    @MinLength(1)
    content!: string
}

@Controller("api/search")
export class SearchController {
    constructor(private readonly service: SearchService) {}

    @Get()
    async search(
        @Query("q") q = "",
        @Query("limit", new DefaultValuePipe(5), ParseIntPipe) limit = 5,
    ) {
        const hits = await this.service.search(q, limit)
        return { query: q, hits }
    }

    @Get("stats")
    async stats() {
        return this.service.stats()
    }

    @Post("index")
    async index(@Body() body: IndexDocDto) {
        await this.service.addDocument(body.id, body.content)
        return { success: true, id: body.id }
    }

    @Delete("index/:id")
    async remove(@Param("id") id: string) {
        const ok = await this.service.removeDocument(id)
        return { success: ok, id }
    }

    @Post("reset")
    async reset() {
        await this.service.reset()
        return { success: true }
    }
}

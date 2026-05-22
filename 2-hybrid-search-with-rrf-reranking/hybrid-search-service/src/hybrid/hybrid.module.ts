import { Module } from "@nestjs/common"
import { HybridController } from "./hybrid.controller"
import { HybridService } from "./hybrid.service"

@Module({
    controllers: [HybridController],
    providers: [HybridService],
})
export class HybridModule {}

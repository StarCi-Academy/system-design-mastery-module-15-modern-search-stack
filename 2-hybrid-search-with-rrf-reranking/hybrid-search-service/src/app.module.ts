import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { appConfig, sourcesConfig } from "./config"
import { HybridModule } from "./hybrid/hybrid.module"

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig, sourcesConfig] }),
        HybridModule,
    ],
})
export class AppModule {}

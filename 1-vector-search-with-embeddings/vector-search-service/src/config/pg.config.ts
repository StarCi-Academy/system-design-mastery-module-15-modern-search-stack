import { registerAs } from "@nestjs/config"

export interface PgConfig {
    host: string
    port: number
    user: string
    password: string
    database: string
}

export const pgConfig = registerAs("pg", (): PgConfig => ({
    host: process.env.PG_HOST ?? "localhost",
    port: Number(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER ?? "search",
    password: process.env.PG_PASSWORD ?? "search",
    database: process.env.PG_DATABASE ?? "vectorsearch",
}))

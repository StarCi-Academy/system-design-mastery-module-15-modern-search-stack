import { IsString, MinLength } from "class-validator"

export class IndexDocDto {
    @IsString()
    @MinLength(1)
    id!: string

    @IsString()
    @MinLength(1)
    content!: string
}

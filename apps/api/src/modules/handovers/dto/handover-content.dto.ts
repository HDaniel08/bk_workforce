import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class HandoverContentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  mentionUserIds?: string[];
}


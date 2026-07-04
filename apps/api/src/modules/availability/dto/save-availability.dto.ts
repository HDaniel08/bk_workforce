import { AvailabilityPeriodType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { AvailabilityDayDto } from "./availability-day.dto";

export class SaveAvailabilityDto {
  @IsEnum(AvailabilityPeriodType)
  periodType!: AvailabilityPeriodType;

  @IsOptional()
  @IsString()
  weekStartDate?: string | null;

  @IsOptional()
  @IsString()
  monthStartDate?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDayDto)
  days!: AvailabilityDayDto[];
}

import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { AvailabilityPeriodType } from "@prisma/client";
import { AvailabilityDayDto } from "./availability-day.dto";

export class UpdateTeamAvailabilityDayDto {
  @IsOptional()
  @IsEnum(AvailabilityPeriodType)
  periodType?: AvailabilityPeriodType;

  @IsOptional()
  @IsString()
  weekStartDate?: string | null;

  @IsOptional()
  @IsString()
  monthStartDate?: string | null;

  @ValidateNested()
  @Type(() => AvailabilityDayDto)
  day!: AvailabilityDayDto;
}

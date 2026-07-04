import { AvailabilityDayType, WorkPreference } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Matches } from "class-validator";

export class AvailabilityDayDto {
  @IsString()
  date!: string;

  @IsEnum(AvailabilityDayType)
  type!: AvailabilityDayType;

  @IsOptional()
  @IsEnum(WorkPreference)
  workPreference?: WorkPreference | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

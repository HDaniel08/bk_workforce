import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { AvailabilityDayDto } from "./availability-day.dto";

export class UpdateTeamAvailabilityDayDto {
  @IsOptional()
  @IsString()
  weekStartDate?: string | null;

  @ValidateNested()
  @Type(() => AvailabilityDayDto)
  day!: AvailabilityDayDto;
}

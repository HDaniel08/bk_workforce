import { IsOptional, IsString } from "class-validator";

export class CreateVacationRequestDto {
  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

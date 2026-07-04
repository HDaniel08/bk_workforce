import { VacationRequestStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class VacationRequestQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(VacationRequestStatus)
  status?: VacationRequestStatus;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

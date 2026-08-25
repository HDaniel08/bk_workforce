import { EmployeeSubRole, WorkerType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";

export class MyAvailabilityQueryDto {
  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @IsOptional()
  @IsString()
  monthStartDate?: string;
}

export class TeamAvailabilityQueryDto extends MyAvailabilityQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(EmployeeSubRole)
  employeeSubRole?: EmployeeSubRole;

  @IsOptional()
  @IsEnum(WorkerType)
  workerType?: WorkerType;
}

export class StudentWorkCoverageReportQueryDto {
  @IsDateString({ strict: true })
  from!: string;

  @IsDateString({ strict: true })
  to!: string;
}

export class FullTimeRequestsReportQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

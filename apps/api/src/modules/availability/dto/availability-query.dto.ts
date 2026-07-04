import { EmployeeSubRole, WorkerType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

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

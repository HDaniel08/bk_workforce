import { EmployeeSubRole, WorkerType } from "@prisma/client";
import { IsBooleanString, IsEnum, IsOptional, IsString } from "class-validator";

export class UserQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsEnum(EmployeeSubRole)
  employeeSubRole?: EmployeeSubRole;

  @IsOptional()
  @IsEnum(WorkerType)
  workerType?: WorkerType;
}

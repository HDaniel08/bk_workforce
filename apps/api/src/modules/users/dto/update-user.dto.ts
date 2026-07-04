import { ContractHours, EmployeeSubRole, WorkerType } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf
} from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(EmployeeSubRole)
  employeeSubRole?: EmployeeSubRole;

  @IsOptional()
  @IsEnum(ContractHours)
  contractHours?: ContractHours;

  @ValidateIf((dto: UpdateUserDto) => dto.employeeSubRole === EmployeeSubRole.WORKER)
  @IsEnum(WorkerType)
  workerType?: WorkerType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

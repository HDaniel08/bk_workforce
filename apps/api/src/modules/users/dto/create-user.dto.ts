import { ContractHours, EmployeeSubRole, WorkerType } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf
} from "class-validator";

export class CreateUserDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(EmployeeSubRole)
  employeeSubRole!: EmployeeSubRole;

  @IsEnum(ContractHours)
  contractHours!: ContractHours;

  @ValidateIf((dto: CreateUserDto) => dto.employeeSubRole === EmployeeSubRole.WORKER)
  @IsEnum(WorkerType)
  workerType?: WorkerType;
}

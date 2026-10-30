import { ManagerDayKind } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class MonthQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month!: string;
}

export class DayQueryDto {
  @IsDateString({ strict: true })
  date!: string;
}

export class CollisionRangeDto {
  @IsDateString({ strict: true })
  from!: string;

  @IsDateString({ strict: true })
  to!: string;
}

export class OwnerDto {
  @IsString()
  userId!: string;
}

export class ManagerRequestDto {
  @IsDateString({ strict: true })
  date!: string;

  @IsEnum(ManagerDayKind)
  kind!: ManagerDayKind;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class MonthTargetsDto {
  @IsInt()
  @Min(0)
  @Max(31)
  expectedWorkDays!: number;

  @IsInt()
  @Min(0)
  @Max(31)
  expectedRestDays!: number;
}

export class ScheduleDayDto {
  @IsString()
  userId!: string;

  @IsDateString({ strict: true })
  date!: string;

  @IsEnum(ManagerDayKind)
  kind!: ManagerDayKind;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

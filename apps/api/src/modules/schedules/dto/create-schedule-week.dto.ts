import { IsString } from "class-validator";

export class CreateScheduleWeekDto {
  @IsString()
  weekStartDate!: string;
}

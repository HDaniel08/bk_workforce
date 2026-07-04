import { IsString } from "class-validator";

export class AssignShiftDto {
  @IsString()
  userId!: string;
}

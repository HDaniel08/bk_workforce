import { IsString, Matches } from "class-validator";
import { HandoverContentDto } from "./handover-content.dto";

export class CreateHandoverPostDto extends HandoverContentDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  handoverDate!: string;
}


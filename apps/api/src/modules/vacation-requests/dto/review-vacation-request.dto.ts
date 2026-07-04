import { IsOptional, IsString } from "class-validator";

export class ReviewVacationRequestDto {
  @IsOptional()
  @IsString()
  reviewerNote?: string;
}

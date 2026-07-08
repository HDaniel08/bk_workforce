import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SendTestEmailDto {
  @IsEmail()
  to!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message?: string;
}

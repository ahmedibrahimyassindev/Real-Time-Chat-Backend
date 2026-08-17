import { IsEmail, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string;
}

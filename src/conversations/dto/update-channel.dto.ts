import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateChannelDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  isPrivate: boolean;
}

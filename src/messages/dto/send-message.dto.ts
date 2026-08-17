import { IsOptional, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  replyToId?: string;
}

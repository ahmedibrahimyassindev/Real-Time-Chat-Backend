import { IsString, MinLength } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @MinLength(1)
  emoji: string;
}

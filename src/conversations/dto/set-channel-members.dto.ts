import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class SetChannelMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds: string[];
}

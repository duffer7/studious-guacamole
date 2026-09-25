import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateChatDto {
  @ApiProperty({ example: 'Новое название' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  title: string;
}

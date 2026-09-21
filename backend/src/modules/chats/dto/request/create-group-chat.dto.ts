import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreateGroupChatDto {
  @ApiProperty({ example: 'Проект X' })
  @IsString()
  @MaxLength(128)
  title: string;

  @ApiProperty({ example: [2, 3, 4], description: 'ID участников (без создателя)' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetUserIds: number[];
}

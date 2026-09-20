import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateDirectChatDto {
  @ApiProperty({ example: 42, description: 'ID собеседника' })
  @IsInt()
  @Min(1)
  targetUserId: number;
}

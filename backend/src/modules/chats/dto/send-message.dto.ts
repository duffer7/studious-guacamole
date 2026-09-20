import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 1, description: 'Имя' })
  @IsInt()
  chatId!: number;

  @ApiProperty({ example: 'Text message', description: 'Сообщение' })
  @IsString()
  body!: string;

  @ApiProperty({ example: '28r02832hh293f', description: 'ID сообщения с фронта' })
  @IsString()
  clientMessageId!: string;

  @ApiProperty({ example: 1, description: 'ID сообщения для ответа', required: false })
  @IsOptional()
  replyToId?: number;
}

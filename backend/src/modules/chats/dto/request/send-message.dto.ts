import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 1, description: 'Имя' })
  @IsInt()
  chatId!: number;

  @ApiProperty({ example: 'Text message', description: 'Сообщение' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Сгенерированный клиентом ID для идемпотентности операции создания',
  })
  @IsUUID()
  clientMessageId!: string;

  @ApiProperty({ example: 1, description: 'ID сообщения для ответа', required: false })
  @IsOptional()
  replyToId?: number;
}

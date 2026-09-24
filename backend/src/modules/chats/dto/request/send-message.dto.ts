import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class AttachmentRefDto {
  @IsString()
  @MaxLength(200)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(128)
  mime!: string;

  @IsInt()
  @Min(1)
  @Max(8_000_000)
  size!: number;
}

export class SendMessageDto {
  @ApiProperty({ example: 1, description: 'Имя' })
  @IsInt()
  chatId!: number;

  @ApiPropertyOptional({ example: 'Text message', description: 'Сообщение' })
  @ValidateIf((dto: SendMessageDto) => !dto.attachment)
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body?: string;

  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Сгенерированный клиентом ID для идемпотентности операции создания',
  })
  @IsUUID()
  clientMessageId!: string;

  @ApiProperty({ example: 1, description: 'ID сообщения для ответа', required: false })
  @IsOptional()
  replyToId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttachmentRefDto)
  attachment?: AttachmentRefDto;
}

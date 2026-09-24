import { ApiProperty } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty({ example: 501 })
  id: number;

  @ApiProperty({ example: 1 })
  chatId: number;

  @ApiProperty({ example: 2 })
  senderId: number;

  @ApiProperty({ example: 'Привет!', nullable: true })
  body: string | null;

  @ApiProperty({ example: 'text' })
  type: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  clientMessageId: string;

  @ApiProperty({ example: 123, nullable: true })
  replyToId: number | null;

  @ApiProperty({ example: '2026-09-10T11:25:00.000Z' })
  createdAt: string;

  @ApiProperty({ nullable: true })
  attachmentKey: string | null;

  @ApiProperty({ nullable: true })
  attachmentName: string | null;

  @ApiProperty({ nullable: true })
  attachmentMime: string | null;

  @ApiProperty({ nullable: true })
  attachmentSize: number | null;
}

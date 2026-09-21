import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageDto } from '@modules/chats/dto/response/message.dto';
import { type PublicUserDto } from '@modules/user/dto/public-user.dto';

export class ChatSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'direct' })
  type: string;

  @ApiProperty({ example: 'Проект X', nullable: true })
  title: string | null;

  @ApiProperty({ example: 3 })
  unreadCount: number;

  @ApiPropertyOptional({ type: MessageDto, nullable: true })
  lastMessage: MessageDto | null;

  @ApiPropertyOptional({ type: [Object], description: 'Участники (для UI аватаров)' })
  members: PublicUserDto[];
}

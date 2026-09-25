import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageDto } from '@modules/chats/dto/response/message.dto';
import { ChatMemberDto } from '@modules/chats/dto/response/chat-member.dto';
import { ChatRole } from '@modules/chats/types/chat-role.enum';

export class ChatSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'direct' })
  type: string;

  @ApiProperty({ example: 'Проект X', nullable: true })
  title: string | null;

  @ApiProperty({ example: 3 })
  unreadCount: number;

  @ApiPropertyOptional({
    example: 42,
    nullable: true,
    description: 'id последнего прочитанного пользователем сообщения (null — не читал)',
  })
  lastReadMessageId: number | null;

  @ApiPropertyOptional({ type: MessageDto, nullable: true })
  lastMessage: MessageDto | null;

  @ApiPropertyOptional({ type: [ChatMemberDto], description: 'Участники (для UI аватаров)' })
  members: ChatMemberDto[];

  @ApiProperty({ example: 3 })
  memberCount: number;

  @ApiProperty({ enum: ChatRole })
  myRole: ChatRole;
}

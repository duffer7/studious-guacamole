import { ApiProperty } from '@nestjs/swagger';
import { ChatRole } from '@modules/chats/types/chat-role.enum';

export class ChatMemberDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  displayName: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: ChatRole })
  role: ChatRole;

  @ApiProperty()
  joinedAt: string;

  @ApiProperty({ example: '2026-09-10T11:25:00.000Z', nullable: true })
  lastSeenAt: string | null;

  /** null — Redis недоступен, статус неизвестен. */
  @ApiProperty({ example: true, nullable: true })
  online: boolean | null;
}

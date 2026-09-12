import { ApiProperty } from '@nestjs/swagger';
import type { PublicUser } from './response-user.dto';

/**
 * Публичное представление пользователя для списков/поиска.
 * Намеренно НЕ содержит email — эта информация доступна только владельцу (/users/me).
 */
export class PublicUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'artemii' })
  username: string;

  @ApiProperty({ example: 'Артемий', nullable: true })
  displayName: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl: string | null;

  constructor(row: PublicUser) {
    this.id = row.id;
    this.username = row.username;
    this.displayName = row.displayName;
    this.avatarUrl = row.avatarUrl;
  }
}

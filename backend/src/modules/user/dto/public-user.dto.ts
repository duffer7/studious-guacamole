import { ApiProperty } from '@nestjs/swagger';

/** Минимальный набор полей пользователя, необходимый для публичного представления. */
export interface PublicUserSource {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastSeenAt?: Date | string | null;
}

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

  @ApiProperty({ example: '2026-09-10T11:25:00.000Z', nullable: true })
  lastSeenAt: string | null;

  constructor(row: PublicUserSource) {
    this.id = row.id;
    this.username = row.username;
    this.displayName = row.displayName;
    this.avatarUrl = row.avatarUrl;
    this.lastSeenAt = row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : null;
  }
}

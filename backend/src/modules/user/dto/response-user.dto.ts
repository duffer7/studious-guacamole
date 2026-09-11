import { ApiProperty } from '@nestjs/swagger';
import type { UserRow } from '@db/schema';

export type PublicUser = Omit<UserRow, 'password'>;

export class ResponseUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'artemii' })
  username: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Артемий', nullable: true })
  displayName: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: '2026-09-10T11:25:00.000Z' })
  createdAt: string;

  constructor(row: PublicUser) {
    this.id = row.id;
    this.username = row.username;
    this.email = row.email;
    this.displayName = row.displayName;
    this.avatarUrl = row.avatarUrl;
    this.createdAt = row.createdAt.toISOString();
  }
}

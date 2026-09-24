import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { NewUserRow, UserRow } from '@db/schema';
import { UsersRepository } from '@modules/user/users.repository';
import { StorageService } from '@/storage/storage.service';

const MAX_AVATAR_BYTES = 1_500_000;

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly storage: StorageService,
  ) {}
  findById(id: number): Promise<UserRow | undefined> {
    return this.usersRepository.findById(id);
  }

  findByUsername(username: string): Promise<UserRow | undefined> {
    return this.usersRepository.findByUsername(username);
  }

  findByUsernameOrEmail(username: string, email: string): Promise<UserRow | undefined> {
    return this.usersRepository.findByUsernameOrEmail(username, email);
  }

  search(query: string, excludeUserId: number): Promise<UserRow[]> {
    return this.usersRepository.search(query, excludeUserId);
  }

  setMfa(userId: number, mfaEnabled: boolean, mfaSecret: string | null): Promise<UserRow> {
    return this.usersRepository.updateMfa(userId, mfaEnabled, mfaSecret);
  }

  create(input: NewUserRow): Promise<UserRow> {
    return this.usersRepository.insert(input);
  }

  async updateProfile(userId: number, displayName: string | null | undefined): Promise<UserRow> {
    const trimmed = displayName?.trim() || null;
    const updated = await this.usersRepository.updateProfile(userId, { displayName: trimmed });
    if (!updated) throw new NotFoundException('user not found');
    return updated;
  }

  async setAvatar(userId: number, dataUrl: string): Promise<UserRow> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('user not found');

    const buffer = decodeJpeg(dataUrl);
    const key = `avatars/${userId}.jpg`;
    await this.storage.put(key, buffer, 'image/jpeg');

    const updated = await this.usersRepository.updateProfile(userId, {
      avatarUrl: `/uploads/${key}?v=${Date.now()}`,
    });
    return updated!;
  }

  async clearAvatar(userId: number): Promise<UserRow> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('user not found');

    await this.storage.remove(`avatars/${userId}.jpg`).catch(() => undefined);
    const updated = await this.usersRepository.updateProfile(userId, { avatarUrl: null });
    return updated!;
  }
}

function decodeJpeg(dataUrl: string): Buffer {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) throw new BadRequestException('expected a JPEG data URL');

  const buffer = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (!jpeg || buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) {
    throw new BadRequestException('image is empty, too large, or not a JPEG');
  }
  return buffer;
}

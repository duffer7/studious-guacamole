import { Controller, Get, NotFoundException, Param, StreamableFile } from '@nestjs/common';
import { StorageService } from '@/storage/storage.service';

const SAFE_KEY = /^avatars\/\d+\.jpg$/;

@Controller('uploads')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':folder/:file')
  async get(@Param('folder') folder: string, @Param('file') file: string) {
    const key = `${folder}/${file}`;
    if (!SAFE_KEY.test(key)) throw new NotFoundException('file not found');

    const stored = await this.storage.read(key);
    return new StreamableFile(stored.body, { type: stored.contentType });
  }
}

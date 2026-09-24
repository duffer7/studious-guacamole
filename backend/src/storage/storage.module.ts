import { Global, Module } from '@nestjs/common';
import { FilesController } from '@/storage/files.controller';
import { StorageService } from '@/storage/storage.service';

@Global()
@Module({
  controllers: [FilesController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

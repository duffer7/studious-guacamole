import { Module } from '@nestjs/common';
import { PushController } from '@modules/push/push.controller';
import { PushRepository } from '@modules/push/push.repository';
import { PushService } from '@modules/push/push.service';

@Module({
  controllers: [PushController],
  providers: [PushService, PushRepository],
  exports: [PushService],
})
export class PushModule {}

import { Global, Module } from '@nestjs/common';
import { REDIS, createRedis } from './redis.provider';

@Global()
@Module({
  providers: [{ provide: REDIS, useFactory: createRedis }],
  exports: [REDIS],
})
export class RedisModule {}

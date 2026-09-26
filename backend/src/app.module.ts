import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DbModule } from '@/db/db.module';
import { SecurityModule } from '@modules/security/security.module';
import { UsersModule } from '@modules/user/users.module';
import { AuthModule } from '@modules/auth/auth.module';
import { RedisModule } from '@/redis/redis.module';
import { ChatModule } from '@modules/chats/chat.module';
import { PushModule } from '@modules/push/push.module';
import { StorageModule } from '@/storage/storage.module';

const isProduction = process.env['NODE_ENV'] === 'production';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: isProduction
          ? undefined
          : { target: 'pino-pretty', options: { singleLine: true } },
        autoLogging: true,
      },
    }),
    DbModule,
    RedisModule,
    StorageModule,
    SecurityModule,
    UsersModule,
    AuthModule,
    PushModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

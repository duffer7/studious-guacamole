import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DbModule } from '@/db/db.module';
import { UsersModule } from '@modules/user/users.module';

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
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

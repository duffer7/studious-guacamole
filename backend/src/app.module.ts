import { Module } from "@nestjs/common";
import { AppController } from "@/app.controller";
import { AppService } from "@/app.service";
import { UsersModule } from "@modules/user/users.module";
import { PrismaModule } from "@services/prisma/prisma.module";

// NestJS Observe instrumentation is currently disabled: it needs real
// `appKey`/`appSecret` credentials (the placeholders below caused a 401 and a
// crash inside the observe agent worker). To enable it:
//   1. `import { createObserveModule } from "@nestjs/observe";`
//   2. `export const { ObserveModule, ObserveInstrument } = createObserveModule();`
//   3. add `ObserveModule.forRoot({ appKey, appSecret, serviceId })` to imports
//   4. pass `{ instrument: ObserveInstrument }` to `NestFactory.create` in main.ts

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

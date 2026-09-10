import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@services/prisma/contract';

@Injectable()
export class PrismaService extends Prisma implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

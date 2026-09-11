import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { db } from "@services/prisma/db";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /**
   * The Prisma Next runtime client constructed in `db.ts`.
   *
   * Exposed directly so consumers reach the v8 query surfaces
   * (`this.db.orm.User.create(...)`, `this.db.sql`, `this.db.transaction(...)`, ...).
   */
  readonly db = db;
  async onModuleInit(): Promise<void> {
    // Lazy client: instantiate the driver/pool on first connect.
    await this.db.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.close();
  }
}

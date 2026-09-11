import { Global, Module } from '@nestjs/common';
import { DB, createDatabase } from '@db/db.provider';

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: createDatabase,
    },
  ],
  exports: [DB],
})
export class DbModule {}

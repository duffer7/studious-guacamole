import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

type PrismaConfig = ReturnType<typeof definePrismaConfig>;

const config: PrismaConfig = definePrismaConfig({
  orm: ormConfig({
    contract: "./src/services/prisma/contract.prisma",
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
});

export default config;
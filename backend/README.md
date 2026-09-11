# Backend

Backend мессенджера на [NestJS](https://github.com/nestjs/nest), Drizzle ORM и
Postgres. CommonJS, без кастомного сборочного pipeline — используется
стандартный Nest CLI.

## Стек

| Задача           | Инструмент                             |
| ---------------- | -------------------------------------- |
| HTTP-фреймворк   | NestJS 11                              |
| ORM              | Drizzle ORM + `drizzle-kit` (миграции) |
| БД               | PostgreSQL                             |
| Валидация        | `class-validator` + `ValidationPipe`   |
| Логирование      | `nestjs-pino`                          |
| Документация API | `@nestjs/swagger` (`/api/docs`)        |
| Сборка / dev     | Nest CLI (`nest build` / `nest start`) |
| Path-алиасы      | `tsconfig` `paths` + `tsc-alias`       |
| Тесты            | Vitest + SWC (`unplugin-swc`)          |

## Path-алиасы

В исходниках используются абсолютные импорты через алиасы (настроены в
`tsconfig.json` → `compilerOptions.paths`):

```ts
import { AppService } from '@/app.service';
import { UsersService } from '@modules/user/users.service';
import { users } from '@db/schema';
```

| Алиас        | Путь            |
| ------------ | --------------- |
| `@/*`        | `src/*`         |
| `@modules/*` | `src/modules/*` |
| `@db/*`      | `src/db/*`      |

Как это резолвится:

- **типы / IDE / `nest start --watch`** — Nest CLI читает `paths` из `tsconfig.json`;
- **prod-сборка** — `tsc` выводит алиасы как есть, поэтому `npm run build`
  дополнительно прогоняет **`tsc-alias`**, который переписывает `@/...` в
  относительные пути в `dist`;
- **тесты (vitest)** — алиасы продублированы в `resolve.alias` в
  `vitest.config.ts` / `vitest.config.e2e.ts`.

> Импорты **без расширений** (`./foo`), а не `./foo.js` / `./foo.ts`. Расширение
> `.ts` в рантайм-импортах запрещено (требует `noEmit`), а `.js` не идиоматично
> для CommonJS.

## Project setup

```bash
npm install
```

Требуется **Node.js 22+**.

## Compile and run

```bash
# dev (watch-режим, перезапуск на изменения)
npm run start:dev

# prod-сборка (nest build + tsc-alias -> dist/)
npm run build
npm run start:prod

# только проверка типов (tsc)
npm run typecheck
```

Приложение слушает `PORT` (по умолчанию `3000`). Swagger — на `/api/docs`.

## База данных (Drizzle)

Схема — в `src/db/schema.ts`. Конфиг `drizzle-kit` — в `drizzle.config.ts`.
Требуется переменная окружения `DATABASE_URL` (см. `.env.example`).

```bash
# сгенерировать SQL-миграцию из изменений схемы
npm run db:generate

# применить миграции
npm run db:migrate

# быстро синхронизировать схему без файлов миграций (только dev)
npm run db:push

# GUI для просмотра данных
npm run db:studio
```

## Тесты

```bash
npm run test       # unit
npm run test:e2e   # e2e
npm run test:cov   # coverage
```

## Docker (dev)

Из корня репозитория:

```bash
docker compose up --build
```

`docker-compose.yml` поднимает `backend`, `frontend` и `db` (Postgres).
После смены зависимостей пересоздай анонимный том `node_modules`:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

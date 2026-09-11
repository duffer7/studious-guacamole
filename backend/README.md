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
| Аутентификация   | Passport JWT + `@nestjs/jwt`           |
| Хеширование      | `bcrypt`                               |
| MFA (TOTP)       | `otplib`                               |
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

## Переменные окружения

Скопируй `.env.example` в `.env` и заполни:

| Переменная     | Обязательна | Описание                                |
| -------------- | ----------- | --------------------------------------- |
| `DATABASE_URL` | да          | Строка подключения к PostgreSQL         |
| `JWT_SECRET`   | да          | Секрет для подписи JWT access/refresh   |
| `PORT`         | нет         | Порт HTTP-сервера (по умолчанию `3000`) |
| `NODE_ENV`     | нет         | `production` отключает pretty-логи      |

`.env` загружается в `main.ts` через `dotenv/config`. Сгенерировать `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## База данных (Drizzle)

Схема — в `src/db/schema.ts`. Конфиг `drizzle-kit` — в `drizzle.config.ts`.

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

Текущая схема таблицы `user`:

| Колонка        | Тип                 | Примечание                |
| -------------- | ------------------- | ------------------------- |
| `id`           | serial PK           |                           |
| `email`        | varchar(255) unique |                           |
| `username`     | varchar(64) unique  |                           |
| `password`     | text                | bcrypt-хеш                |
| `display_name` | text                | nullable                  |
| `avatar_url`   | text                | nullable                  |
| `mfa_enabled`  | boolean             | default `false`           |
| `mfa_secret`   | text                | nullable, TOTP-секрет     |
| `created_at`   | timestamptz         |                           |
| `updated_at`   | timestamptz         | обновляется автоматически |

## Аутентификация

Механику JWT обеспечивает общий модуль `@modules/security`, а бизнес-логика
входа/MFA живёт в `@modules/auth`.

### `@modules/security` — общий модуль безопасности

Помечен `@Global()`, поэтому guard и типы доступны в любом модуле **без явного
импорта** — это убирает циклические зависимости между фича-модулями
(`auth` ↔ `users`).

| Файл                 | Назначение                                                           |
| -------------------- | -------------------------------------------------------------------- |
| `security.module.ts` | Регистрирует `PassportModule` + `JwtModule`, экспортирует их и guard |
| `jwt.strategy.ts`    | Passport-стратегия: валидирует Bearer access-токен                   |
| `jwt-auth.guard.ts`  | Guard `AuthGuard('jwt')` для защиты эндпоинтов                       |
| `types.ts`           | Типы `JwtPayload` и `AuthUser` (`req.user`)                          |

Подключён один раз в `AppModule` (до `UsersModule`/`AuthModule`).

### `@modules/auth` — вход и MFA

| Файл                 | Назначение                                               |
| -------------------- | -------------------------------------------------------- |
| `auth.module.ts`     | Импортирует `SecurityModule` и `UsersModule`             |
| `auth.controller.ts` | HTTP-эндпоинты `/auth/*`                                 |
| `auth.service.ts`    | Бизнес-логика: login, refresh, MFA enable/verify/disable |
| `totp.service.ts`    | Обёртка над `otplib`: секрет, otpauth URI, проверка TOTP |

Пример использования guard в любом контроллере:

```ts
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import type { AuthUser } from '@modules/security/types';

@UseGuards(JwtAuthGuard)
@Get('me')
me(@Req() req: { user: AuthUser }) {
  return req.user.userId;
}
```

### Токены

- **access token** — живёт `15m`, передаётся в заголовке
  `Authorization: Bearer <token>`.
- **refresh token** — живёт `7d`, передаётся телом запроса в `/auth/refresh`.
- Payload обоих токенов: `{ sub: <userId>, username }` (см. `JwtPayload`).

### Эндпоинты

| Метод | Путь                | Защита | Описание                                  |
| ----- | ------------------- | ------ | ----------------------------------------- |
| POST  | `/users`            | —      | Регистрация (публичный)                   |
| POST  | `/auth/login`       | —      | Вход, возвращает пару токенов             |
| POST  | `/auth/refresh`     | —      | Обновление пары токенов по refresh-токену |
| GET   | `/users`            | JWT    | Список пользователей                      |
| GET   | `/users/me`         | JWT    | Текущий пользователь                      |
| POST  | `/auth/mfa/enable`  | JWT    | Сгенерировать TOTP-секрет и otpauth URL   |
| POST  | `/auth/mfa/verify`  | JWT    | Подтвердить кодом и включить MFA          |
| POST  | `/auth/mfa/disable` | JWT    | Отключить MFA (нужен текущий TOTP-код)    |

### Полный процесс (пошагово)

**1. Регистрация.** Пароль хешируется через `bcrypt` (10 раундов) внутри
`UsersService.create`. Эндпоинт публичный — иначе первый пользователь не сможет
создать себя.

```bash
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"username":"duffer7","password":"s3cr3t-password","email":"duffer7@example.com","displayName":"Артемий"}'
```

**2. Вход.**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"duffer7","password":"s3cr3t-password"}'
# -> { "access_token": "...", "refresh_token": "..." }
```

При неверном пароле или отсутствующем пользователе — `401 Invalid username or
password` (сообщение намеренно не различает эти случаи).

**3. Запрос защищённого ресурса.**

```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**4. Обновление токена.**

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh_token>"}'
```

**5. Включение MFA.**

```bash
# 1) Инициализация — получаем секрет и otpauth URL
curl -X POST http://localhost:3000/auth/mfa/enable \
  -H "Authorization: Bearer $ACCESS_TOKEN"
# -> { "secret": "...", "otpauthUrl": "otpauth://totp/..." }
```

`otpauthUrl` показывает приложение-аутентификатор (Google Authenticator и т.п.)
при сканировании QR-кода — генерируй QR из этой строки. Затем подтверждаем кодом:

```bash
# 2) Подтверждение — активирует MFA
curl -X POST http://localhost:3000/auth/mfa/verify \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"code":"123456"}'
# -> { "mfaEnabled": true }
```

С этого момента `/auth/login` требует `code`:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"duffer7","password":"s3cr3t-password","code":"123456"}'
```

**6. Отключение MFA.** Требуется текущий валидный TOTP-код:

```bash
curl -X POST http://localhost:3000/auth/mfa/disable \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"code":"123456"}'
# -> { "mfaEnabled": false }
```

### Нюансы реализации

- **Порядок проверок:** сначала пара username/password, и только если MFA
  включён — `code`. Токены выдаются лишь при успехе всех шагов.
- **Проверка TOTP** допускает дрейф часов ±30 секунд (`verifySync` c
  `epochTolerance: 30`), чтобы код не «отваливался» на границе окна.
- `enableMfa` сохраняет секрет сразу (`mfaEnabled=false`), а включает MFA только
  после успешного `verifyMfa` — нельзя случайно «залочить» аккаунт.
- `disableMfa` требует действующий код — MFA нельзя снять по одному лишь
  украденному access-токену.
- Защита эндпоинтов — через `JwtAuthGuard` из `@modules/security`; `req.user`
  имеет форму `{ userId, username }` (см. `@modules/security/types.ts`).

### Проверка TOTP-кода вручную

Тот же код, что покажет аутентификатор, можно сгенерировать из секрета:

```bash
node -e "import('otplib').then(m => console.log(m.generateSync({ secret: 'ВАШ_СЕКРЕТ' })))"
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

### Быстрый старт локально (без Docker для backend)

```bash
# 1) поднять только БД
docker compose up -d db

# 2) установить зависимости и подготовить окружение
npm install
cp .env.example .env    # затем вписать DATABASE_URL и JWT_SECRET

# 3) применить миграции
npm run db:migrate

# 4) запустить
npm run start:dev
```

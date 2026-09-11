<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Backend-сервис мессенджера на [NestJS](https://github.com/nestjs/nest) 12, ESM
(`"type": "module"`), Prisma ORM (v8), Redis, gRPC/LiveKit.

## Toolchain — как устроена сборка

Ключевое решение проекта: **весь код пишется с path-алиасами (`@/*`) и без
расширений в импортах** — обычный TS-стиль.

| Задача              | Инструмент                                                 | Где настроено         |
| ------------------- | ---------------------------------------------------------- | --------------------- |
| Сборка (dev + prod) | **tsup** (esbuild + `unplugin-swc`)                        | `tsup.config.ts`      |
| Транспиляция        | **SWC**                                                    | `.swcrc`              |
| Dev-runner          | **tsup --watch** + **node --watch** (через `concurrently`) | `package.json`        |
| Проверка типов      | **tsc** (`--noEmit`)                                       | `tsconfig.build.json` |
| Тесты               | **Vitest** (`vite-tsconfig-paths`)                         | `vitest.config.ts`    |

Почему так:

- **`tsup` (esbuild) — единая сборка для dev и prod.** esbuild сам не умеет
  `emitDecoratorMetadata`, поэтому подключён плагин **`unplugin-swc`** на базе
  `.swcrc`. Так что DI в Nest получает корректную metadata.
- **Alias-резолвинг делается на этапе сборки** (`esbuild.alias` в
  `tsup.config.ts`), а не в рантайме. Node сам `@/*` не умеет — поэтому dev тоже
  гоняется через сборку, а не через `on-the-fly`-транспайлеры вроде `tsx`.
- Почему не `tsx` / `@swc-node` / `nest start --watch` (dev в ESM)? У каждого
  проблема: `tsx` (esbuild) **не эмитит decorator metadata** → падает Swagger и
  DI; `nest start --watch` и `@swc-node` **не резолвят `@/*` в рантайме Node**.
  Единый бандл через `tsup` решает обе проблемы сразу.
- **Все зависимости и нативные модули** (Prisma, gRPC, ioredis, Nest) помечены
  `external` и резолвятся из `node_modules` в рантайме.

### Path aliases

Alias `@/*` резолвится **на этапе сборки** (`esbuild.alias` в `tsup.config.ts`),
поэтому к моменту запуска в `dist/main.js` их уже нет — всё вшито в бандл.

Для статического анализа/типов они объявлены в `tsconfig.json` (и
проксируются в `tsup.config.ts`). Дублирование в `.swcrc` — не требуется для
резолва путей, `unplugin-swc` берёт их из tsconfig.

```
@/*          -> src/*
@modules/*   -> src/modules/*
@common/*    -> src/common/*
@services/*  -> src/services/*
```

> **Правило:** внутри `src/` импорты всегда через алиасы (`@/...`), никогда не
> смешивать относительные пути и алиасы к одному файлу. Смешивание
> (`./app.service` и `@/app.service`) приводит к **двойному бандлингу** класса и
> падению DI в prod.

## Project setup

```bash
$ npm install
```

Требуется **Node.js 20+**.

> Docker: базовый образ — **`node:20` (Debian)**. `@swc/core` и `@prisma/*` —
> нативные модули под glibc, поэтому `node:20-alpine` (musl) без дополнительного
> слоя не подходит (SWC падает с `Failed to load @swc/core`). Если всё же нужен
> Alpine — добавь `apk add --no-cache libc6-compat libstdc++`.

## Compile and run the project

```bash
# dev: tsup --watch пересобирает dist, node --watch перезапускает процесс
$ npm run start:dev

# prod-сборка (tsup -> dist/main.js)
$ npm run build

# prod-запуск собранного бандла
$ npm run start:prod

# debug уже собранного бандла
$ npm run start:debug

# проверка типов отдельно (SWC/tsup типы НЕ проверяют)
$ npm run typecheck
```

> ⚠️ `npm run build` (tsup/SWC) **не выполняет проверку типов**. Перед коммитом
> или в CI обязательно гоняй `npm run typecheck`.

> ℹ️ `start:dev` устроен так: сначала **первичная сборка** (`tsup`), чтобы
> `dist/main.js` гарантированно существовал, затем `concurrently` запускает
> `tsup --watch` (инкрементальная сборка) и `node --watch dist/main.js`
> (автоперезапуск). Первичная сборка нужна, чтобы `node --watch` не упал на
> отсутствующем файле (гонка старта). Это даёт instant-reload без
> on-the-fly-транспайлеров и без проблем с alias/metadata.

## Docker (dev)

`docker-compose.yml` (в корне репозитория) поднимает `backend`, `frontend` и
`db` (Postgres 15). Backend в dev-режиме запускается через `npm run start:dev`
(первичная сборка `tsup`, затем `tsup --watch` + `node --watch` внутри
контейнера).

```bash
# из корня проекта
$ docker compose up --build

# ВАЖНО: после смены зависимостей (package.json) нужно пересоздать
# анонимный том node_modules — иначе контейнер будет использовать старые модули
# (напр. "tsx: not found" или "Failed to load @swc/core"):
$ docker compose down -v --remove-orphans
$ docker compose up --build
```

> Обновить контейнер `backend` после правок кода не нужно — volume `./backend:/app`
> прокидывает изменения, а `tsup --watch` внутри пересобирает бандл.

## Run tests

```bash
# unit tests
$ npm run test

# watch mode
$ npm run test:watch

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Prisma

1. change contract.prisma
2. `npx prisma@latest contract emit`
3. `npx prisma@latest migration plan --name <migration_name>`
4. `npx prisma@latest db migrate`

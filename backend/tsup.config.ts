import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import { resolve } from "node:path";
import * as swcModule from "unplugin-swc";

// tsup bundles this config (CJS interop), so `unplugin-swc`'s unplugin object
// ends up under `.default`. We need its esbuild adapter (a plugin factory).
type UnpluginSwc = { default: { esbuild: (options?: unknown) => EsbuildPlugin } };
type EsbuildPlugin = {
  name: string;
  setup: (build: {
    onResolve: (
      options: { filter: RegExp },
      callback: (args: { path: string }) => { path: string; external: true } | undefined,
    ) => void;
  }) => void;
};
const swc = (swcModule as unknown as UnpluginSwc).default;

// Any bare specifier (package name / Node builtin) must stay external: NestJS
// backends resolve their dependencies from `node_modules` at runtime, and
// Prisma/gRPC/ioredis ship native or dynamic `require`-based modules esbuild
// must not inline. Only our own aliased/relative sources get bundled.
const externalizePackagesPlugin: EsbuildPlugin = {
  name: "externalize-packages",
  setup(build) {
    build.onResolve({ filter: /^[^.@/]/ }, (args) => ({ path: args.path, external: true }));
    build.onResolve({ filter: /^@[^/]+\// }, (args) => {
      // Keep scope packages (`@nestjs/...`, `@prisma/...`) external, but let
      // our own aliases (`@modules`, `@services`, `@common`, `@`) be resolved.
      const scope = args.path.split("/")[0];
      if (
        scope === "@modules" ||
        scope === "@services" ||
        scope === "@common" ||
        args.path.startsWith("@/")
      ) {
        return undefined;
      }
      return { path: args.path, external: true };
    });
  },
};

// Explicit externals as a safety net (also covers `node:` builtins).
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
].filter(
  (name) =>
    !name.startsWith("@modules") &&
    !name.startsWith("@services") &&
    !name.startsWith("@common") &&
    !isBuiltin(name),
);

export default defineConfig({
  entry: ["src/main.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node24",
  platform: "node",
  sourcemap: true,
  // Do not clean in watch mode: `node --watch dist/main.js` starts at the same
  // time as the watcher, and an initial clean would delete the entry point out
  // from under it, crashing with MODULE_NOT_FOUND.
  clean: !process.argv.includes("--watch"),
  dts: false,
  splitting: false,
  // esbuild alone cannot emit `design:paramtypes` decorator metadata that
  // NestJS DI depends on, so we transpile with SWC via unplugin-swc. It reads
  // `.swcrc` (decorators + tsconfig `paths` are resolved by the bundler).
  esbuildPlugins: [externalizePackagesPlugin, swc.esbuild()],
  esbuildOptions(options) {
    options.legalComments = "none";
    // The SWC plugin feeds esbuild virtual `swc:` modules, which strips the
    // resolve directory, so esbuild no longer picks up tsconfig `paths`. Wire
    // the `@/*` aliases up explicitly.
    options.alias = {
      ...(options.alias ?? {}),
      "@modules": resolve("src/modules"),
      "@services": resolve("src/services"),
      "@common": resolve("src/common"),
      "@": resolve("src"),
    };
  },
  external: externals,
});

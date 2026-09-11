#!/usr/bin/env -S node
import type { Contract as End } from "../../snapshots/714f5ea2ce7d56302e4c86d7ff4b8e0ee9f13558f1187152bb7cb6a6669f1ec8/contract.d.ts";
import endContract from "../../snapshots/714f5ea2ce7d56302e4c86d7ff4b8e0ee9f13558f1187152bb7cb6a6669f1ec8/contract.json" with { type: "json" };
import { Migration, MigrationCLI, col, fn, primaryKey } from "@prisma/orm-postgres/migration";

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: "public" }),
      this.createTable({
        schema: "public",
        table: "user",
        columns: [
          col("avatarUrl", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn("now()"),
            codecRef: { codecId: "pg/timestamptz-temporal@1" },
          }),
          col("displayName", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("email", "text", { notNull: true, codecRef: { codecId: "pg/text@1" } }),
          col("id", "SERIAL", { notNull: true, codecRef: { codecId: "pg/int4@1" } }),
          col("password", "text", { notNull: true, codecRef: { codecId: "pg/text@1" } }),
          col("username", "text", { notNull: true, codecRef: { codecId: "pg/text@1" } }),
        ],
        constraints: [primaryKey(["id"])],
      }),
      this.addUnique({
        schema: "public",
        table: "user",
        constraint: "user_email_key",
        columns: ["email"],
      }),
      this.addUnique({
        schema: "public",
        table: "user",
        constraint: "user_username_key",
        columns: ["username"],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

#!/usr/bin/env node
/**
 * Optional deploy-time migrator. Not part of `npm run build` (build is vite only).
 * Soft-skips when DATABASE_URL is missing or the DB is unreachable so publish hosts never hang.
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log(
    "[migrate] DATABASE_URL not set — skipping (PGLite migrates at runtime if needed).",
  );
  process.exit(0);
}

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
);

const CONNECT_MS = Number(process.env.MIGRATE_CONNECT_TIMEOUT_MS || 8000);

async function main() {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: CONNECT_MS,
    idleTimeoutMillis: CONNECT_MS,
  });

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    // Soft-skip unreachable DB (common on static publish hosts)
    const code = err?.code;
    const soft = new Set([
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETIMEDOUT",
      "ECONNRESET",
      "EAI_AGAIN",
      "57P03",
      "28000",
      "28P01",
    ]);
    console.error("[migrate] connect failed:", err?.message || err);
    if (process.env.MIGRATE_STRICT !== "1" && (soft.has(code) || /timeout/i.test(String(err?.message)))) {
      console.warn("[migrate] soft-skip — continuing without migrations.");
      await pool.end().catch(() => {});
      process.exit(0);
    }
    await pool.end().catch(() => {});
    process.exit(1);
  }

  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = new Set(
      (await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name),
    );

    let files = [];
    try {
      files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    } catch {
      console.log("[migrate] no migrations/ directory — nothing to do.");
      return;
    }

    let count = 0;
    for (const name of files) {
      if (applied.has(name)) continue;
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(
      count
        ? `[migrate] done — ${count} migration(s) applied.`
        : "[migrate] up to date.",
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  const code = err?.code;
  const softCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "ECONNRESET",
    "EAI_AGAIN",
    "57P03",
    "28000",
    "28P01",
  ]);
  if (
    process.env.MIGRATE_STRICT !== "1" &&
    (softCodes.has(code) || /timeout/i.test(String(err?.message)))
  ) {
    console.warn("[migrate] soft-skip — continuing.");
    process.exit(0);
  }
  process.exit(1);
});

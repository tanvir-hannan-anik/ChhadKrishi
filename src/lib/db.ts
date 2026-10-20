import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Kysely, PGliteDialect, PostgresDialect, sql, type ColumnDefinitionBuilder, type ColumnType, type Generated } from "kysely";
import { Pool } from "pg";

/**
 * Production uses Postgres via DATABASE_URL (e.g. Neon). Local development falls back to
 * PGlite — real Postgres compiled to WASM, persisted in ./data — so the SQL dialect is
 * identical in both environments and no native modules are required.
 */
function createDialect() {
  if (process.env.DATABASE_URL) {
    return new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }) });
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL must be set in deployed environments; PGlite is for local development only.");
  }
  // PGlite allows one process per data directory; PGLITE_DATA_DIR lets a test server use its own.
  // Dev-only path, so it is excluded from output file tracing.
  const dataDir = path.resolve(/*turbopackIgnore: true*/ process.env.PGLITE_DATA_DIR || path.join(process.cwd(), "data", "pglite"));
  // A single PGlite instance per process, surviving dev hot reloads.
  const globalForDb = globalThis as unknown as { chhadkrishiPglite?: Promise<PGlite> };
  // Opened lazily on the first query, so builds never touch the database files.
  return new PGliteDialect({
    pglite: () => {
      if (!globalForDb.chhadkrishiPglite) {
        mkdirSync(dataDir, { recursive: true });
        globalForDb.chhadkrishiPglite = PGlite.create(dataDir);
      }
      return globalForDb.chhadkrishiPglite;
    },
  });
}

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

/** Application tables. Auth tables are owned and migrated by Better Auth. */
export interface AppDatabase {
  chat_conversation: {
    id: string;
    user_id: string;
    title: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
  chat_message: {
    id: string;
    conversation_id: string;
    role: "user" | "assistant";
    // Stored as UI message parts (text and, for user messages, compressed image data URLs).
    parts: ColumnType<unknown, string, string>;
    seq: Generated<number>;
    created_at: Timestamp;
  };
  garden_profile: {
    user_id: string;
    sun_hours: number | null;
    updated_at: Timestamp;
  };
  garden_plant: {
    id: string;
    user_id: string;
    name: string;
    pot_count: number;
    notes: string;
    created_at: Timestamp;
  };
  care_task: {
    id: string;
    user_id: string;
    plant_id: string | null;
    title: string;
    kind: "water" | "fertilize" | "prune" | "pest" | "other";
    every_days: number;
    time_of_day: "morning" | "afternoon" | "evening";
    // Calendar dates are stored as YYYY-MM-DD in Bangladesh time to avoid timezone drift.
    start_date: string;
    created_at: Timestamp;
  };
  care_log: {
    task_id: string;
    user_id: string;
    done_on: string;
  };
  shop_product: {
    id: string;
    name_bn: string;
    name_en: string;
    category: "seed" | "pot" | "fertilizer";
    price_bdt: number;
    active: boolean;
  };
  cart_item: {
    user_id: string;
    product_id: string;
    quantity: number;
  };
  shop_order: {
    id: string;
    user_id: string;
    status: "requested" | "cancelled";
    customer_name: string;
    phone: string;
    address: string;
    note: string;
    total_bdt: number;
    created_at: Timestamp;
  };
  shop_order_item: {
    order_id: string;
    product_id: string;
    name_bn: string;
    name_en: string;
    unit_price_bdt: number;
    quantity: number;
  };
}

const globalForKysely = globalThis as unknown as { chhadkrishiDb?: Kysely<AppDatabase> };
export const db: Kysely<AppDatabase> = (globalForKysely.chhadkrishiDb ??= new Kysely<AppDatabase>({ dialect: createDialect() }));

/** Idempotently creates the application tables (runs after the auth migrations). */
export async function ensureAppSchema() {
  await db.schema
    .createTable("chat_conversation")
    .ifNotExists()
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("user_id", "text", (c) => c.notNull().references("user.id").onDelete("cascade"))
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema
    .createIndex("chat_conversation_user_updated_idx")
    .ifNotExists()
    .on("chat_conversation")
    .columns(["user_id", "updated_at"])
    .execute();
  await db.schema
    .createTable("chat_message")
    .ifNotExists()
    // Message ids come from the client, so they are only unique within their conversation.
    .addColumn("id", "text", (c) => c.notNull())
    .addColumn("conversation_id", "text", (c) => c.notNull().references("chat_conversation.id").onDelete("cascade"))
    .addColumn("role", "text", (c) => c.notNull())
    .addColumn("parts", "jsonb", (c) => c.notNull())
    .addColumn("seq", "serial")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("chat_message_pk", ["conversation_id", "id"])
    .execute();
  await db.schema
    .createIndex("chat_message_conversation_seq_idx")
    .ifNotExists()
    .on("chat_message")
    .columns(["conversation_id", "seq"])
    .execute();

  // --- Garden & care routine ---
  const userRef = (c: ColumnDefinitionBuilder) => c.notNull().references("user.id").onDelete("cascade");
  await db.schema
    .createTable("garden_profile")
    .ifNotExists()
    .addColumn("user_id", "text", (c) => userRef(c).primaryKey())
    .addColumn("sun_hours", "integer")
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema
    .createTable("garden_plant")
    .ifNotExists()
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("user_id", "text", (c) => userRef(c))
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("pot_count", "integer", (c) => c.notNull().defaultTo(1))
    .addColumn("notes", "text", (c) => c.notNull().defaultTo(""))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex("garden_plant_user_idx").ifNotExists().on("garden_plant").column("user_id").execute();
  await db.schema
    .createTable("care_task")
    .ifNotExists()
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("user_id", "text", (c) => userRef(c))
    .addColumn("plant_id", "text", (c) => c.references("garden_plant.id").onDelete("set null"))
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("kind", "text", (c) => c.notNull())
    .addColumn("every_days", "integer", (c) => c.notNull())
    .addColumn("time_of_day", "text", (c) => c.notNull())
    .addColumn("start_date", "text", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex("care_task_user_idx").ifNotExists().on("care_task").column("user_id").execute();
  await db.schema
    .createTable("care_log")
    .ifNotExists()
    .addColumn("task_id", "text", (c) => c.notNull().references("care_task.id").onDelete("cascade"))
    .addColumn("user_id", "text", (c) => userRef(c))
    .addColumn("done_on", "text", (c) => c.notNull())
    .addPrimaryKeyConstraint("care_log_pk", ["task_id", "done_on"])
    .execute();

  // --- Shop ---
  await db.schema
    .createTable("shop_product")
    .ifNotExists()
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("name_bn", "text", (c) => c.notNull())
    .addColumn("name_en", "text", (c) => c.notNull())
    .addColumn("category", "text", (c) => c.notNull())
    .addColumn("price_bdt", "integer", (c) => c.notNull())
    .addColumn("active", "boolean", (c) => c.notNull().defaultTo(true))
    .execute();
  await db.schema
    .createTable("cart_item")
    .ifNotExists()
    .addColumn("user_id", "text", (c) => userRef(c))
    .addColumn("product_id", "text", (c) => c.notNull().references("shop_product.id").onDelete("cascade"))
    .addColumn("quantity", "integer", (c) => c.notNull())
    .addPrimaryKeyConstraint("cart_item_pk", ["user_id", "product_id"])
    .execute();
  await db.schema
    .createTable("shop_order")
    .ifNotExists()
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("user_id", "text", (c) => userRef(c))
    .addColumn("status", "text", (c) => c.notNull())
    .addColumn("customer_name", "text", (c) => c.notNull())
    .addColumn("phone", "text", (c) => c.notNull())
    .addColumn("address", "text", (c) => c.notNull())
    .addColumn("note", "text", (c) => c.notNull().defaultTo(""))
    .addColumn("total_bdt", "integer", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex("shop_order_user_idx").ifNotExists().on("shop_order").columns(["user_id", "created_at"]).execute();
  await db.schema
    .createTable("shop_order_item")
    .ifNotExists()
    .addColumn("order_id", "text", (c) => c.notNull().references("shop_order.id").onDelete("cascade"))
    .addColumn("product_id", "text", (c) => c.notNull())
    .addColumn("name_bn", "text", (c) => c.notNull())
    .addColumn("name_en", "text", (c) => c.notNull())
    .addColumn("unit_price_bdt", "integer", (c) => c.notNull())
    .addColumn("quantity", "integer", (c) => c.notNull())
    .addPrimaryKeyConstraint("shop_order_item_pk", ["order_id", "product_id"])
    .execute();

  // The catalogue shown on the landing page, seeded once (sample prices — see shop docs).
  await db
    .insertInto("shop_product")
    .values(SEED_PRODUCTS)
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
}

const SEED_PRODUCTS = [
  { id: "seed-tomato-local", name_bn: "দেশি টমেটো বীজ", name_en: "Local tomato seeds", category: "seed" as const, price_bdt: 60, active: true },
  { id: "seed-green-chilli", name_bn: "কাঁচা মরিচ বীজ", name_en: "Green chilli seeds", category: "seed" as const, price_bdt: 40, active: true },
  { id: "pot-clay-12in", name_bn: "১২ ইঞ্চি মাটির টব", name_en: "12-inch clay pot", category: "pot" as const, price_bdt: 180, active: true },
  { id: "pot-grow-bag-5", name_bn: "জিও ব্যাগ (৫টি)", name_en: "Grow bags (5 pcs)", category: "pot" as const, price_bdt: 250, active: true },
  { id: "fert-vermicompost-5kg", name_bn: "ভার্মিকম্পোস্ট ৫ কেজি", name_en: "Vermicompost 5 kg", category: "fertilizer" as const, price_bdt: 220, active: true },
  { id: "fert-neem-cake-1kg", name_bn: "নিম খৈল ১ কেজি", name_en: "Neem cake 1 kg", category: "fertilizer" as const, price_bdt: 90, active: true },
];

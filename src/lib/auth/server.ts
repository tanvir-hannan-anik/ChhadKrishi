import "server-only";

import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { db, ensureAppSchema } from "@/lib/db";

export const auth = betterAuth({
  appName: "ChhadKrishi",
  // Shares the app's Kysely instance (Postgres in production, PGlite locally).
  database: { db, type: "postgres" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // extend at most once a day while active
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    // Persisted so limits hold across serverless instances.
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  advanced: {
    // Migrations run in ensureAuthReady() before any auth request; skip the init-time
    // introspection, which would otherwise query the database while the app is being built.
    database: { validateSchema: false },
    useSecureCookies: process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_URL?.startsWith("https://"),
  },
  plugins: [nextCookies()], // must stay last
});

// Create/upgrade auth tables, then the app tables that reference them, once per module
// instance. Deliberately not on globalThis: when the schema code changes in development the
// module is re-evaluated and the (idempotent) migrations run again, instead of a stale
// "ready" flag from before the change leaving new tables uncreated.
let ready: Promise<void> | undefined;

export function ensureAuthReady(): Promise<void> {
  ready ??= getMigrations(auth.options)
    .then(({ runMigrations }) => runMigrations())
    .then(() => ensureAppSchema())
    .catch((error) => {
      ready = undefined;
      throw error;
    });
  return ready;
}

export type Session = typeof auth.$Infer.Session;

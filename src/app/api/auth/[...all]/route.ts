import { toNextJsHandler } from "better-auth/next-js";
import { auth, ensureAuthReady } from "@/lib/auth/server";

const handlers = toNextJsHandler(auth);

async function handle(method: keyof typeof handlers, request: Request) {
  await ensureAuthReady();
  return handlers[method](request);
}

export const GET = (request: Request) => handle("GET", request);
export const POST = (request: Request) => handle("POST", request);

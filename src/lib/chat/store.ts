import "server-only";

import type { UIMessage } from "ai";
import { db } from "@/lib/db";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

/** Every query is scoped by user id, so one user can never read or change another's chats. */
export async function listConversations(userId: string, limit = 50): Promise<ConversationSummary[]> {
  const rows = await db
    .selectFrom("chat_conversation")
    .select(["id", "title", "updated_at"])
    .where("user_id", "=", userId)
    .orderBy("updated_at", "desc")
    .limit(limit)
    .execute();
  return rows.map((row) => ({ id: row.id, title: row.title, updatedAt: new Date(row.updated_at).toISOString() }));
}

export async function getConversationOwner(conversationId: string): Promise<string | null> {
  const row = await db.selectFrom("chat_conversation").select("user_id").where("id", "=", conversationId).executeTakeFirst();
  return row?.user_id ?? null;
}

export async function loadMessages(userId: string, conversationId: string): Promise<UIMessage[] | null> {
  const owner = await getConversationOwner(conversationId);
  if (owner !== userId) return null;
  const rows = await db
    .selectFrom("chat_message")
    .select(["id", "role", "parts"])
    .where("conversation_id", "=", conversationId)
    .orderBy("seq", "asc")
    .execute();
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: (typeof row.parts === "string" ? JSON.parse(row.parts) : row.parts) as UIMessage["parts"],
  }));
}

export async function createConversation(userId: string, conversationId: string, title: string) {
  await db.insertInto("chat_conversation").values({ id: conversationId, user_id: userId, title }).execute();
}

export async function appendMessage(conversationId: string, message: UIMessage) {
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("chat_message")
      .values({ id: message.id, conversation_id: conversationId, role: message.role as "user" | "assistant", parts: JSON.stringify(message.parts) })
      .onConflict((oc) => oc.columns(["conversation_id", "id"]).doUpdateSet({ parts: JSON.stringify(message.parts) }))
      .execute();
    await trx.updateTable("chat_conversation").set({ updated_at: new Date() }).where("id", "=", conversationId).execute();
  });
}

/** Removes assistant replies after the last user message (used when regenerating). */
export async function deleteTrailingAssistantMessages(conversationId: string, history: UIMessage[]): Promise<UIMessage[]> {
  const lastUserIndex = history.findLastIndex((m) => m.role === "user");
  const trailing = history.slice(lastUserIndex + 1).map((m) => m.id);
  if (trailing.length) await db.deleteFrom("chat_message").where("conversation_id", "=", conversationId).where("id", "in", trailing).execute();
  return history.slice(0, lastUserIndex + 1);
}

/** Drops `history[index]` and everything after it (used when a message is re-sent after an error). */
export async function deleteMessagesFrom(conversationId: string, history: UIMessage[], index: number): Promise<UIMessage[]> {
  const ids = history.slice(index).map((m) => m.id);
  if (ids.length) await db.deleteFrom("chat_message").where("conversation_id", "=", conversationId).where("id", "in", ids).execute();
  return history.slice(0, index);
}

export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  const result = await db.deleteFrom("chat_conversation").where("id", "=", conversationId).where("user_id", "=", userId).executeTakeFirst();
  return Number(result.numDeletedRows) > 0;
}

/** First line of the first question, trimmed to a readable sidebar title. */
export function titleFrom(text: string, fallback: string): string {
  const firstLine = text.trim().split("\n")[0]?.trim() ?? "";
  if (!firstLine) return fallback;
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}

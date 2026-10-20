import { notFound } from "next/navigation";
import { AuthRequired } from "@/components/auth/auth-required";
import { isAiConfigured } from "@/lib/ai/config";
import { getPageSession } from "@/lib/auth/session";
import { listConversations, loadMessages } from "@/lib/chat/store";
import { ChatWorkspace } from "./chat-workspace";

/** Server gate shared by /chat (new conversation) and /chat/[id] (existing conversation). */
export async function ChatGate({ conversationId, question }: { conversationId: string | null; question: string }) {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="chat" expired={expired} />;

  const [conversations, messages] = await Promise.all([
    listConversations(session.user.id),
    conversationId ? loadMessages(session.user.id, conversationId) : Promise.resolve([]),
  ]);
  // Another user's conversation is treated exactly like a missing one.
  if (messages === null) notFound();

  return (
    <ChatWorkspace
      // A fresh key per request, so "New chat" always starts from a clean state.
      key={conversationId ?? `new-${crypto.randomUUID()}`}
      userName={session.user.name}
      conversations={conversations}
      conversationId={conversationId}
      initialMessages={messages}
      initialQuestion={question}
      aiConfigured={isAiConfigured()}
    />
  );
}

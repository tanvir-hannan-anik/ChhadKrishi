import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatGate } from "../chat-gate";
import { ChatSkeleton } from "../chat-skeleton";

export const metadata: Metadata = {
  title: "এআই চ্যাট | ChhadKrishi",
};

export default function ConversationPage({ params }: PageProps<"/chat/[id]">) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: Pick<PageProps<"/chat/[id]">, "params">) {
  const { id } = await params;
  return <ChatGate conversationId={id} question="" />;
}

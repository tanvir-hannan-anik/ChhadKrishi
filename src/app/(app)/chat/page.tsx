import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatGate } from "./chat-gate";
import { ChatSkeleton } from "./chat-skeleton";

export const metadata: Metadata = {
  title: "এআই চ্যাট | ChhadKrishi",
};

export default function ChatPage({ searchParams }: PageProps<"/chat">) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <NewChat searchParams={searchParams} />
    </Suspense>
  );
}

async function NewChat({ searchParams }: Pick<PageProps<"/chat">, "searchParams">) {
  const { q } = await searchParams;
  return <ChatGate conversationId={null} question={typeof q === "string" ? q.trim().slice(0, 4000) : ""} />;
}

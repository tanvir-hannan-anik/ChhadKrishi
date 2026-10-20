import { getServerSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/ai/errors";
import { deleteConversation, loadMessages } from "@/lib/chat/store";

export async function GET(request: Request, { params }: RouteContext<"/api/chat/conversations/[id]">) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);
  const messages = await loadMessages(session.user.id, (await params).id);
  // Someone else's conversation is indistinguishable from a missing one.
  if (!messages) return errorResponse("NOT_FOUND", 404);
  return Response.json({ messages });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/chat/conversations/[id]">) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);
  const deleted = await deleteConversation(session.user.id, (await params).id);
  return deleted ? new Response(null, { status: 204 }) : errorResponse("NOT_FOUND", 404);
}

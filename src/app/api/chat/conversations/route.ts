import { getServerSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/ai/errors";
import { listConversations } from "@/lib/chat/store";

export async function GET(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session) return errorResponse("UNAUTHORIZED", 401);
  return Response.json({ conversations: await listConversations(session.user.id) });
}

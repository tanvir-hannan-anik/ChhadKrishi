import { z } from "zod";
import { parseJson, requireUser } from "@/lib/api";
import { getGarden, setSunHours } from "@/lib/garden/store";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return Response.json(await getGarden(user.userId));
}

const profileInput = z.object({ sunHours: z.number().int().min(0).max(14).nullable() });

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, profileInput);
  if (body instanceof Response) return body;
  await setSunHours(user.userId, body.sunHours);
  return Response.json(await getGarden(user.userId));
}

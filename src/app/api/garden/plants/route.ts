import { apiError, parseJson, requireUser } from "@/lib/api";
import { addPlant, getGarden } from "@/lib/garden/store";
import { plantInput } from "@/lib/validation";

const MAX_PLANTS = 100;

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, plantInput);
  if (body instanceof Response) return body;
  if ((await getGarden(user.userId)).plants.length >= MAX_PLANTS) return apiError("LIMIT_REACHED", 409);
  return Response.json({ plant: await addPlant(user.userId, body) }, { status: 201 });
}

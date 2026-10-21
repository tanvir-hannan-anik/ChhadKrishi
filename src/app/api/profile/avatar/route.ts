import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { auth } from "@/lib/auth/server";
import { getAvatar, setAvatar } from "@/lib/profile/store";

// The browser resizes the photo to 256×256 before upload, so real avatars are far below this.
const MAX_BYTES = 200 * 1024;
const DATA_URL = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/;

/** The gardener's own avatar. The URL carries a version, so it can be cached for good. */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const match = DATA_URL.exec((await getAvatar(user.userId)) ?? "");
  if (!match) return apiError("NOT_FOUND", 404);
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": "private, max-age=31536000, immutable" },
  });
}

const input = z.object({ dataUrl: z.string().max(Math.ceil((MAX_BYTES * 4) / 3) + 64) });

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, input);
  if (body instanceof Response) return body;
  const match = DATA_URL.exec(body.dataUrl);
  if (!match || Buffer.from(match[2], "base64").byteLength > MAX_BYTES) return apiError("IMAGE_INVALID", 400);

  await setAvatar(user.userId, body.dataUrl);
  const image = `/api/profile/avatar?v=${Date.now()}`;
  await auth.api.updateUser({ body: { image }, headers: request.headers });
  return Response.json({ image });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  await setAvatar(user.userId, null);
  await auth.api.updateUser({ body: { image: null }, headers: request.headers });
  return new Response(null, { status: 204 });
}

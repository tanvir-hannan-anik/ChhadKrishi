import { z } from "zod";
import { parseJson, requireUser } from "@/lib/api";
import { auth } from "@/lib/auth/server";
import { geocode } from "@/lib/geo";
import { getProfile, saveProfile } from "@/lib/profile/store";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return Response.json({ profile: await getProfile(user.userId) });
}

const trimmed = (max: number) => z.string().trim().max(max);

const input = z
  .object({
    name: trimmed(60).min(2),
    address: trimmed(300).default(""),
    // Sent only when the address came from the device's live location.
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    placeLabel: trimmed(80).default(""),
    gardeningYears: z.number().int().min(0).max(80).nullable(),
    lang: z.enum(["bn", "en"]).default("bn"),
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null), { path: ["latitude"] });

/**
 * Saves name, address and experience. The weather follows the saved address: live-location
 * coordinates are kept as sent; a typed address is looked up (best effort) when it changes.
 */
export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, input);
  if (body instanceof Response) return body;

  if (body.name !== user.name) await auth.api.updateUser({ body: { name: body.name }, headers: request.headers });

  const saved = await getProfile(user.userId);
  let { latitude, longitude, placeLabel } = body;
  let located = latitude !== null;
  if (latitude === null) {
    if (!body.address) {
      placeLabel = "";
    } else if (body.address === saved.address && saved.latitude !== null) {
      // Unchanged address: keep the coordinates it already resolved to.
      ({ latitude, longitude, placeLabel } = saved);
      located = true;
    } else {
      const found = await geocode(body.address, body.lang);
      if (found) ({ latitude, longitude, placeLabel } = found);
      located = Boolean(found);
    }
  }

  await saveProfile(user.userId, { address: body.address, latitude, longitude, placeLabel, gardeningYears: body.gardeningYears });
  return Response.json({ profile: await getProfile(user.userId), located });
}

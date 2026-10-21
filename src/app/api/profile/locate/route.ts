import { z } from "zod";
import { apiError, parseJson, requireUser } from "@/lib/api";
import { reverseGeocode } from "@/lib/geo";

const input = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  lang: z.enum(["bn", "en"]).default("bn"),
});

/** Turns the device's live location into an address the gardener can review before saving. */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await parseJson(request, input);
  if (body instanceof Response) return body;
  const place = await reverseGeocode(body.latitude, body.longitude, body.lang);
  if (!place) return apiError("LOCATION_LOOKUP_FAILED", 502);
  return Response.json(place);
}

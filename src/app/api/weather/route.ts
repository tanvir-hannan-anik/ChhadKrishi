import { apiError, requireUser } from "@/lib/api";
import { getWeatherForUser } from "@/lib/weather/service";

/** The signed-in gardener's local weather: the past week, now, and the coming week. */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  try {
    return Response.json({ weather: await getWeatherForUser(user.userId) });
  } catch (error) {
    console.warn("[weather] forecast unavailable:", (error as Error).message);
    return apiError("WEATHER_UNAVAILABLE", 503);
  }
}

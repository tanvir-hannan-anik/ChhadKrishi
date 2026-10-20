import { requireUser } from "@/lib/api";
import { listProducts } from "@/lib/shop/store";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return Response.json({ products: await listProducts() });
}

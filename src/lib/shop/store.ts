import "server-only";

import { db } from "@/lib/db";
import { productImage, type ProductCategory } from "@/lib/shop/catalogue";

export type { ProductCategory };

export interface Product {
  id: string;
  nameBn: string;
  nameEn: string;
  category: ProductCategory;
  priceBdt: number;
  /** Photo path under /public, or null when the product has none. */
  image: string | null;
}

export interface CartLine extends Product {
  quantity: number;
}

export interface OrderSummary {
  id: string;
  status: "requested" | "cancelled";
  totalBdt: number;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  items: { productId: string; nameBn: string; nameEn: string; unitPriceBdt: number; quantity: number }[];
}

export const MAX_QUANTITY = 20;

export async function listProducts(): Promise<Product[]> {
  const rows = await db.selectFrom("shop_product").selectAll().where("active", "=", true).orderBy("category").orderBy("price_bdt").execute();
  return rows.map((r) => ({ id: r.id, nameBn: r.name_bn, nameEn: r.name_en, category: r.category, priceBdt: r.price_bdt, image: productImage(r.id) }));
}

export async function getCart(userId: string): Promise<CartLine[]> {
  const rows = await db
    .selectFrom("cart_item")
    .innerJoin("shop_product", "shop_product.id", "cart_item.product_id")
    .select(["shop_product.id", "name_bn", "name_en", "category", "price_bdt", "quantity"])
    .where("cart_item.user_id", "=", userId)
    .where("shop_product.active", "=", true)
    .orderBy("shop_product.name_en")
    .execute();
  return rows.map((r) => ({ id: r.id, nameBn: r.name_bn, nameEn: r.name_en, category: r.category, priceBdt: r.price_bdt, image: productImage(r.id), quantity: r.quantity }));
}

/** Sets a line's quantity (0 removes it). Returns false for unknown or inactive products. */
export async function setCartQuantity(userId: string, productId: string, quantity: number): Promise<boolean> {
  const product = await db.selectFrom("shop_product").select("id").where("id", "=", productId).where("active", "=", true).executeTakeFirst();
  if (!product) return false;
  if (quantity <= 0) {
    await db.deleteFrom("cart_item").where("user_id", "=", userId).where("product_id", "=", productId).execute();
  } else {
    await db
      .insertInto("cart_item")
      .values({ user_id: userId, product_id: productId, quantity })
      .onConflict((oc) => oc.columns(["user_id", "product_id"]).doUpdateSet({ quantity }))
      .execute();
  }
  return true;
}

/**
 * Turns the cart into an order request. Prices are taken from the database at this moment —
 * never from the client — and the cart is emptied in the same transaction.
 */
export async function placeOrder(
  userId: string,
  contact: { customerName: string; phone: string; address: string; note: string },
): Promise<{ id: string; totalBdt: number } | null> {
  return db.transaction().execute(async (trx) => {
    const lines = await trx
      .selectFrom("cart_item")
      .innerJoin("shop_product", "shop_product.id", "cart_item.product_id")
      .select(["shop_product.id", "name_bn", "name_en", "price_bdt", "quantity"])
      .where("cart_item.user_id", "=", userId)
      .where("shop_product.active", "=", true)
      .execute();
    if (lines.length === 0) return null;

    const id = crypto.randomUUID();
    const totalBdt = lines.reduce((sum, line) => sum + line.price_bdt * line.quantity, 0);
    await trx
      .insertInto("shop_order")
      .values({ id, user_id: userId, status: "requested", customer_name: contact.customerName, phone: contact.phone, address: contact.address, note: contact.note, total_bdt: totalBdt })
      .execute();
    await trx
      .insertInto("shop_order_item")
      .values(lines.map((l) => ({ order_id: id, product_id: l.id, name_bn: l.name_bn, name_en: l.name_en, unit_price_bdt: l.price_bdt, quantity: l.quantity })))
      .execute();
    await trx.deleteFrom("cart_item").where("user_id", "=", userId).execute();
    return { id, totalBdt };
  });
}

export async function listOrders(userId: string): Promise<OrderSummary[]> {
  const orders = await db.selectFrom("shop_order").selectAll().where("user_id", "=", userId).orderBy("created_at", "desc").limit(50).execute();
  if (orders.length === 0) return [];
  const items = await db
    .selectFrom("shop_order_item")
    .selectAll()
    .where(
      "order_id",
      "in",
      orders.map((o) => o.id),
    )
    .execute();
  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    totalBdt: o.total_bdt,
    createdAt: new Date(o.created_at).toISOString(),
    customerName: o.customer_name,
    phone: o.phone,
    address: o.address,
    note: o.note,
    items: items
      .filter((i) => i.order_id === o.id)
      .map((i) => ({ productId: i.product_id, nameBn: i.name_bn, nameEn: i.name_en, unitPriceBdt: i.unit_price_bdt, quantity: i.quantity })),
  }));
}

/** Only a still-pending request can be cancelled by its owner. */
export async function cancelOrder(userId: string, orderId: string): Promise<"ok" | "not-found" | "not-cancellable"> {
  const order = await db.selectFrom("shop_order").select("status").where("id", "=", orderId).where("user_id", "=", userId).executeTakeFirst();
  if (!order) return "not-found";
  if (order.status !== "requested") return "not-cancellable";
  await db.updateTable("shop_order").set({ status: "cancelled" }).where("id", "=", orderId).where("user_id", "=", userId).execute();
  return "ok";
}

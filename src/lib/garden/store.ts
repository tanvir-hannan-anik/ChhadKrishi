import "server-only";

import { db } from "@/lib/db";

export interface GardenPlant {
  id: string;
  name: string;
  potCount: number;
  notes: string;
}

export interface Garden {
  sunHours: number | null;
  plants: GardenPlant[];
}

export async function getGarden(userId: string): Promise<Garden> {
  const [profile, plants] = await Promise.all([
    db.selectFrom("garden_profile").select("sun_hours").where("user_id", "=", userId).executeTakeFirst(),
    db.selectFrom("garden_plant").select(["id", "name", "pot_count", "notes"]).where("user_id", "=", userId).orderBy("created_at", "asc").execute(),
  ]);
  return {
    sunHours: profile?.sun_hours ?? null,
    plants: plants.map((p) => ({ id: p.id, name: p.name, potCount: p.pot_count, notes: p.notes })),
  };
}

export async function setSunHours(userId: string, sunHours: number | null) {
  await db
    .insertInto("garden_profile")
    .values({ user_id: userId, sun_hours: sunHours })
    .onConflict((oc) => oc.column("user_id").doUpdateSet({ sun_hours: sunHours, updated_at: new Date() }))
    .execute();
}

export async function addPlant(userId: string, plant: { name: string; potCount: number; notes: string }): Promise<GardenPlant> {
  const id = crypto.randomUUID();
  await db.insertInto("garden_plant").values({ id, user_id: userId, name: plant.name, pot_count: plant.potCount, notes: plant.notes }).execute();
  return { id, ...plant };
}

/** Returns false when the plant does not exist or belongs to someone else. */
export async function updatePlant(userId: string, id: string, patch: Partial<{ name: string; potCount: number; notes: string }>): Promise<boolean> {
  const result = await db
    .updateTable("garden_plant")
    .set({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.potCount !== undefined && { pot_count: patch.potCount }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
    })
    .where("id", "=", id)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}

export async function deletePlant(userId: string, id: string): Promise<boolean> {
  const result = await db.deleteFrom("garden_plant").where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
  return Number(result.numDeletedRows) > 0;
}

export async function ownsPlant(userId: string, plantId: string): Promise<boolean> {
  const row = await db.selectFrom("garden_plant").select("id").where("id", "=", plantId).where("user_id", "=", userId).executeTakeFirst();
  return Boolean(row);
}

/** One-paragraph description of the gardener's setup, given to the AI as context. */
export async function gardenContext(userId: string): Promise<string | null> {
  const garden = await getGarden(userId);
  if (garden.sunHours === null && garden.plants.length === 0) return null;
  const parts: string[] = [];
  if (garden.sunHours !== null) parts.push(`Rooftop gets about ${garden.sunHours} hours of direct sun per day.`);
  if (garden.plants.length) {
    parts.push(`Plants: ${garden.plants.map((p) => `${p.name} (${p.potCount} pot${p.potCount === 1 ? "" : "s"}${p.notes ? `; ${p.notes}` : ""})`).join(", ")}.`);
  }
  return parts.join(" ");
}

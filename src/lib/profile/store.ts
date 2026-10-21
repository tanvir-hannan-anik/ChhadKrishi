import "server-only";

import { db } from "@/lib/db";

/** The gardener's own details beyond the auth account (name and email live on `user`). */
export interface Profile {
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeLabel: string;
  gardeningYears: number | null;
  hasAvatar: boolean;
}

const EMPTY: Profile = { address: "", latitude: null, longitude: null, placeLabel: "", gardeningYears: null, hasAvatar: false };

export async function getProfile(userId: string): Promise<Profile> {
  const row = await db
    .selectFrom("user_profile")
    .select(["address", "latitude", "longitude", "place_label", "gardening_years", (eb) => eb("avatar", "is not", null).as("has_avatar")])
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!row) return EMPTY;
  return {
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    placeLabel: row.place_label,
    gardeningYears: row.gardening_years,
    hasAvatar: Boolean(row.has_avatar),
  };
}

export async function saveProfile(
  userId: string,
  values: { address: string; latitude: number | null; longitude: number | null; placeLabel: string; gardeningYears: number | null },
) {
  const row = {
    address: values.address,
    latitude: values.latitude,
    longitude: values.longitude,
    place_label: values.placeLabel,
    gardening_years: values.gardeningYears,
    updated_at: new Date(),
  };
  await db
    .insertInto("user_profile")
    .values({ user_id: userId, ...row })
    .onConflict((oc) => oc.column("user_id").doUpdateSet(row))
    .execute();
}

export async function setAvatar(userId: string, dataUrl: string | null) {
  await db
    .insertInto("user_profile")
    .values({ user_id: userId, address: "", place_label: "", avatar: dataUrl })
    .onConflict((oc) => oc.column("user_id").doUpdateSet({ avatar: dataUrl, updated_at: new Date() }))
    .execute();
}

export async function getAvatar(userId: string): Promise<string | null> {
  const row = await db.selectFrom("user_profile").select("avatar").where("user_id", "=", userId).executeTakeFirst();
  return row?.avatar ?? null;
}

/** Saved coordinates for the weather, or null when the gardener has not set a location. */
export async function getLocation(userId: string): Promise<{ latitude: number; longitude: number; placeLabel: string } | null> {
  const row = await db.selectFrom("user_profile").select(["latitude", "longitude", "place_label"]).where("user_id", "=", userId).executeTakeFirst();
  if (row?.latitude == null || row.longitude == null) return null;
  return { latitude: row.latitude, longitude: row.longitude, placeLabel: row.place_label };
}

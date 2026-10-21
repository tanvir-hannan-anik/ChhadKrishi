import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { getPageSession } from "@/lib/auth/session";
import { getProfile } from "@/lib/profile/store";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "প্রোফাইল | ChhadKrishi" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <ProfileGate />
    </Suspense>
  );
}

async function ProfileGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="profile" expired={expired} />;
  const profile = await getProfile(session.user.id);
  return <ProfileForm name={session.user.name} email={session.user.email} image={session.user.image ?? null} profile={profile} />;
}

"use client";

import { useEffect, useState } from "react";
import { Protected } from "../components/Protected";
import { MainLayout } from "../components/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { getProfile } from "@/api/profile";
import type { ProfileResponseDTO } from "@/types/api/profile";
import type { User } from "@/types/domain/user";
import { GeneralInfoForm } from "./GeneralInfoForm";
import { SecurityForm } from "./SecurityForm";
import { SleeperEcosystemCard } from "./SleeperEcosystemCard";

export default function ProfilePage() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState<ProfileResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [err, data] = await getProfile();
      if (cancelled) return;
      if (err || !data) setError(err?.message ?? "Failed to load profile");
      else setProfile(data);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdated = (user: User) => setUser(user);

  return (
    <Protected>
      <MainLayout title="Profile" subtitle="Manage your account and security">
        {error && (
          <div className="mb-6 px-4 py-3 rounded-md border bg-red-100 border-red-400 text-red-700 text-sm">
            {error}
          </div>
        )}
        {!profile && !error && <p className="opacity-60">Loading...</p>}
        {profile && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GeneralInfoForm
              defaultValues={{
                name: profile.user.name ?? "",
                email: profile.user.email,
              }}
              onUpdated={handleUpdated}
            />
            <SecurityForm />
            <div className="lg:col-span-2">
              <SleeperEcosystemCard
                sleeper={profile.sleeper}
                activeLeagueCount={profile.activeLeagueCount}
              />
            </div>
          </div>
        )}
      </MainLayout>
    </Protected>
  );
}

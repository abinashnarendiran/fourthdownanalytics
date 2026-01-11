"use client";

import { useState, useEffect } from "react";
import Protected from "../components/Protected";
import MainLayout from "../components/MainLayout";
import PlatformCard from "./PlatformCard";
import AddLeagueModal from "./AddLeagueModal";
import { League, Platform } from "@/types/integration.types";
import { getUserPlatforms } from "@/api/intergrations";
/* import { getIntegrations } from "@/services/integrations.service";
import { Platform, League } from "@/types/integration.types"; */

export default function IntegrationsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      platform: "Sleeper",
      account: undefined, // account not created yet
    },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    platforms[0]
  );

  useEffect(() => {
    const fetchData = async () => {
        const res = await getUserPlatforms();
        if (res[1]) {
          setPlatforms(res[1]);
        } else {
          console.error("Error fetching user platforms:", res[0]);
        }
    }
    
    fetchData()
  }, []);

  const openAddLeagueModal = (platform: Platform) => {
    setSelectedPlatform(platform);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPlatform(null);
    setModalOpen(false);
  };

  const handleLeaguesAdded = (platformId: string, newLeagues: League[]) => {
    setPlatforms(prev =>
      prev.map(p => {
        if (p.platform === platformId && p.account) {
          return {
            ...p,
            account: {
              ...p.account,
              leagues: [...p.account.leagues, ...newLeagues],
            },
          };
        }
        return p;
      })
    );
    closeModal();
  };

  return (
    <Protected>
      <MainLayout>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-gray-600">Manage connected platforms and leagues</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map(platform => (
              <PlatformCard
                key={platform.platform}
                platform={platform}
                onAddLeague={() => openAddLeagueModal(platform)}
              />
            ))}
          </div>

          {modalOpen && selectedPlatform && (
            <AddLeagueModal
              platform={selectedPlatform}
              onClose={closeModal}
              onLeaguesAdded={handleLeaguesAdded}
            />
          )}
        </div>
      </MainLayout>
    </Protected>
  );
}

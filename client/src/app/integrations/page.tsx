'use client';

import { useState, useEffect, useCallback } from 'react';
import { Protected } from '../components/Protected';
import { MainLayout } from '../components/MainLayout';
import { PlatformCard } from './PlatformCard';
import { AddLeagueModal } from './AddLeagueModal';
import { League, Platform, PlatformUser } from '@/types/integration.types';
import {
  addLeagues,
  deleteFantasyPlatform,
  deleteLeague,
  getUserPlatforms,
  resyncPlatform
} from '@/api/intergrations';
import { DeleteLeagueModal } from './DeleteLeagueModal';
import { DeletePlatformModal } from './DeletePlatformModal';
/* import { getIntegrations } from "@/services/integrations.service";
import { Platform, League } from "@/types/integration.types"; */

export default function IntegrationsPage() {
  // List of fantasy platforms connected by the user
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      platform: 'Sleeper',
      account: undefined // No account linked yet
    }
  ]);

  // Currently selected platform card
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    platforms[0]
  );

  // Controls add-league / add-platform modal visibility
  const [addLeaguemodalOpen, setAddLeagueModalOpen] = useState(false);
  const [addError, setAddError] = useState(false);
  const [addErrorMessage, setAddErrorMessage] = useState('');

  // Controls delete-league confirmation modal
  const [deleteLeagueModalOpen, setDeleteLeagueModalOpen] = useState(false);

  // Controls delete-platform confirmation modal
  const [deletePlatformModalOpen, setDeletePlatformModalOpen] = useState(false);

  // Selected league object (for UI + confirmation text)
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);

  // Selected league DB ID (used for deletion API call)
  const [selectedLeagueDBId, setSelectedLeagueDBId] = useState<
    string | undefined
  >();

  // Resyncing
  const [isResyncing, setIsResyncing] = useState(false);

  // Selected fantasy platform ID (used for platform deletion)
  const [selectedFantasyPlatformId, setSelectedFantasyPlatformId] = useState<
    string | undefined
  >();

  const fetchData = async () => {
    const res = await getUserPlatforms();

    if (res[1]) {
      setPlatforms(res[1]);
    } else {
      console.error('Error fetching user platforms:', res[0]);
    }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []); // runs once on mount

  const openAddLeagueModal = (platform: Platform) => {
    setSelectedPlatform(platform);
    setAddLeagueModalOpen(true);
  };

  const openDeleteLeagueModal = (fantasyDbLeagueId: string) => {
    setDeleteLeagueModalOpen(true);
    setSelectedLeagueDBId(fantasyDbLeagueId);
    const platform = platforms.find((p) =>
      p.account?.leagues.some((l) => l.id === fantasyDbLeagueId)
    );
    setSelectedPlatform(platform || null);
    setSelectedLeague(
      platform?.account?.leagues.find((l) => l.id === fantasyDbLeagueId) || null
    );
  };

  const openDeleteFantasyPlatformAccountModal = (fantasyPlatformId: string) => {
    setSelectedFantasyPlatformId(fantasyPlatformId);
    const platform = platforms.find(
      (p) => p.account?.fantasyPlatformId === fantasyPlatformId
    );
    setSelectedPlatform(platform || null);
    setDeletePlatformModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPlatform(null);
    setAddLeagueModalOpen(false);
    setSelectedLeagueDBId('');
    setSelectedLeague(null);
    setSelectedFantasyPlatformId('');
    setDeleteLeagueModalOpen(false);
    setAddError(false);
    setAddErrorMessage('');
  };

  const handleLeaguesAdded = async (
    platformUserData: PlatformUser | null,
    newLeagues: League[]
  ) => {
    if (!platformUserData) return; // exit if null

    try {
      // Remove duplicate leagues based on leagueId before saving
      const uniqueLeagues = newLeagues.filter(
        (league, index, self) =>
          self.findIndex((l) => l.leagueId === league.leagueId) === index
      );

      // Optionally filter out any invalid leagues
      const filteredLeagues = uniqueLeagues.filter(
        (l) => l.leagueId && l.leagueName
      );

      platformUserData.leagues = filteredLeagues;

      const adding = await addLeagues(platformUserData);
      const error = adding[0]; // first element is error

      if (error) {
        setAddError(true);
        setAddErrorMessage(error?.message || '');
      } else {
        setAddError(false);
        setAddErrorMessage('');
        await fetchData();
        closeModal();
      }
    } catch (err) {
      console.error('Failed to add leagues:', err);
    }
  };

  const handleDeleteLeague = async (id: string) => {
    await deleteLeague(id);

    await fetchData();
    closeModal();
  };

  const handleDeletePlatform = async (fantasyPlatformId: string) => {
    await deleteFantasyPlatform(fantasyPlatformId);

    await fetchData();
    closeModal();
  };

  const handleResyncing = (platform: Platform) => async () => {
    setIsResyncing(true);
    // Here you would call the API to resync the platform
    await resyncPlatform(platform);
    await fetchData();
    setIsResyncing(false);
  };

  return (
    <Protected>
      <MainLayout>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-gray-600">
            Manage connected platforms and leagues
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform) => (
              <PlatformCard
                key={platform.platform}
                platform={platform}
                onAddLeague={() => openAddLeagueModal(platform)}
                onDeleteLeague={openDeleteLeagueModal} // pass modal opener
                onDeletePlatform={openDeleteFantasyPlatformAccountModal} // pass modal opener
                isResyncing={isResyncing}
                onResyncing={handleResyncing(platform)}
              />
            ))}
          </div>

          {addLeaguemodalOpen && selectedPlatform && (
            <AddLeagueModal
              platform={selectedPlatform}
              onClose={closeModal}
              onLeaguesAdded={handleLeaguesAdded}
              addError={addError}
              addErrorMessage={addErrorMessage}
            />
          )}
          {deleteLeagueModalOpen && selectedLeagueDBId && selectedPlatform && (
            <DeleteLeagueModal
              platform={selectedPlatform}
              leagueId={selectedLeagueDBId}
              league={selectedLeague}
              onClose={() => setDeleteLeagueModalOpen(false)}
              onDeleteLeague={handleDeleteLeague}
            />
          )}
          {deletePlatformModalOpen &&
            selectedPlatform &&
            selectedFantasyPlatformId && (
            <DeletePlatformModal
              platform={selectedPlatform}
              fantasyPlatformId={selectedFantasyPlatformId}
              onClose={() => setDeletePlatformModalOpen(false)}
              onDeleteAccount={handleDeletePlatform}
            />
          )}
        </div>
      </MainLayout>
    </Protected>
  );
}

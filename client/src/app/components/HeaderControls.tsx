import React from "react";
import LeagueSelector from "./LeagueSelector";
import CurrentWeekSelector from "./CurrentWeekSelector";
import { LEAGUE_STATUS } from "@/constants/leagueStatusSleeper";
import type { FantasyLeague } from "@/types/viewModels/integrations";
import TeamSelector from "./TeamSelector";
import type { TeamRosterOption } from "@/types/viewModels/teamAnalysis";

interface HeaderControlsProps {
  selectedLeague: FantasyLeague | null;
  handleGetLeagues: (data: FantasyLeague[]) => void;
  handleSelectLeague: (league: FantasyLeague) => void;
  selectedWeek: number;
  handleSelectWeek: (week: number) => void;
  loading: boolean;
  leagueMetaData: {
    leagueStatus: string;
  } | null;
  chooseTeam?: boolean; // Optional prop to conditionally show team selector
  setTeams?: (teams: TeamRosterOption[]) => void;
  selectedTeam?: TeamRosterOption | null;
  setSelectedTeam?: (team: TeamRosterOption) => void;
  onPrefetchTeam?: (team: TeamRosterOption) => void;
  initialTeamId?: number | null;
}

const HeaderControls: React.FC<HeaderControlsProps> = ({
  selectedLeague,
  handleGetLeagues,
  handleSelectLeague,
  selectedWeek,
  handleSelectWeek,
  loading,
  leagueMetaData,
  chooseTeam = false,
  setTeams,
  selectedTeam,
  setSelectedTeam,
  onPrefetchTeam,
  initialTeamId,
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col">
        <LeagueSelector
          selected={selectedLeague ?? undefined}
          onGetLeagues={handleGetLeagues}
          onSelect={handleSelectLeague}
          disabled={loading}
        />
      </div>

      {(leagueMetaData?.leagueStatus === LEAGUE_STATUS.inSeason.value ||
        leagueMetaData?.leagueStatus === LEAGUE_STATUS.complete.value) && (
        <div className="flex flex-col">
          <CurrentWeekSelector
            currentWeek={selectedWeek}
            disabled={loading}
            onSelect={handleSelectWeek}
          />
        </div>
      )}
      {chooseTeam && selectedLeague?.id && (
        <div className="flex flex-col">
          <TeamSelector
            onGetTeams={setTeams}
            id={selectedLeague.id}
            selected={selectedTeam}
            onSelect={setSelectedTeam}
            onPrefetch={onPrefetchTeam}
            initialRosterId={initialTeamId}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
};

export default HeaderControls;

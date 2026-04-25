import React from "react";
import LeagueSelector from "./LeagueSelector";
import CurrentWeekSelector from "./CurrentWeekSelector";
import { LEAGUE_STATUS } from "@/constants/leagueStatusSleeper";
import { FantasyLeague } from "@/types/integration.types";
import TeamSelector from "./TeamSelector";

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
  setTeams?: (teams: any[]) => void; // Function to set teams in parent component
  selectedTeam?: any; // Currently selected team
  setSelectedTeam?: (team: any) => void; // Function to set selected team in parent component
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

      {leagueMetaData?.leagueStatus === LEAGUE_STATUS.inSeason.value && (
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
            />
        </div>
      )}
    </div>
  );
};

export default HeaderControls;
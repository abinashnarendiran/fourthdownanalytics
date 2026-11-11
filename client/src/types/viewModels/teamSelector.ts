import type { TeamRosterOption } from "@/types/viewModels/teamAnalysis";

export interface TeamSelectorProps {
  id: string;
  selected?: TeamRosterOption | null;
  label?: string;
  className?: string;
  selectClassName?: string;
  onSelect?: (team: TeamRosterOption) => void;
  onGetTeams?: (teams: TeamRosterOption[]) => void;
  disabled?: boolean;
  excludeId?: number;
  defaultEmpty?: boolean;
  allowEmpty?: boolean;
}

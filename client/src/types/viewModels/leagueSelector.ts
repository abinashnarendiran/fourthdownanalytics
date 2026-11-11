import type { FantasyLeague } from "@/types/viewModels/integrations";

export interface LeagueSelectorProps {
  selected?: FantasyLeague;
  label?: string;
  className?: string;
  selectClassName?: string;
  onSelect?: (league: FantasyLeague) => void;
  onGetLeagues?: (leagues: FantasyLeague[]) => void;
  disabled?: boolean;
}

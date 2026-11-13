// leagueStatus.ts

export const LEAGUE_STATUS = {
  preDraft: { value: "pre_draft", label: "Pre-Draft" },
  drafting: { value: "drafting", label: "Drafting" },
  inSeason: { value: "in_season", label: "In Season" },
  complete: { value: "complete", label: "Season Complete" },
} as const;

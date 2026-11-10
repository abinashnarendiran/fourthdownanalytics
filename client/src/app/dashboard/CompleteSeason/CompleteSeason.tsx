import React from "react";
import PowerRankings from "./PowerRankings";
import type { CompleteSeasonViewModel } from "@/types/viewModels/dashboard";

interface CompleteSeasonProps {
  seasonData: CompleteSeasonViewModel;
}
const CompleteSeason: React.FC<CompleteSeasonProps> = ({ seasonData }) => {
  return (
    <div style={{ padding: "2rem" }}>
      <PowerRankings
        powerRankings={seasonData?.finalPowerRankings || []}
        isInSeason={false}
      />
    </div>
  );
};

export default CompleteSeason;

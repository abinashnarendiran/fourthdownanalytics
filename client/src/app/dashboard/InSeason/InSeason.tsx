import React from "react";
import PowerRankings from "../CompleteSeason/PowerRankings";
import type { InSeasonViewModel } from "@/types/viewModels/dashboard";

interface InSeasonProps {
  seasonData: InSeasonViewModel;
}

const InSeason: React.FC<InSeasonProps> = ({ seasonData }) => {

  return (
    <div style={{ padding: "2rem" }}>
      <PowerRankings
        powerRankings={seasonData?.powerRankings || []}
        isInSeason={true}
      />
    </div>
  );
};

export default InSeason;

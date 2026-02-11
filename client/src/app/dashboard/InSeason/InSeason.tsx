import CurrentWeekSelector from "@/app/components/CurrentWeekSelector";
import React, { useState } from "react";
import PowerRankings from "../CompleteSeason/PowerRankings";

const InSeason: React.FC<any> = ({ seasonData }) => {

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

import CurrentWeekSelector from "@/app/components/CurrentWeekSelector";
import React, { useState } from "react";
import InSeasonPowerRankings from "./InSeasonPowerRankings";

const InSeason: React.FC<any> = ({ seasonData }) => {

  return (
    <div style={{ padding: "2rem" }}>
      <InSeasonPowerRankings
        inSeasonRankings={seasonData?.powerRankings || []}
      />
    </div>
  );
};

export default InSeason;

import React, { useState } from "react";
import TeamAnalysisView from "../teamAnalysis";

const InSeason: React.FC<any> = ({ seasonData, selectedLeague, selectedTeam, selectedWeek, comparisonTeam, setComparisonTeam }) => {
  return (
    <div style={{ padding: "2rem" }}>
      <TeamAnalysisView
        data={seasonData || {}}
        selectedLeague={selectedLeague || null}
        selectedTeam={selectedTeam}
        selectedWeek={selectedWeek}
        comparisonTeam={comparisonTeam}
        setComparisonTeam={setComparisonTeam}

      />
    </div>
  );
};

export default InSeason;

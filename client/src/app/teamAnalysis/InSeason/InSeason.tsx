import React, { useState } from "react";
import TeamAnalysisView from "../teamAnalysis";

const InSeason: React.FC<any> = ({ seasonData }) => {
  return (
    <div style={{ padding: "2rem" }}>
      <TeamAnalysisView data={seasonData || {}} />
    </div>
  );
};

export default InSeason;

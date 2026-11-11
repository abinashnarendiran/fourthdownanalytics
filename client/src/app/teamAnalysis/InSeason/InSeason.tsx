import React from "react";
import TeamAnalysisView from "../teamAnalysis";
import type { TeamAnalysisData } from "@/types/viewModels/teamAnalysis";

interface InSeasonProps {
  data: TeamAnalysisData;
}

const InSeason: React.FC<InSeasonProps> = ({ data }) => {
  return (
    <div>
      <TeamAnalysisView data={data} />
    </div>
  );
};

export default InSeason;

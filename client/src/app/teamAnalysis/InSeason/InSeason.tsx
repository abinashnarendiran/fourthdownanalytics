import React from "react";
import TeamAnalysisView from "../teamAnalysis";
import type {
  TeamAnalysisData,
  TeamAnalysisMetricTab,
} from "@/types/viewModels/teamAnalysis";

interface InSeasonProps {
  data: TeamAnalysisData;
  activeMetric: TeamAnalysisMetricTab;
  onMetricChange: (metric: TeamAnalysisMetricTab) => void;
}

const InSeason: React.FC<InSeasonProps> = ({
  data,
  activeMetric,
  onMetricChange,
}) => {
  return (
    <div>
      <TeamAnalysisView
        data={data}
        activeMetric={activeMetric}
        onMetricChange={onMetricChange}
      />
    </div>
  );
};

export default InSeason;

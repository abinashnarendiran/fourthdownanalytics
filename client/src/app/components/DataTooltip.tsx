"use client";

import React, { useState } from "react";

interface StatTooltip {
  label: string;
  description: string;
}

interface DataTooltipProps {
  stats: StatTooltip[];
}

const DataTooltip: React.FC<DataTooltipProps> = ({ stats }) => {
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-wrap justify-center gap-4 mb-6">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="relative"
          onMouseEnter={() => setVisibleIndex(idx)}
          onMouseLeave={() => setVisibleIndex(null)}
        >
          <span className="font-semibold cursor-pointer text-accent select-none">
            {stat.label} ℹ️
          </span>

          {visibleIndex === idx && (
            <div className="absolute z-20 w-64 bg-background text-foreground text-sm p-3 rounded shadow-lg -top-16 left-1/2 transform -translate-x-1/2">
              {stat.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DataTooltip;

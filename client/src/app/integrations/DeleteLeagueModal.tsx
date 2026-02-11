"use client";

import React, { useState } from "react";
import { League, Platform } from "../../types/integration.types";

interface DeleteLeagueModalProps {
  platform: Platform;
  leagueId: string;
  league: League | null;
  onClose: () => void;
  onDeleteLeague: (id: string) => void; // use `id` (your internal one) for deletion
}

export const DeleteLeagueModal: React.FC<DeleteLeagueModalProps> = ({
  platform,
  leagueId,
  league,
  onClose,
  onDeleteLeague
}) => {
  // Loading state
  const [loading, setLoading] = useState(false);

  // Handle deletion
  const handleDelete = () => {
    setLoading(true);
    try {
      onDeleteLeague(leagueId);
      onClose();
    } catch (err) {
      console.error("Failed to delete league:", err);
      alert("Failed to delete league.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)"
        }}
      >
        <button className="text-gray-500 text-sm mb-4" onClick={onClose}>
          ✕ Close
        </button>

        <h2 className="text-lg font-semibold">Delete League</h2>
        <p className="mt-2 text-gray-700">
          Are you sure you want to delete <strong>{league?.leagueName}</strong>{" "}
          from {platform.platform} on our platform?
        </p>

        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-gray-700 border hover:opacity-90 transition"
            style={{ borderColor: "var(--accent)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded text-white hover:opacity-90 transition"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

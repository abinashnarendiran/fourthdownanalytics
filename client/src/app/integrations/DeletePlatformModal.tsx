"use client";

import React, { useState } from "react";
import type { Platform } from "@/types/viewModels/integrations";

interface DeletePlatformModalProps {
  platform: Platform;
  fantasyPlatformId: string;
  onClose: () => void;
  onDeleteAccount: (platformId: string) => void; // Pass platform identifier
}

export const DeletePlatformModal: React.FC<DeletePlatformModalProps> = ({
  platform,
  fantasyPlatformId,
  onClose,
  onDeleteAccount
}) => {
  // Loading state
  const [loading, setLoading] = useState(false);

  // Handle deletion
  const handleDelete = () => {
    setLoading(true);
    try {
      onDeleteAccount(fantasyPlatformId); // Pass the platform ID
      onClose();
    } catch (err) {
      console.error("Failed to delete platform account:", err);
      alert("Failed to delete platform account.");
    } finally {
      setLoading(false);
    }
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

        <h2 className="text-lg font-semibold">Delete Platform Account</h2>
        <p className="mt-2 text-gray-700">
          Are you sure you want to delete the{" "}
          <strong>{platform.platform}</strong> account?
          <br />
          <span className="text-sm text-gray-500">
            This will remove all connected leagues as well.
          </span>
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
            {loading ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

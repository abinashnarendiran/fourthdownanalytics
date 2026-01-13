import React, { ReactNode } from "react";

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

// Generic modal wrapper
export const ModalWrapper: React.FC<ModalWrapperProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
      >
        <button
          className="text-gray-500 text-sm mb-4"
          onClick={onClose}
        >
          ✕ Close
        </button>

        {children}
      </div>
    </div>
  );
};

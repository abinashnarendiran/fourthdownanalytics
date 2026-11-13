import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/apiConfig/client";

const cardClass = "border border-border rounded-lg p-6 shadow-sm bg-background";
export const profileStyles = {
  card: cardClass,
  title: "text-lg font-bold text-primary dark:text-foreground mb-1",
  description: "text-sm opacity-60 mb-5",
  label: "block text-sm font-medium mb-1",
  input:
    "w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent",
  error: "text-red-500 text-sm mt-1",
  banner: "px-4 py-3 rounded-md text-sm border",
  errorBanner: "bg-red-100 border-red-400 text-red-700",
  successBanner: "bg-green-100 border-green-400 text-green-700",
  button:
    "bg-accent text-white px-4 py-2 rounded-md text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50",
} as const;

/** Maps backend `fieldErrors` onto form fields; returns the general message otherwise. */
export const applyServerError = <T extends FieldValues>(
  error: Error,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
): string | null => {
  if (error instanceof ApiError && error.fieldErrors) {
    let mapped = false;
    fields.forEach((field) => {
      const messages = error.fieldErrors?.[field];
      if (messages && messages.length > 0) {
        setError(field, { type: "server", message: messages[0] });
        mapped = true;
      }
    });
    if (mapped) return null;
  }
  return error.message;
};

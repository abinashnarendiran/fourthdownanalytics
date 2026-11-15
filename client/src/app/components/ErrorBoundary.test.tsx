import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

let shouldThrow = true;

function FlakyChild() {
  if (shouldThrow) {
    throw new Error("boom");
  }
  return <p>Recovered content</p>;
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>Healthy content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Healthy content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an accessible fallback with the given title when a child throws", () => {
    shouldThrow = true;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary title="Dashboard failed to load">
        <FlakyChild />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Dashboard failed to load");
    expect(screen.queryByText("Recovered content")).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });

  it("re-renders children after the user clicks Try again", async () => {
    shouldThrow = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <FlakyChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Recovered content")).toBeInTheDocument();
  });
});

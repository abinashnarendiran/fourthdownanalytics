import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Protected } from "./Protected";
import { renderWithProviders } from "@/test/renderWithProviders";
import { apiUrl, server } from "@/test/server";
import { routerMock } from "@/test/navigation";

describe("Protected", () => {
  it("renders its children for an authenticated user", async () => {
    renderWithProviders(
      <Protected>
        <p>Secret dashboard</p>
      </Protected>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(await screen.findByText("Secret dashboard")).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("redirects to /login and hides children when the user is signed out", async () => {
    server.use(
      http.get(apiUrl("auth/me"), () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
      ),
    );

    renderWithProviders(
      <Protected>
        <p>Secret dashboard</p>
      </Protected>,
    );

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

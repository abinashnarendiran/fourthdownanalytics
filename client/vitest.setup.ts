import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "@/test/server";

vi.mock("next/navigation", async () => {
  const nav = await import("@/test/navigation");
  return {
    useRouter: () => nav.routerMock,
    usePathname: () => nav.navigationState.pathname,
    useSearchParams: () => new URLSearchParams(nav.navigationState.search),
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());

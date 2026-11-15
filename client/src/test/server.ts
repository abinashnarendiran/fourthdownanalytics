import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { API_BASE_URL, userFixture } from "@/test/fixtures";

export const apiUrl = (path: string) => `${API_BASE_URL}/${path}`;

export const handlers = [
  http.get(apiUrl("auth/me"), () => HttpResponse.json(userFixture)),
  http.get(apiUrl("leagues/getUserLeagues"), () =>
    HttpResponse.json({ leagues: [] }),
  ),
  http.get(apiUrl("integrations/userPlatforms"), () =>
    HttpResponse.json({ platforms: [] }),
  ),
];

export const server = setupServer(...handlers);

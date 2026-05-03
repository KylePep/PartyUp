import { apiGet } from "../client";

export type Game = {
  id: string;
  externalId: number;
  name: string;
  imageUrl: string;
};

export type PagedGames = {
  games: Game[];
  totalCount: number;
  page: number;
  totalPages: number;
};

export type GamesParams = {
  q?: string;
  page?: number;
  genres?: number[];
};

export function getGames(params: GamesParams = {}): Promise<PagedGames> {
  const qs = new URLSearchParams();

  if (params.q) qs.set("q", params.q);
  if (params.page && params.page > 1) qs.set("page", params.page.toString());
  params.genres?.forEach((g) => qs.append("genres", g.toString()));

  const query = qs.toString();
  return apiGet<PagedGames>(`/games${query ? `?${query}` : ""}`);
}

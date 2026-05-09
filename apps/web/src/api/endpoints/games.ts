import { apiGet } from "../client";

export type Game = {
  id: string;
  externalId: number;
  name: string;
  imageUrl: string;
};

export type GameDetails = {
  externalId: number;
  name: string;
  description: string;
  imageUrl: string | null;
  website: string | null;
  rating: number;
  platforms: string[];
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
  exclude_additions?: boolean;
};

export function getGames(params: GamesParams = {}): Promise<PagedGames> {
  const qs = new URLSearchParams();

  if (params.q) qs.set("q", params.q);
  if (params.page && params.page > 1) qs.set("page", params.page.toString());
  params.genres?.forEach((g) => qs.append("genres", g.toString()));
  if (params.exclude_additions) qs.append("exclude_additions", params.exclude_additions ? "true" : "false");

  const query = qs.toString();
  return apiGet<PagedGames>(`/games${query ? `?${query}` : ""}`);
}

export function getGameDetails(externalId: number): Promise<GameDetails> {
  return apiGet<GameDetails>(`/games/${externalId}`);
}

export function getGameDetailsByDbId(gameId: string): Promise<GameDetails> {
  return apiGet<GameDetails>(`/games/${gameId}`);
}

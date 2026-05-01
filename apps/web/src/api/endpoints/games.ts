import { apiGet } from "../client";

export type Game = {
  id: string;
  externalId: number;
  name: string;
  imageUrl: string;
};

export function getGames(genres?: string) {
  const query = genres ? `?${genres}` : "";

  return apiGet<Game[]>(`/games${query}`);
}

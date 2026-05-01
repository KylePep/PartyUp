import { apiGet } from "../client";

export type Game = {
  id: string;
  externalId: number;
  name: string;
  imageUrl: string;
};

export function getGames() {
  return apiGet<Game[]>("/games");
}

import { apiDelete, apiGet, apiPost } from "../client";
import type { Game } from "./games";

export type AddUserGamePayload = {
  externalId: number;
  name: string;
  imageUrl: string | null;
};

export type UserGame = {
  id: string;
  userId: string;
  gameId: string;
  game: Game;
}

export function addUserGame(payload: AddUserGamePayload): Promise<UserGame> {
  return apiPost<UserGame>("/user-games", payload);
}

export function getUserGames(): Promise<UserGame[]> {
  return apiGet<UserGame[]>("/user-games");
}

export function deleteUserGame(id: string): Promise<void>{
  return apiDelete<void>(`/user-games/${id}`)
}

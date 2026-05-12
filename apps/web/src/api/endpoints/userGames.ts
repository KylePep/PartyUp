import { apiDelete, apiGet, apiPost } from "../client";

export type AddUserGamePayload = {
  externalId: number;
  name: string;
  imageUrl: string | null;
};

export type UserGame = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  gameImageUrl: string | null;
};

export type UserGameDetail = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  gameImageUrl: string | null;
  description: string | null;
  website: string | null;
  rating: number;
  platforms: string[];
};

export function addUserGame(payload: AddUserGamePayload): Promise<UserGame> {
  return apiPost<UserGame>("/user-games", payload);
}

export function getUserGames(): Promise<UserGame[]> {
  return apiGet<UserGame[]>("/user-games");
}

export function getUserGameByGameId(gameId: string): Promise<UserGameDetail> {
  return apiGet<UserGameDetail>(`/user-games/${gameId}/game`);
}

export function deleteUserGame(id: string): Promise<void> {
  return apiDelete<void>(`/user-games/${id}`);
}

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
  gameImageUrl: string;
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

import { apiGet, apiPost } from "../client";
import type { Game } from "./games";

export type AddUserGamePayload = {
  externalId: number;
  name: string;
  imageUrl: string | null;
};

export function addUserGame(payload: AddUserGamePayload): Promise<object> {
  return apiPost<object>("/user-games", payload);
}

export function getUserGames(): Promise<Game[]> {
  return apiGet<Game[]>("/user-games");
}

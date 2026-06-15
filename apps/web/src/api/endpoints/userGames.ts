import { apiDelete, apiGet, apiPost } from "../client";

export type AddUserGamePayload = {
  externalId: number;
  name: string;
  imageUrl: string | null;
  skipParentRedirect?: boolean;
};

export type UserGame = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  gameImageUrl: string | null;
  createdAt: string;
  newMatchCount: number;
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

export type AddUserGameResult = {
  userGame: UserGame;
  redirected: boolean;
  message: string | null;
};

export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export function addUserGame(payload: AddUserGamePayload): Promise<AddUserGameResult> {
  return apiPost<AddUserGameResult>("/user-games", payload);
}

export function getUserGames(page: number, pageSize: number): Promise<PagedResult<UserGame>> {
  return apiGet<PagedResult<UserGame>>(`/user-games?page=${page}&pageSize=${pageSize}`)
}

export function getUserGameByGameId(gameId: string): Promise<UserGameDetail> {
  return apiGet<UserGameDetail>(`/user-games/${gameId}/game`);
}

export function deleteUserGame(id: string): Promise<void> {
  return apiDelete<void>(`/user-games/${id}`);
}

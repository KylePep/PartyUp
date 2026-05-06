import { apiGet, apiPost } from "../client";

export type Character = {
  id: string;
  name: string;
  bio?: string;
  playstyle?: string;
  rank?: string;
  region?: string;
  userGameId?: string;
};

export type CharacterCreate = {
  name: string;
  bio?: string;
  playstyle?: string;
  rank?: string;
  region?: string;
  userGameId: string;
};

export type DiscoverCharacter = Character & {
  gameName?: string;
  gameImageUrl?: string;
};

export type MatchResponse = {
  
characterAId : string;
characterBId : string;
isMatch : false;
matchId : string;
matchedAt : Date;
}

export type InteractionType = "Like" | "Dislike";

export function getCharacters() {
  return apiGet<Character[]>("/characters");
}

export function createCharacter(data: CharacterCreate) {
  return apiPost<Character>("/characters", data);
}

export function discoverCharacters(gameId: string) {
  return apiGet<DiscoverCharacter[]>(`/characters/discover?gameId=${gameId}`);
}

export function interactWithCharacter(fromCharacterId: string, toCharacterId: string, type: InteractionType) {
  return apiPost<MatchResponse>("/character-interactions", {fromCharacterId, toCharacterId, type });
}

export function getMatches() {
  return apiGet<Character[]>("/character-matches");
}

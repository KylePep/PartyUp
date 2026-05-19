import { apiGet, apiPost, apiPostForm } from "../client";

export type Character = {
  id: string;
  userGameId?: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  mainRole?: string;
  secondaryRole?: string;
  preferredModes: string[];
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  playstyle?: string;
  rank?: string;
  region?: string;
};

export type CharacterCreate = {
  userGameId: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  mainRole?: string;
  secondaryRole?: string;
  preferredModes: string[];
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  playstyle?: string;
  rank?: string;
  region?: string;
  gameFields?: CharacterFieldValueCreate[];
};

export type CharacterFieldValueCreate = {
  fieldDefinitionId: string;
  value: string;
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

export function getUserGameCharacters(userGameId: string){
  return apiGet<Character[]>(`/characters/${userGameId}/userGame`);
}

export function createCharacter(data: CharacterCreate) {
  return apiPost<Character>("/characters", data);
}

export function discoverCharacters(gameId: string, filters?: Record<string, string>) {
  const qs = new URLSearchParams({ gameId, ...filters });
  return apiGet<DiscoverCharacter[]>(`/characters/discover?${qs.toString()}`);
}

export function uploadCharacterImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiPostForm<{ url: string }>("/characters/image", form);
}

export function interactWithCharacter(fromCharacterId: string, toCharacterId: string, type: InteractionType) {
  return apiPost<MatchResponse>("/character-interactions", {fromCharacterId, toCharacterId, type });
}


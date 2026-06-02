import { apiDelete, apiGet, apiPost, apiPostForm, apiPut } from "../client";

export type CharacterGameField = {
  fieldDefinitionId: string;
  key: string;
  label: string;
  value: string;
  type: string;
  commonField?: string;
};

export type Character = {
  id: string;
  userGameId?: string;
  gameId?: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameName?: string;
  gameImageUrl?: string;
  gameFields: CharacterGameField[];
};

export type CharacterCreate = {
  userGameId: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameFields?: CharacterFieldValueCreate[];
};

export type CharacterFieldValueCreate = {
  fieldDefinitionId: string;
  value: string;
};

export type CharacterUpdate = {
  platform?: string;
  platformHandle?: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameFields?: CharacterFieldValueCreate[];
};

export type DiscoverCharacter = {
  id: string;
  name: string;
  platform: string;
  imageUrl?: string;
  bio?: string;
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameName?: string;
  gameImageUrl?: string;
  gameFields: CharacterGameField[];
};

export type MatchResponse = {
  characterAId: string;
  characterBId: string;
  isMatch: false;
  matchId: string;
  matchedAt: Date;
};

export type InteractionType = "Like" | "Dislike";

export function getCharacters() {
  return apiGet<Character[]>("/characters");
}

export function getUserGameCharacters(userGameId: string) {
  return apiGet<Character[]>(`/characters/${userGameId}/userGame`);
}

export function createCharacter(data: CharacterCreate) {
  return apiPost<Character>("/characters", data);
}

export type PagedDiscoverResult = {
  items: DiscoverCharacter[];
  hasMore: boolean;
  totalCount: number;
};

export function discoverCharacters(
  gameId: string,
  filters?: Record<string, string>,
  platforms?: string[],
  page = 1,
  pageSize = 20
) {
  const qs = new URLSearchParams({
    gameId,
    page: String(page),
    pageSize: String(pageSize),
    ...filters,
  });
  platforms?.forEach(p => qs.append('platform', p));
  return apiGet<PagedDiscoverResult>(`/characters/discover?${qs.toString()}`);
}

export function updateCharacter(userGameId: string, characterId: string, data: CharacterUpdate) {
  return apiPut<void>(`/characters/${userGameId}/${characterId}`, data);
}

export function deleteCharacter(userGameId: string, characterId: string) {
  return apiDelete<void>(`/characters/${userGameId}/${characterId}`);
}

export function uploadCharacterImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiPostForm<{ url: string }>("/characters/image", form);
}

export function interactWithCharacter(fromCharacterId: string, toCharacterId: string, type: InteractionType) {
  return apiPost<MatchResponse>("/character-interactions", { fromCharacterId, toCharacterId, type });
}

export function getCharacterById(id: string) {
  return apiGet<Character>(`/characters/${id}`);
}

export function getPendingLikes(characterId: string) {
  return apiGet<DiscoverCharacter[]>(`/character-interactions/pending?characterId=${characterId}`);
}

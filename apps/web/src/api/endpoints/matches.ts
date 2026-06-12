import { apiGet } from "../client";
import type { Character, CharacterGameField } from "./characters";
import type { PagedResult } from './userGames';

export type CharacterSummary = {
  id: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  additionalNotes?: string;
  platformHandle: string;
  gameFields: CharacterGameField[];
};

export type CharacterMatchDto = {
  matchId: string;
  matchedAt: string;
  myCharacter: CharacterSummary;
  theirCharacter: Character;
  gameId: string;
  gameName: string;
  gameImageUrl?: string;
  isNew: boolean;
};

export function getMatches(page: number, pageSize: number, gameId?: string): Promise<PagedResult<CharacterMatchDto>> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (gameId) qs.set('gameId', gameId);
  return apiGet<PagedResult<CharacterMatchDto>>(`/character-matches?${qs.toString()}`);
}

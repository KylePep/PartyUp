import { apiGet } from "../client";
import type { Character, CharacterGameField } from "./characters";

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

export function getMatches(gameId?: string): Promise<CharacterMatchDto[]> {
  const query = gameId ? `?gameId=${gameId}` : "";
  return apiGet<CharacterMatchDto[]>(`/character-matches${query}`);
}

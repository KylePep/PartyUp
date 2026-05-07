import { apiGet } from "../client";

export type CharacterSummary = {
  id: string;
  name: string;
  bio?: string;
  playstyle?: string;
  rank?: string;
  region?: string;
};

export type CharacterMatchDto = {
  matchId: string;
  matchedAt: string;
  myCharacter: CharacterSummary;
  theirCharacter: CharacterSummary;
  gameId: string;
  gameName: string;
};

export function getMatches(gameId?: string): Promise<CharacterMatchDto[]> {
  const query = gameId ? `?gameId=${gameId}` : "";
  return apiGet<CharacterMatchDto[]>(`/character-matches${query}`);
}

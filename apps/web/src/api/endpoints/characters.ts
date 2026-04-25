import { apiGet } from "../client";

export type Character = {
  id: string;
  name: string;
};

export function getCharacters() {
  return apiGet<Character[]>("/characters");
}

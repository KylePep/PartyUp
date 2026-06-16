import { apiGet, apiPostEmpty } from "../client";

export type AdminGame = {
  id: string;
  name: string;
  imageUrl: string | null;
  schemaStatus: "Pending" | "Generating" | "Generated" | "Failed";
  fieldDefinitionCount: number;
};

export function getAdminGames(): Promise<AdminGame[]> {
  return apiGet<AdminGame[]>("/admin/games");
}

export function adminRegenerateSchema(gameId: string): Promise<void> {
  return apiPostEmpty(`/admin/games/${gameId}/regenerate-schema`);
}

import { apiGet, apiPost } from "../client";

export type StickerMessageDto = {
  id: string;
  matchId: string;
  senderCharacterId: string;
  emoji: string;
  sentAt: string;
};

export function getByMatch(matchId: string): Promise<StickerMessageDto[]> {
  return apiGet<StickerMessageDto[]>(`/sticker-messages/${matchId}`);
}

export function send(matchId: string, emoji: string): Promise<StickerMessageDto> {
  return apiPost<StickerMessageDto>(`/sticker-messages/${matchId}`, { emoji });
}

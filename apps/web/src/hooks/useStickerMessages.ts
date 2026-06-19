import { useEffect, useRef, useState } from "react";
import {
  getByMatch,
  send as sendApi,
  type StickerMessageDto,
} from "../api/endpoints/stickerMessages";
import { markMatchViewed } from "../api/endpoints/matchNotifications";
import { useStickerContext } from "../context/StickerContext";

export function useStickerMessages(matchId: string) {
  const [messages, setMessages] = useState<StickerMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { incomingStickers } = useStickerContext();
  const processedCountRef = useRef(incomingStickers.length);

  // Load history when matchId changes; reset the processed pointer to current end
  // of incomingStickers so we only pick up stickers that arrive after this mount.
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    processedCountRef.current = incomingStickers.length;
    getByMatch(matchId)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [matchId]);

  // Append any real-time stickers for this match that arrive after mount.
  useEffect(() => {
    const newOnes = incomingStickers
      .slice(processedCountRef.current)
      .filter(s => s.matchId === matchId);
    if (newOnes.length > 0) {
      setMessages(prev => [...prev, ...newOnes]);
      markMatchViewed(matchId);
    }
    processedCountRef.current = incomingStickers.length;
  }, [incomingStickers, matchId]);

  async function send(emoji: string) {
    const dto = await sendApi(matchId, emoji);
    setMessages(prev => [...prev, dto]);
  }

  return { messages, send, loading };
}

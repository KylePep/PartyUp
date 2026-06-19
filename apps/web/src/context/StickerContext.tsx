import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { StickerMessageDto } from "../api/endpoints/stickerMessages";

export type StickerToastPayload = {
  senderCharacterName: string;
  emoji: string;
};

export type StickerNotificationPayload = StickerMessageDto & {
  senderCharacterName: string;
};

type StickerContextValue = {
  incomingStickers: StickerMessageDto[];
  pushSticker: (sticker: StickerMessageDto) => void;
  toastQueue: StickerToastPayload[];
  pushToast: (toast: StickerToastPayload) => void;
  dismissToast: () => void;
};

const StickerContext = createContext<StickerContextValue | null>(null);

export function StickerProvider({ children }: { children: ReactNode }) {
  const [incomingStickers, setIncomingStickers] = useState<StickerMessageDto[]>([]);
  const [toastQueue, setToastQueue] = useState<StickerToastPayload[]>([]);

  const pushSticker = useCallback((sticker: StickerMessageDto) => {
    setIncomingStickers(prev => [...prev, sticker]);
  }, []);

  const pushToast = useCallback((toast: StickerToastPayload) => {
    setToastQueue(prev => [...prev, toast]);
  }, []);

  const dismissToast = useCallback(() => {
    setToastQueue(prev => prev.slice(1));
  }, []);

  return (
    <StickerContext.Provider value={{ incomingStickers, pushSticker, toastQueue, pushToast, dismissToast }}>
      {children}
    </StickerContext.Provider>
  );
}

export function useStickerContext(): StickerContextValue {
  const ctx = useContext(StickerContext);
  if (!ctx) throw new Error("useStickerContext must be used within StickerProvider");
  return ctx;
}

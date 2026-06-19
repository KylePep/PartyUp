import { useEffect, useRef } from "react";
import { useStickerMessages } from "../../hooks/useStickerMessages";
import { StickerPalette } from "./StickerPalette";

interface StickerChatViewProps {
  matchId: string;
  myCharacterId: string;
}

export function StickerChatView({ matchId, myCharacterId }: StickerChatViewProps) {
  const { messages, send, loading } = useStickerMessages(matchId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="text-xs text-muted text-center mt-4 font-mono uppercase tracking-widest">
            Loading...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted text-center mt-4 font-mono uppercase tracking-widest">
            No stickers yet. Say hi!
          </p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col gap-0.5 ${
                msg.senderCharacterId === myCharacterId ? "items-end" : "items-start"
              }`}
            >
              <span className="text-4xl leading-none">{msg.emoji}</span>
              <span className="text-[0.6rem] text-muted font-mono">
                {new Date(msg.sentAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <StickerPalette onSend={send} />
    </div>
  );
}

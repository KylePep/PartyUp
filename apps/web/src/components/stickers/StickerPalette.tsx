import { useState } from "react";

const EMOJI_PALETTE = [
  "🎮", "🕹️", "🎯", "🏆", "⚔️", "🛡️", "💥", "🔥",
  "⭐", "🌟", "👑", "🎉", "🙌", "💪", "👍", "🤘",
  "💯", "😄", "😎", "🥳", "😈", "🤝", "👏", "🫡",
];

interface StickerPaletteProps {
  onSend: (emoji: string) => Promise<void>;
  disabled?: boolean;
}

export function StickerPalette({ onSend, disabled }: StickerPaletteProps) {
  const [sending, setSending] = useState(false);

  async function handleClick(emoji: string) {
    if (sending || disabled) return;
    setSending(true);
    try {
      await onSend(emoji);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-8 gap-1 p-2 border-t-2 border-black/50 bg-orange-950/30 shrink-0">
      {EMOJI_PALETTE.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji)}
          disabled={sending || disabled}
          className="text-xl p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors"
          aria-label={`Send ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

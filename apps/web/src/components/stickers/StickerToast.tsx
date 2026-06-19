import { useEffect } from "react";
import { useStickerContext } from "../../context/StickerContext";

export function StickerToast() {
  const { toastQueue, dismissToast } = useStickerContext();
  const current = toastQueue[0];

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismissToast, 4000);
    return () => clearTimeout(timer);
  }, [current, dismissToast]);

  if (!current) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-lg border border-orange-900/60 shadow-xl"
      style={{ background: "linear-gradient(158deg, #3f1e0b 0%, #2b1508 30%, #1e0e05 55%, #271408 78%, #321b0b 100%)" }}
    >
      <span className="font-mono text-xs text-text">
        <span className="font-bold">{current.senderCharacterName}</span>
        <span className="text-muted"> sent you a sticker:</span>
      </span>
      <span className="text-2xl leading-none">{current.emoji}</span>
      <button
        onClick={dismissToast}
        className="ml-1 text-muted hover:text-text text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

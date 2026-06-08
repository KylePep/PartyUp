import { useNotifications } from "../../context/NotificationContext";
import { FullArtTcgCard } from "../cards/FullArtTcgCard";

export function MatchNotificationToast() {
  const { queue, dismiss } = useNotifications();
  const notification = queue[0];

  if (!notification) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={dismiss}
    >
      <div
        className="flex flex-col items-center gap-4 p-6 rounded-xl max-w-sm w-full mx-4"
        style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)" }}
        onClick={e => e.stopPropagation()}
      >
        <p className="font-display font-bold text-2xl text-text tracking-wide">It's a Match!</p>
        <p className="text-sm text-muted">{notification.gameName}</p>
        <div className="flex gap-3 w-full">
          <div className="flex-1 aspect-3/4">
            <FullArtTcgCard
              name={notification.myCharacter.name}
              imageUrl={notification.myCharacter.imageUrl}
              className="h-full w-full"
            />
          </div>
          <div className="flex-1 aspect-3/4">
            <FullArtTcgCard
              name={notification.theirCharacter.name}
              imageUrl={notification.theirCharacter.imageUrl}
              className="h-full w-full"
            />
          </div>
        </div>
        <button
          className="text-sm text-muted underline mt-1"
          onClick={dismiss}
        >
          Dismiss
        </button>
        {queue.length > 1 && (
          <p className="text-xs text-muted">{queue.length - 1} more match{queue.length > 2 ? "es" : ""} waiting</p>
        )}
      </div>
    </div>
  );
}

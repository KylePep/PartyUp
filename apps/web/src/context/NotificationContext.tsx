import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type MatchNotificationPayload = {
  matchId: string;
  myCharacter: { id: string; name: string; imageUrl?: string };
  theirCharacter: { id: string; name: string; imageUrl?: string };
  gameName: string;
  matchedAt: string;
};

type NotificationContextValue = {
  queue: MatchNotificationPayload[];
  push: (n: MatchNotificationPayload) => void;
  dismiss: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<MatchNotificationPayload[]>([]);

  const push = useCallback((n: MatchNotificationPayload) => {
    setQueue(q => [...q, n]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue(q => q.slice(1));
  }, []);

  return (
    <NotificationContext.Provider value={{ queue, push, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

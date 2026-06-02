import { useEffect, useState } from "react";
import { getMatches, type CharacterMatchDto } from "../api/endpoints/matches";

export function useMatches(gameId?: string) {
  const [data, setData] = useState<CharacterMatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMatches(gameId)
      .then(setData)
      .catch(() => setError("Failed to load matches"))
      .finally(() => setLoading(false));
  }, [gameId]);

  return { data, loading, error };
}

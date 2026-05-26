import { useEffect, useState } from "react";
import { getMatches, type CharacterMatchDto } from "../api/endpoints/matches";

export function useMatches(gameId?: string) {
  const [data, setData] = useState<CharacterMatchDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatches(gameId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [gameId]);

  return { data, loading };
}

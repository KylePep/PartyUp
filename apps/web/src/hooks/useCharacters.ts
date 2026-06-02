import { useEffect, useState } from "react";
import { getCharacters } from "../api/endpoints/characters";
import type { Character } from "../api/endpoints/characters";

export function useCharacters() {
  const [data, setData] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCharacters()
      .then(setData)
      .catch(() => setError("Failed to load characters"))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

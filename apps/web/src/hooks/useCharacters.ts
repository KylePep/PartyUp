import { useEffect, useState } from "react";
import { getCharacters, type Character } from "../api/endpoints/characters";

export function useCharacters() {
  const [data, setData] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCharacters()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

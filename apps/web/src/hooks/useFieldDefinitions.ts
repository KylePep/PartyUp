import { useEffect, useRef, useState } from "react";
import { getFieldDefinitions, type FieldDefinitionsResponse } from "../api/endpoints/games";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export function useFieldDefinitions(gameId: string | null) {
  const [data, setData] = useState<FieldDefinitionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!gameId) return;

    setLoading(true);
    pollCount.current = 0;

    async function fetchOnce() {
      const result = await getFieldDefinitions(gameId!);
      setData(result);

      if (
        result.schemaStatus === "Pending" ||
        result.schemaStatus === "Generating"
      ) {
        if (pollCount.current < MAX_POLLS) {
          pollCount.current++;
          setTimeout(fetchOnce, POLL_INTERVAL_MS);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }

    fetchOnce().catch(() => setLoading(false));

    return () => {
      // signal cleanup — next setTimeout will be a no-op since component unmounted
      pollCount.current = MAX_POLLS;
    };
  }, [gameId]);

  return { data, loading };
}

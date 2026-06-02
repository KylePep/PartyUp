import { useEffect, useRef, useState } from "react";
import { getFieldDefinitions, type FieldDefinitionsResponse } from "../api/endpoints/games";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export function useFieldDefinitions(gameId: string | null) {
  const [data, setData] = useState<FieldDefinitionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollCount = useRef(0);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!gameId) return;

    isMounted.current = true;
    setLoading(true);
    setError(null);
    pollCount.current = 0;

    async function fetchOnce() {
      try {
        const result = await getFieldDefinitions(gameId!);
        if (!isMounted.current) return;
        setData(result);

        if (result.schemaStatus === "Pending" || result.schemaStatus === "Generating") {
          if (pollCount.current < MAX_POLLS) {
            pollCount.current++;
            timeoutId.current = setTimeout(fetchOnce, POLL_INTERVAL_MS);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch {
        if (isMounted.current) {
          setError("Failed to load game schema");
          setLoading(false);
        }
      }
    }

    fetchOnce();

    return () => {
      isMounted.current = false;
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [gameId]);

  return { data, loading, error };
}

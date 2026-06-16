import { useState, useEffect } from "react";
import { getAdminGames, adminRegenerateSchema, type AdminGame } from "../api/endpoints/admin";

const STATUS_STYLES: Record<string, string> = {
  Failed: "text-red-400 bg-red-900/30",
  Generating: "text-yellow-400 bg-yellow-900/30",
  Generated: "text-green-400 bg-green-900/30",
  Pending: "text-gray-400 bg-gray-800/50",
};

export default function AdminPage() {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set());

  useEffect(() => {
    getAdminGames()
      .then(setGames)
      .finally(() => setLoading(false));
  }, []);

  async function handleRegenerate(gameId: string) {
    setRegenerating(prev => new Set(prev).add(gameId));
    try {
      await adminRegenerateSchema(gameId);
      setGames(prev =>
        prev.map(g => g.id === gameId ? { ...g, schemaStatus: "Generating" as const } : g)
      );
    } finally {
      setRegenerating(prev => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });
    }
  }

  if (loading) {
    return <div className="p-8 text-text">Loading…</div>;
  }

  return (
    <div className="p-8 w-full overflow-auto">
      <h1 className="text-xl font-semibold text-text mb-6">Admin — Game Schemas</h1>
      <table className="w-full text-sm text-text border-collapse">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="pb-3 pr-6 font-medium">Game</th>
            <th className="pb-3 pr-6 font-medium">Schema Status</th>
            <th className="pb-3 pr-6 font-medium">Fields</th>
            <th className="pb-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {games.map(game => {
            const isRegenerating = game.schemaStatus === "Generating" || regenerating.has(game.id);
            return (
              <tr key={game.id} className="border-b border-border/50">
                <td className="py-3 pr-6">
                  <div className="flex items-center gap-3">
                    {game.imageUrl && (
                      <img
                        src={game.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover shrink-0"
                      />
                    )}
                    <span>{game.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-6">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[game.schemaStatus] ?? ""}`}>
                    {game.schemaStatus}
                  </span>
                </td>
                <td className="py-3 pr-6 text-muted">{game.fieldDefinitionCount}</td>
                <td className="py-3">
                  {game.schemaStatus !== "Generated" && (
                    <button
                      onClick={() => handleRegenerate(game.id)}
                      disabled={isRegenerating}
                      className="px-3 py-1 text-xs rounded bg-surface-raised text-text hover:bg-accent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isRegenerating ? "Generating…" : "Regenerate"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import type { CharacterSummary } from "../../api/endpoints/matches";

type MatchCardProps = {
  character: CharacterSummary;
  matchedAt: string;
};

export function MatchCard({ character, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="rounded-lg p-6 border border-brand-pink/20"
      style={{ background: "rgba(13,13,30,0.8)", boxShadow: "0 0 30px rgba(255,0,128,0.05)" }}
    >
      <div className="mb-4">
        <div className="font-mono text-[10px] text-brand-pink/60 tracking-widest uppercase mb-1">
          Match
        </div>
        <h3 className="font-display font-black text-2xl text-brand-text uppercase tracking-wide">
          {character.name}
        </h3>
        <div className="font-mono text-[10px] text-brand-muted tracking-widest mt-1">
          {date}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {character.playstyle && (
          <span
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
            style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}
          >
            {character.playstyle}
          </span>
        )}
        {character.rank && (
          <span
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
            style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700" }}
          >
            {character.rank}
          </span>
        )}
        {character.region && (
          <span
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
          >
            {character.region}
          </span>
        )}
      </div>

      {character.bio && (
        <p className="text-brand-muted text-sm leading-relaxed">{character.bio}</p>
      )}
    </div>
  );
}

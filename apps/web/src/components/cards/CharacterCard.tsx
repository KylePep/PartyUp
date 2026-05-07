import { Link } from "react-router-dom";
import type { Character } from "../../api/endpoints/characters";

type CharacterCardProps = {
  gameId: string | undefined;
  character: Character;
};

export function CharacterCard({ gameId, character }: CharacterCardProps) {

  return (
    <div
      className="rounded-lg p-6 border border-brand-neon/20"
      style={{ background: "rgba(13,13,30,0.8)", boxShadow: "0 0 30px rgba(0,229,255,0.05)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] text-brand-neon/60 tracking-widest uppercase mb-1">Active</div>
          <h3 className="font-display font-black text-2xl text-brand-text uppercase tracking-wide">
            {character.name}
          </h3>
        </div>
        <Link
          to={`/realm/${gameId}/create-character`}
          className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 text-brand-muted border border-brand-border hover:border-brand-muted transition-all duration-200"
        >
          Edit
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {character.playstyle && (
          <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}>
            {character.playstyle}
          </span>
        )}
        {character.rank && (
          <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700" }}>
            {character.rank}
          </span>
        )}
        {character.region && (
          <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
            {character.region}
          </span>
        )}
      </div>

      {character.bio && (
        <p className="text-brand-muted text-sm leading-relaxed">{character.bio}</p>
      )}
    </div>
  )
}
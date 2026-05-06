import { useState } from "react";
import type { DiscoverCharacter } from "../../api/endpoints/characters";

interface Props {
  character: DiscoverCharacter;
  onLike: () => void;
  onDislike: () => void;
  isTop: boolean;
}

export function SwipeCard({ character, onLike, onDislike, isTop }: Props) {
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);

  function handleLike() {
    setExiting("right");
    setTimeout(onLike, 380);
  }

  function handleDislike() {
    setExiting("left");
    setTimeout(onDislike, 380);
  }

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "rgba(13,13,30,0.7)",
          border: "1px solid rgba(0,229,255,0.1)",
          transform: "scale(0.95) translateY(16px)",
          zIndex: 0,
        }}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 rounded-2xl overflow-hidden flex flex-col ${
        exiting === "right"
          ? "animate-slide-out-right"
          : exiting === "left"
          ? "animate-slide-out-left"
          : "animate-card-enter"
      }`}
      style={{
        background: "rgba(13,13,30,0.95)",
        border: "1px solid rgba(0,229,255,0.2)",
        boxShadow: "0 0 40px rgba(0,229,255,0.08)",
        zIndex: 1,
      }}
    >
      {/* Top: background art / placeholder */}
      <div
        className="relative flex-none h-56 flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(255,0,128,0.08))" }}
      >
        {character.gameImageUrl ? (
          <img
            src={character.gameImageUrl}
            alt={character.gameName}
            className="w-full h-full object-cover opacity-40"
          />
        ) : (
          <span className="text-7xl text-brand-neon/20" style={{ fontFamily: "monospace" }}>◈</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1e] via-transparent to-transparent" />

        {character.gameName && (
          <div className="absolute top-4 left-4">
            <span
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
              style={{
                background: "rgba(7,7,15,0.8)",
                border: "1px solid rgba(0,229,255,0.3)",
                color: "#00e5ff",
              }}
            >
              {character.gameName}
            </span>
          </div>
        )}
      </div>

      {/* Character info */}
      <div className="flex-1 p-6 flex flex-col">
        <h3 className="font-display font-black text-3xl text-brand-text uppercase tracking-wide mb-3">
          {character.name}
        </h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {character.playstyle && (
            <span
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
              style={{
                background: "rgba(0,229,255,0.1)",
                border: "1px solid rgba(0,229,255,0.25)",
                color: "#00e5ff",
              }}
            >
              {character.playstyle}
            </span>
          )}
          {character.rank && (
            <span
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
              style={{
                background: "rgba(255,215,0,0.1)",
                border: "1px solid rgba(255,215,0,0.25)",
                color: "#ffd700",
              }}
            >
              {character.rank}
            </span>
          )}
          {character.region && (
            <span
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
              style={{
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.25)",
                color: "#a78bfa",
              }}
            >
              {character.region}
            </span>
          )}
        </div>

        {character.bio && (
          <p className="text-brand-muted text-sm leading-relaxed flex-1 line-clamp-3">
            {character.bio}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 p-6 pt-2">
        <button
          onClick={handleDislike}
          className="flex-1 py-4 font-display font-bold text-sm tracking-widest uppercase transition-all duration-200 hover:scale-105 rounded-lg"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
          }}
        >
          ✕ Pass
        </button>
        <button
          onClick={handleLike}
          className="flex-1 py-4 font-display font-bold text-sm tracking-widest uppercase transition-all duration-200 hover:scale-105 rounded-lg"
          style={{
            background: "rgba(0,229,255,0.1)",
            border: "1px solid rgba(0,229,255,0.4)",
            color: "#00e5ff",
            boxShadow: "0 0 20px rgba(0,229,255,0.1)",
          }}
        >
          ♡ Like
        </button>
      </div>
    </div>
  );
}

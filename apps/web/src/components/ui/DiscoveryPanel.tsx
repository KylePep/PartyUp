import { type Character, type DiscoverCharacter } from "../../api/endpoints/characters";
import { SwipeCard } from "../cards/SwipeCard";

type DiscoverStatus = "loading" | "ready" | "empty" | "unavailable";

type Props = {
  myCharacter: Character | null | "loading";
  discoverQueue: DiscoverCharacter[];
  discoverStatus: DiscoverStatus;
  onLike: () => void;
  onDislike: () => void;
};

export function DiscoveryPanel({ myCharacter, discoverQueue, discoverStatus, onLike, onDislike }: Props) {
  return (
    <section>
      <div className="mb-6">
        <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Matchmaking</span>
        <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">
          Discover Players
          {discoverStatus === "ready" && (
            <span className="font-mono text-xs text-brand-muted ml-3 normal-case tracking-normal">
              {discoverQueue.length} remaining
            </span>
          )}
        </h2>
      </div>

      {!myCharacter || myCharacter === "loading" ? (
        <div
          className="rounded-lg border border-brand-border p-10 text-center"
          style={{ background: "rgba(13,13,30,0.4)" }}
        >
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">
            Create a Character First
          </p>
          <p className="text-brand-muted text-sm">
            You need a character in this realm before you can match with others.
          </p>
        </div>
      ) : discoverStatus === "loading" ? (
        <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.6)" }}>
          <p className="font-mono text-brand-muted text-xs tracking-widest uppercase">Scanning the realm...</p>
        </div>
      ) : discoverStatus === "empty" ? (
        <div
          className="rounded-lg border border-brand-border p-10 text-center"
          style={{ background: "rgba(13,13,30,0.4)" }}
        >
          <div className="text-4xl mb-4 text-brand-muted">◈</div>
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">
            All Caught Up
          </p>
          <p className="text-brand-muted text-sm">
            No more characters to discover right now. Check back later.
          </p>
        </div>
      ) : discoverStatus === "unavailable" ? (
        <div
          className="rounded-lg border border-dashed border-brand-pink/30 p-10 text-center"
          style={{ background: "rgba(255,0,128,0.03)" }}
        >
          <div className="text-4xl mb-4" style={{ color: "rgba(255,0,128,0.4)" }}>◈</div>
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">
            Matchmaking Coming Soon
          </p>
          <p className="text-brand-muted text-sm">
            The discover endpoint isn't live yet — hang tight while we build it out.
          </p>
        </div>
      ) : (
        <div className="relative" style={{ height: "520px" }}>
          {discoverQueue.slice(0, 2).map((char, i) => (
            <SwipeCard
              key={char.id}
              character={char}
              onLike={onLike}
              onDislike={onDislike}
              isTop={i === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}

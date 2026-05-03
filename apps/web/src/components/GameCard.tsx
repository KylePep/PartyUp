import type { Game } from "../api/endpoints/games";

type Props = {
  game: Game;
};

export function GameCard({ game }: Props) {
  return (
    <article className="bg-brand-surface border border-brand-border group hover:border-brand-gold/40 transition-colors duration-300 relative overflow-hidden flex flex-col">
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-brand-gold/40 z-10" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-brand-gold/40 z-10" />

      {game.imageUrl && (
        <div className="overflow-hidden">
          <img
            src={game.imageUrl}
            alt={game.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      {/* Bottom gradient overlay on image */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-t from-brand-surface via-transparent to-transparent pointer-events-none" />

      <div className="p-5 flex flex-col gap-2 relative z-10">
        <h3 className="font-display text-brand-text text-sm leading-snug group-hover:text-brand-gold transition-colors duration-200">
          {game.name}
        </h3>
      </div>
    </article>
  );
}

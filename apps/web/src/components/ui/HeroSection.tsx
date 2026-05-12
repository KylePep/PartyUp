const floatingCards = [
  { name: "NightShade", game: "League of Legends", role: "Support", rank: "Diamond" },
  { name: "IronFang", game: "World of Warcraft", role: "Tank", rank: "Mythic" },
  { name: "VoidWalker", game: "Destiny 2", role: "Warlock", rank: "Legend" },
];

type Props = {
  onSignUp: () => void;
  onSignIn: () => void;
};

export function HeroSection({ onSignUp, onSignIn }: Props) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden grid-bg">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(0,229,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,0,128,0.06) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-bg pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col lg:flex-row items-center gap-16 py-32">
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-brand-neon" />
            <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">
              Gaming Matchmaking
            </span>
          </div>

          <h1
            className="font-display font-black leading-none mb-6 uppercase"
            style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}
          >
            <span className="block text-brand-text">Find Your</span>
            <span
              className="block"
              style={{ color: "#00e5ff", textShadow: "0 0 40px rgba(0,229,255,0.5)" }}
            >
              Player
            </span>
            <span
              className="block"
              style={{ color: "#ff0080", textShadow: "0 0 40px rgba(255,0,128,0.4)" }}
            >
              Two.
            </span>
          </h1>

          <p className="text-brand-muted text-lg max-w-md mb-10 leading-relaxed">
            Match with other gamers through the characters you play —
            not just your username. Swipe on character cards, find your squad.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onSignUp}
              className="font-display font-bold tracking-widest uppercase text-sm px-10 py-4 text-brand-bg transition-all duration-200 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #00e5ff, #0088ff)",
                boxShadow: "0 0 30px rgba(0,229,255,0.35)",
              }}
            >
              Create Account
            </button>
            <button
              onClick={onSignIn}
              className="font-display font-bold tracking-widest uppercase text-sm px-10 py-4 text-brand-text border border-brand-border hover:border-brand-muted transition-all duration-200"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center min-h-[420px] w-full max-w-sm">
          {floatingCards.map((card, i) => {
            const offsets = [
              { top: "0%", left: "10%", delay: "0s", rotate: "-6deg" },
              { top: "22%", left: "35%", delay: "1.3s", rotate: "3deg" },
              { top: "44%", left: "5%", delay: "0.7s", rotate: "-3deg" },
            ];
            const o = offsets[i];
            return (
              <div
                key={card.name}
                className="absolute w-52 neon-border rounded-lg p-4 animate-float"
                style={{
                  top: o.top,
                  left: o.left,
                  animationDelay: o.delay,
                  background: "rgba(13,13,30,0.9)",
                  transform: `rotate(${o.rotate})`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="font-mono text-[10px] text-brand-neon/60 tracking-widest uppercase mb-2">
                  {card.game}
                </div>
                <div className="font-display font-bold text-brand-text text-base mb-1">
                  {card.name}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="font-mono text-[9px] px-2 py-0.5 bg-brand-neon/10 text-brand-neon border border-brand-neon/20 rounded">
                    {card.role}
                  </span>
                  <span className="font-mono text-[9px] px-2 py-0.5 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded">
                    {card.rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

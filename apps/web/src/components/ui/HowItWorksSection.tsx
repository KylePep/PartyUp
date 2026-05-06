const steps = [
  {
    icon: "◈",
    label: "Step 01",
    title: "Build Your Character",
    desc: "Select a game you play and craft a character profile — your playstyle, rank, and what kind of teammate you're hunting for.",
  },
  {
    icon: "⊞",
    label: "Step 02",
    title: "Enter the Realm",
    desc: "Each game is a Realm. Step in and see character cards from real players — built around the same game as you.",
  },
  {
    icon: "♡",
    label: "Step 03",
    title: "Match Up",
    desc: "Like a character. If they like you back — that's a match. Two players, one squad.",
  },
];

type Props = {
  onSignUp: () => void;
};

export function HowItWorksSection({ onSignUp }: Props) {
  return (
    <>
      <section className="py-28 px-6 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.05) 0%, transparent 70%)" }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="font-mono text-brand-purple text-xs tracking-[0.4em] uppercase block mb-3">
              How It Works
            </span>
            <h2 className="font-display font-black text-4xl md:text-5xl text-brand-text uppercase">
              The Matchmaking Loop
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div
                key={step.label}
                className="relative p-7 rounded-lg border border-brand-border hover:border-brand-neon/30 transition-all duration-300 group"
                style={{ background: "rgba(13,13,30,0.6)" }}
              >
                <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-5">
                  {step.label}
                </div>
                <div className="text-3xl mb-4 text-brand-neon" style={{ fontFamily: "monospace" }}>
                  {step.icon}
                </div>
                <h3 className="font-display font-bold text-lg text-brand-text mb-3 uppercase tracking-wide">
                  {step.title}
                </h3>
                <p className="text-brand-muted text-sm leading-relaxed">{step.desc}</p>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-neon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-brand-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display font-black text-4xl text-brand-text uppercase mb-4">
            Ready to Play?
          </h2>
          <p className="text-brand-muted mb-10 text-lg">
            Your next teammate is already here. Go find them.
          </p>
          <button
            onClick={onSignUp}
            className="font-display font-bold tracking-widest uppercase text-sm px-12 py-4 text-brand-bg transition-all duration-200 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #ff0080, #7c3aed)",
              boxShadow: "0 0 30px rgba(255,0,128,0.3)",
            }}
          >
            Join PartyUp
          </button>
        </div>
      </section>
    </>
  );
}

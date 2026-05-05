import { useState } from "react";
import { NavBar } from "../components/NavBar";
import { Footer } from "../components/Footer";
import AuthModal from "../components/AuthModal";

type ModalMode = "sign-in" | "sign-up";

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

const floatingCards = [
  { name: "NightShade", game: "League of Legends", role: "Support", rank: "Diamond" },
  { name: "IronFang", game: "World of Warcraft", role: "Tank", rank: "Mythic" },
  { name: "VoidWalker", game: "Destiny 2", role: "Warlock", rank: "Legend" },
];

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text" style={{ fontFamily: "Inter, sans-serif" }}>
      <NavBar
        variant="overlay"
        rightSlot={
          <button
            onClick={() => setModal("sign-in")}
            className="font-mono text-xs tracking-widest uppercase px-5 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200"
          >
            Sign In
          </button>
        }
      />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden grid-bg">
        {/* Background atmosphere */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(0,229,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,0,128,0.06) 0%, transparent 60%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-bg pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col lg:flex-row items-center gap-16 py-32">
          {/* Left: Copy */}
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
                onClick={() => setModal("sign-up")}
                className="font-display font-bold tracking-widest uppercase text-sm px-10 py-4 text-brand-bg transition-all duration-200 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #00e5ff, #0088ff)",
                  boxShadow: "0 0 30px rgba(0,229,255,0.35)",
                }}
              >
                Create Account
              </button>
              <button
                onClick={() => setModal("sign-in")}
                className="font-display font-bold tracking-widest uppercase text-sm px-10 py-4 text-brand-text border border-brand-border hover:border-brand-muted transition-all duration-200"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Right: Floating character cards */}
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

      {/* ── How It Works ── */}
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

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-brand-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display font-black text-4xl text-brand-text uppercase mb-4">
            Ready to Play?
          </h2>
          <p className="text-brand-muted mb-10 text-lg">
            Your next teammate is already here. Go find them.
          </p>
          <button
            onClick={() => setModal("sign-up")}
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

      <Footer />

      {modal && (
        <AuthModal initialMode={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

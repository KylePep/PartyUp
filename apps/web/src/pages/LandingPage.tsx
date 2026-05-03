import { useState } from "react";
import { NavBar } from "../components/NavBar";
import { SectionHeader } from "../components/SectionHeader";
import { Footer } from "../components/Footer";
import { StepCard } from "../components/StepCard";
import AuthModal from "../components/AuthModal";

type ModalMode = "sign-in" | "sign-up";

const steps = [
  {
    numeral: "I",
    title: "Create Your Character",
    desc: "Build a profile for each game in your roster. Describe your play style, your main, and what kind of party you're looking for.",
  },
  {
    numeral: "II",
    title: "Discover Players",
    desc: "Browse character cards from players who share your games. Like the ones whose style matches yours.",
  },
  {
    numeral: "III",
    title: "Form Your Party",
    desc: "A mutual like means a match. Connect with your new companion and head into the realm together.",
  },
];

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-body">
      <NavBar
        variant="overlay"
        rightSlot={
          <button
            onClick={() => setModal("sign-in")}
            className="border border-brand-gold/60 text-brand-gold text-sm px-5 py-2 hover:bg-brand-gold hover:text-brand-bg transition-colors duration-200 font-display tracking-wider"
          >
            Sign In
          </button>
        }
      />

      {/* ── Hero ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% -5%, #2d1b6e 0%, #0c0b13 65%)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-bg pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <p className="font-display text-brand-gold/70 text-xs tracking-[0.5em] uppercase mb-8">
            A New Way to Find Your Party
          </p>

          <h1 className="font-display text-6xl md:text-8xl text-brand-text mb-6 leading-none tracking-wide">
            Forge Your
            <br />
            <span className="text-brand-gold">Fellowship</span>
          </h1>

          <p className="text-brand-muted text-base md:text-lg max-w-lg mb-12 leading-relaxed">
            Build your character for the realms you love —&nbsp;
            <em className="text-brand-text not-italic">
              Tamriel, the New World, the Lands Between
            </em>
            &nbsp;— and find players ready to quest alongside you.
          </p>

          <div className="flex gap-4 flex-wrap justify-center">
            <button
              onClick={() => setModal("sign-up")}
              className="bg-brand-gold text-brand-bg font-display font-semibold tracking-widest text-sm px-10 py-4 hover:bg-brand-gold-light transition-colors duration-200 uppercase"
            >
              Begin Your Journey
            </button>
            <button
              onClick={() => setModal("sign-in")}
              className="border border-brand-border text-brand-text text-sm px-10 py-4 hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 font-display tracking-widest uppercase"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            overline="The Path Forward"
            heading="How It Works"
            subtext="Three steps to finding your next raid partner, dungeon crew, or co-op companion."
            align="center"
            className="mb-16"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <StepCard key={step.numeral} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to Action ── */}
      <section className="py-20 px-6 border-t border-brand-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-3xl text-brand-text mb-4">
            Ready to Begin?
          </h2>
          <p className="text-brand-muted mb-10">
            Your party is out there. It's time to find them.
          </p>
          <button
            onClick={() => setModal("sign-up")}
            className="bg-brand-gold text-brand-bg font-display font-semibold tracking-widest text-sm px-12 py-4 hover:bg-brand-gold-light transition-colors duration-200 uppercase"
          >
            Create Your Account
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

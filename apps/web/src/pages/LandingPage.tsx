import { useState } from "react";
import { NavBar } from "../components/layout/NavBar";
import { Footer } from "../components/layout/Footer";
import AuthModal from "../components/modals/AuthModal";
import { HeroSection } from "../components/ui/HeroSection";
import { HowItWorksSection } from "../components/ui/HowItWorksSection";

type ModalMode = "sign-in" | "sign-up";

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

      <HeroSection onSignUp={() => setModal("sign-up")} onSignIn={() => setModal("sign-in")} />
      <HowItWorksSection onSignUp={() => setModal("sign-up")} />

      <Footer />

      {modal && (
        <AuthModal initialMode={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

import { useNavigate } from "react-router-dom";

interface Props {
  variant?: "overlay" | "solid";
  rightSlot?: React.ReactNode;
}

export function NavBar({ variant = "solid", rightSlot }: Props) {
  const navigate = useNavigate();
  const base = "flex items-center justify-between px-6 md:px-10 z-20";

  const variantClass =
    variant === "overlay"
      ? "absolute top-0 left-0 right-0 py-5"
      : "border-b border-brand-border py-4 shrink-0 bg-brand-bg/80 backdrop-blur-sm sticky top-0";

  return (
    <nav className={`${base} ${variantClass}`}>
      <button onClick={() => navigate('/home')} className="flex items-center gap-2">
        <span
          className="font-display font-black text-xl tracking-widest uppercase"
          style={{ color: "#00e5ff", textShadow: "0 0 20px rgba(0,229,255,0.5)" }}
        >
          Party
        </span>
        <span className="font-display font-black text-xl tracking-widest uppercase text-brand-pink"
          style={{ textShadow: "0 0 20px rgba(255,0,128,0.4)" }}
        >
          Up
        </span>
      </button>

      {rightSlot && (
        <div className="flex items-center gap-4">{rightSlot}</div>
      )}
    </nav>
  );
}

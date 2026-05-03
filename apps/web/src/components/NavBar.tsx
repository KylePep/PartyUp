interface Props {
  /** "overlay" — absolute-positioned over a hero (no border, transparent bg).
   *  "solid"   — static bar with a bottom border. */
  variant?: "overlay" | "solid";
  rightSlot?: React.ReactNode;
}

export function NavBar({ variant = "solid", rightSlot }: Props) {
  const base = "flex items-center justify-between px-8 z-10";

  const variantClass =
    variant === "overlay"
      ? "absolute top-0 left-0 right-0 py-6"
      : "border-b border-brand-border py-5 shrink-0";

  return (
    <nav className={`${base} ${variantClass}`}>
      <span className="font-display text-brand-gold text-lg tracking-[0.25em] uppercase">
        PartyUp
      </span>
      {rightSlot && <div className="flex items-center gap-6">{rightSlot}</div>}
    </nav>
  );
}

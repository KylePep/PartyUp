export function Footer() {
  return (
    <footer className="border-t border-brand-border py-6 px-8 text-center shrink-0">
      <p className="font-display text-brand-muted/60 text-xs tracking-[0.4em] uppercase">
        PartyUp &copy; {new Date().getFullYear()}
      </p>
    </footer>
  );
}

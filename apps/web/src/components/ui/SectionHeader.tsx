interface Props {
  overline: string;
  heading: string;
  as?: "h1" | "h2";
  subtext?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  overline,
  heading,
  as: Tag = "h2",
  subtext,
  align = "left",
  className = "",
}: Props) {
  const centered = align === "center";

  return (
    <div className={`${centered ? "text-center" : ""} ${className}`}>
      <p className="font-display text-brand-gold/60 text-xs tracking-[0.5em] uppercase mb-3">
        {overline}
      </p>
      <Tag className="font-display text-3xl md:text-4xl text-brand-text">{heading}</Tag>

      <div
        className={`flex items-center gap-3 mt-5 ${centered ? "justify-center" : ""}`}
      >
        <div className="h-px w-16 bg-brand-border" />
        <div className="w-1.5 h-1.5 rotate-45 bg-brand-gold/60" />
        <div className="h-px w-16 bg-brand-border" />
      </div>

      {subtext && (
        <p className="text-brand-muted mt-4 max-w-lg mx-auto leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
}

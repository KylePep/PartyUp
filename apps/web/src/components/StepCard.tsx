import { CornerAccents } from "./CornerAccents";

interface Props {
  numeral: string;
  title: string;
  desc: string;
}

export function StepCard({ numeral, title, desc }: Props) {
  return (
    <div className="bg-brand-surface border border-brand-border p-10 text-center relative group hover:border-brand-gold/40 transition-colors duration-300">
      <CornerAccents />

      <div className="w-12 h-12 border border-brand-gold/50 flex items-center justify-center mx-auto mb-6 group-hover:border-brand-gold transition-colors duration-300">
        <span className="font-display text-brand-gold text-base">{numeral}</span>
      </div>

      <h3 className="font-display text-brand-text text-base mb-4 tracking-wide">
        {title}
      </h3>
      <p className="text-brand-muted text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

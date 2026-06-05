interface NewMatchBadgeProps {
  count: number;
}

export function NewMatchBadge({ count }: NewMatchBadgeProps) {
  if (!count || count <= 0) return null;
  const label = count > 9 ? "+" : String(count);
  return (
    <span
      className="absolute top-1 left-1 z-10 flex items-center justify-center rounded-full bg-green-500 text-white font-bold text-xs"
      style={{ minWidth: "1.25rem", height: "1.25rem", padding: "0 3px" }}
    >
      {label}
    </span>
  );
}

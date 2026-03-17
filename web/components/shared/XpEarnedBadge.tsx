interface XpEarnedBadgeProps {
  xp: number;
  label?: string;
}

export default function XpEarnedBadge({
  xp,
  label = "XP Earned!",
}: XpEarnedBadgeProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: "#f0fdf4",
        border: "2px solid #8050C0",
      }}
    >
      <div
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
        style={{ background: "#ede9fe" }}
      >
        ⚡
      </div>
      <div className="min-w-0">
        <p
          className="text-xs font-bold uppercase tracking-widest leading-tight"
          style={{ color: "#8050C0" }}
        >
          {label}
        </p>
        <p
          className="text-2xl font-bold leading-tight"
          style={{ color: "#166534" }}
        >
          +{xp} <span className="text-sm font-semibold">XP</span>
        </p>
      </div>
    </div>
  );
}

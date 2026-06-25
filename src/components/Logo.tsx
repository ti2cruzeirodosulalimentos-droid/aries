export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid place-items-center rounded-full gold-border"
        style={{ width: size, height: size, background: "var(--gradient-dark)" }}
      >
        <span
          className="font-display font-bold gold-text"
          style={{ fontSize: size * 0.5, lineHeight: 1, letterSpacing: "0.05em" }}
        >
          AR
        </span>
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-semibold tracking-[0.18em] gold-text">
          ARIÉS
        </div>
        <div className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
          Transformando metas em resultados
        </div>
      </div>
    </div>
  );
}

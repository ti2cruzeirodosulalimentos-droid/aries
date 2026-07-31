export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-aries.jpg"
        alt="ARIÉS"
        className="rounded-full gold-border object-cover shrink-0"
        style={{ width: size, height: size }}
      />
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

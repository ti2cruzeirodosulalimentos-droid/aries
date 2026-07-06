import { useCallback } from "react";
import type { MuscleGroup } from "@/components/3d";

/**
 * Mapa muscular anatômico em SVG (frente + costas).
 * Substitui o boneco 3D (GLB) — funciona em qualquer dispositivo, é leve,
 * e destaca a região muscular correta quando marcada / no heatmap de evolução.
 *
 * Usa as MESMAS props do Body3D (heatmap / highlight), então pluga direto
 * onde antes ficava o <LazyBody3D />.
 */
interface Props {
  /** Grupos destacados (seleção) — pintados na cor primária (dourado). */
  highlight?: MuscleGroup[];
  /** Evolução por grupo: down = reduziu (verde) · up = aumentou (vermelho) · same = estável (cinza). */
  heatmap?: Partial<Record<MuscleGroup, "up" | "down" | "same">>;
  /** Clique num grupo (opcional). */
  onMuscleClick?: (g: MuscleGroup) => void;
  /** Grupos clicáveis realçam o cursor. */
  className?: string;
}

type State = "base" | "highlight" | "up" | "down" | "same";

const FILL: Record<State, string> = {
  base: "url(#mmMuscle)",
  highlight: "hsl(var(--primary))",
  up: "#ef4444",
  down: "#22c55e",
  same: "#94a3b8",
};

export function BodyMuscleMap({ highlight = [], heatmap, onMuscleClick, className }: Props) {
  const stateOf = useCallback(
    (g: MuscleGroup): State => {
      const h = heatmap?.[g];
      if (h === "down") return "down";
      if (h === "up") return "up";
      if (h === "same") return "same";
      if (highlight.includes(g)) return "highlight";
      return "base";
    },
    [heatmap, highlight],
  );

  // Props visuais por grupo
  const P = (g: MuscleGroup) => {
    const st = stateOf(g);
    const active = st !== "base";
    return {
      fill: FILL[st],
      stroke: active ? "hsl(var(--background))" : "hsl(var(--foreground) / 0.22)",
      strokeWidth: active ? 1.6 : 0.8,
      filter: active ? "url(#mmGlow)" : undefined,
      className: `transition-[fill,filter] duration-300 ${onMuscleClick ? "cursor-pointer" : ""}`,
      onClick: onMuscleClick ? () => onMuscleClick(g) : undefined,
      role: onMuscleClick ? "button" : undefined,
      "aria-label": g,
    } as const;
  };

  return (
    <div className={`mx-auto w-full max-w-[440px] ${className ?? ""}`}>
      <svg viewBox="0 0 400 440" className="h-auto w-full" role="img" aria-label="Mapa muscular anatômico (frente e costas)">
        <defs>
          <linearGradient id="mmSkin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted) / 0.85)" />
            <stop offset="100%" stopColor="hsl(var(--muted) / 0.45)" />
          </linearGradient>
          <linearGradient id="mmMuscle" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#b06a5f" />
            <stop offset="55%" stopColor="#9c574d" />
            <stop offset="100%" stopColor="#7d4139" />
          </linearGradient>
          <filter id="mmGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.4" floodColor="currentColor" floodOpacity="0.55" />
          </filter>
          <filter id="mmSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* sombras de contato */}
        <ellipse cx="100" cy="428" rx="46" ry="5" fill="hsl(var(--foreground) / 0.12)" filter="url(#mmSoft)" />
        <ellipse cx="300" cy="428" rx="46" ry="5" fill="hsl(var(--foreground) / 0.12)" filter="url(#mmSoft)" />

        <Figure cx={100} view="front" P={P} />
        <Figure cx={300} view="back" P={P} />

        {/* rótulos */}
        <text x="100" y="424" textAnchor="middle" className="fill-muted-foreground" fontSize="11" letterSpacing="2">FRENTE</text>
        <text x="300" y="424" textAnchor="middle" className="fill-muted-foreground" fontSize="11" letterSpacing="2">COSTAS</text>
      </svg>
    </div>
  );
}

type PFn = (g: MuscleGroup) => Record<string, unknown>;

/** Desenha uma figura (frente ou costas). cx = centro horizontal. */
function Figure({ cx, view, P }: { cx: number; view: "front" | "back"; P: PFn }) {
  const skin = "url(#mmSkin)";
  const outline = "hsl(var(--foreground) / 0.25)";
  // atalhos p/ espelhar esquerda/direita
  const L = (dx: number) => cx - dx;
  const R = (dx: number) => cx + dx;

  return (
    <g>
      {/* ===== BASE (silhueta pele) ===== */}
      {/* cabeça */}
      <ellipse cx={cx} cy={38} rx={20} ry={24} fill={skin} stroke={outline} strokeWidth={0.9} />
      {/* pescoço */}
      <path d={`M ${cx - 9} 58 L ${cx - 9} 80 L ${cx + 9} 80 L ${cx + 9} 58 Z`} fill={skin} stroke={outline} strokeWidth={0.9} />
      {/* tronco */}
      <path
        d={`M ${L(46)} 88 C ${L(54)} 100 ${L(50)} 140 ${L(36)} 158
            C ${L(32)} 182 ${L(32)} 206 ${L(36)} 226
            C ${L(40)} 244 ${L(22)} 258 ${cx} 258
            C ${R(22)} 258 ${R(40)} 244 ${R(36)} 226
            C ${R(32)} 206 ${R(32)} 182 ${R(36)} 158
            C ${R(50)} 140 ${R(54)} 100 ${R(46)} 88
            C ${R(20)} 79 ${L(20)} 79 ${L(46)} 88 Z`}
        fill={skin}
        stroke={outline}
        strokeWidth={0.9}
      />
      {/* braços (base) */}
      <path d={`M ${L(44)} 92 C ${L(58)} 104 ${L(60)} 150 ${L(56)} 190 C ${L(54)} 218 ${L(52)} 246 ${L(50)} 262 L ${L(38)} 262 C ${L(40)} 224 ${L(40)} 150 ${L(34)} 122 Z`} fill={skin} stroke={outline} strokeWidth={0.9} />
      <path d={`M ${R(44)} 92 C ${R(58)} 104 ${R(60)} 150 ${R(56)} 190 C ${R(54)} 218 ${R(52)} 246 ${R(50)} 262 L ${R(38)} 262 C ${R(40)} 224 ${R(40)} 150 ${R(34)} 122 Z`} fill={skin} stroke={outline} strokeWidth={0.9} />
      {/* pernas (base) */}
      <path d={`M ${L(30)} 250 C ${L(34)} 300 ${L(30)} 350 ${L(26)} 400 L ${L(8)} 408 C ${L(12)} 350 ${L(14)} 300 ${cx - 2} 256 Z`} fill={skin} stroke={outline} strokeWidth={0.9} />
      <path d={`M ${R(30)} 250 C ${R(34)} 300 ${R(30)} 350 ${R(26)} 400 L ${R(8)} 408 C ${R(12)} 350 ${R(14)} 300 ${cx + 2} 256 Z`} fill={skin} stroke={outline} strokeWidth={0.9} />
      {/* pés */}
      <ellipse cx={L(18)} cy={410} rx={11} ry={5} fill={skin} stroke={outline} strokeWidth={0.9} />
      <ellipse cx={R(18)} cy={410} rx={11} ry={5} fill={skin} stroke={outline} strokeWidth={0.9} />

      {/* ===== MÚSCULOS ===== */}
      {view === "front" ? (
        <>
          {/* trapézio (frente) */}
          <path d={`M ${cx - 8} 80 L ${L(36)} 92 L ${L(20)} 100 L ${cx} 96 L ${R(20)} 100 L ${R(36)} 92 L ${cx + 8} 80 Z`} {...P("trapezio")} />
          {/* ombros (deltoides) */}
          <ellipse cx={L(40)} cy={100} rx={13} ry={12} {...P("ombros")} />
          <ellipse cx={R(40)} cy={100} rx={13} ry={12} {...P("ombros")} />
          {/* peito (peitorais) */}
          <path d={`M ${cx - 2} 104 C ${L(26)} 104 ${L(30)} 130 ${L(20)} 138 C ${L(10)} 142 ${cx - 2} 138 ${cx - 2} 124 Z`} {...P("peito")} />
          <path d={`M ${cx + 2} 104 C ${R(26)} 104 ${R(30)} 130 ${R(20)} 138 C ${R(10)} 142 ${cx + 2} 138 ${cx + 2} 124 Z`} {...P("peito")} />
          {/* bíceps */}
          <ellipse cx={L(46)} cy={148} rx={9} ry={20} {...P("biceps")} />
          <ellipse cx={R(46)} cy={148} rx={9} ry={20} {...P("biceps")} />
          {/* antebraço */}
          <ellipse cx={L(50)} cy={210} rx={8} ry={22} {...P("antebraco")} />
          <ellipse cx={R(50)} cy={210} rx={8} ry={22} {...P("antebraco")} />
          {/* abdômen */}
          <path d={`M ${cx - 16} 146 L ${cx + 16} 146 C ${cx + 18} 190 ${cx + 12} 226 ${cx} 236 C ${cx - 12} 226 ${cx - 18} 190 ${cx - 16} 146 Z`} {...P("abdomen")} />
          {/* quadríceps */}
          <path d={`M ${cx - 4} 258 C ${L(28)} 262 ${L(26)} 320 ${L(20)} 356 C ${L(14)} 360 ${cx - 4} 356 ${cx - 3} 300 Z`} {...P("quadriceps")} />
          <path d={`M ${cx + 4} 258 C ${R(28)} 262 ${R(26)} 320 ${R(20)} 356 C ${R(14)} 360 ${cx + 4} 356 ${cx + 3} 300 Z`} {...P("quadriceps")} />
          {/* panturrilha (frente/tíbia) */}
          <ellipse cx={L(21)} cy={386} rx={8} ry={17} {...P("panturrilha")} />
          <ellipse cx={R(21)} cy={386} rx={8} ry={17} {...P("panturrilha")} />
        </>
      ) : (
        <>
          {/* trapézio (costas) */}
          <path d={`M ${cx} 82 L ${L(38)} 94 L ${L(14)} 132 L ${cx} 150 L ${R(14)} 132 L ${R(38)} 94 Z`} {...P("trapezio")} />
          {/* ombros (deltoides posteriores) */}
          <ellipse cx={L(40)} cy={102} rx={13} ry={12} {...P("ombros")} />
          <ellipse cx={R(40)} cy={102} rx={13} ry={12} {...P("ombros")} />
          {/* costas (dorsais/latíssimo) */}
          <path d={`M ${cx - 3} 132 C ${L(30)} 138 ${L(30)} 190 ${L(16)} 226 C ${cx - 6} 218 ${cx - 3} 170 ${cx - 3} 150 Z`} {...P("costas")} />
          <path d={`M ${cx + 3} 132 C ${R(30)} 138 ${R(30)} 190 ${R(16)} 226 C ${cx + 6} 218 ${cx + 3} 170 ${cx + 3} 150 Z`} {...P("costas")} />
          {/* tríceps */}
          <ellipse cx={L(46)} cy={150} rx={9} ry={20} {...P("triceps")} />
          <ellipse cx={R(46)} cy={150} rx={9} ry={20} {...P("triceps")} />
          {/* antebraço */}
          <ellipse cx={L(50)} cy={212} rx={8} ry={22} {...P("antebraco")} />
          <ellipse cx={R(50)} cy={212} rx={8} ry={22} {...P("antebraco")} />
          {/* lombar */}
          <path d={`M ${cx - 14} 214 L ${cx + 14} 214 C ${cx + 12} 234 ${cx + 6} 246 ${cx} 250 C ${cx - 6} 246 ${cx - 12} 234 ${cx - 14} 214 Z`} {...P("lombar")} />
          {/* glúteos */}
          <ellipse cx={L(16)} cy={266} rx={16} ry={16} {...P("gluteo")} />
          <ellipse cx={R(16)} cy={266} rx={16} ry={16} {...P("gluteo")} />
          {/* posterior (isquiotibiais) */}
          <path d={`M ${cx - 4} 282 C ${L(28)} 288 ${L(26)} 330 ${L(20)} 356 C ${L(14)} 360 ${cx - 4} 356 ${cx - 3} 310 Z`} {...P("posterior")} />
          <path d={`M ${cx + 4} 282 C ${R(28)} 288 ${R(26)} 330 ${R(20)} 356 C ${R(14)} 360 ${cx + 4} 356 ${cx + 3} 310 Z`} {...P("posterior")} />
          {/* panturrilha (gastrocnêmio) */}
          <ellipse cx={L(21)} cy={386} rx={9} ry={18} {...P("panturrilha")} />
          <ellipse cx={R(21)} cy={386} rx={9} ry={18} {...P("panturrilha")} />
        </>
      )}
    </g>
  );
}

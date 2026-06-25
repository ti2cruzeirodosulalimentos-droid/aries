import { useMemo } from "react";

export type PosturalView = "anterior" | "lateral" | "posterior";

type Spot = { x: number; y: number; side?: "L" | "R" };

/**
 * Coordenadas em viewBox 200x480 — alinhadas anatomicamente às silhuetas
 * desenhadas abaixo. Cada item postural pode ter 1 ou 2 marcadores
 * (bilateral) para refletir a região avaliada de forma realista.
 */
const HOTSPOTS: Record<PosturalView, Record<string, Spot[]>> = {
  anterior: {
    "Inclinação de cabeça": [{ x: 100, y: 38 }],
    "Ombros assimétricos": [
      { x: 62, y: 96, side: "L" },
      { x: 138, y: 96, side: "R" },
    ],
    "Báscula pélvica": [
      { x: 78, y: 252, side: "L" },
      { x: 122, y: 252, side: "R" },
    ],
    "Joelhos valgos": [
      { x: 86, y: 332, side: "L" },
      { x: 114, y: 332, side: "R" },
    ],
    "Joelhos varos": [
      { x: 80, y: 332, side: "L" },
      { x: 120, y: 332, side: "R" },
    ],
    "Pés pronados": [
      { x: 84, y: 458, side: "L" },
      { x: 116, y: 458, side: "R" },
    ],
    "Pés supinados": [
      { x: 84, y: 458, side: "L" },
      { x: 116, y: 458, side: "R" },
    ],
  },
  lateral: {
    "Retificação Cervical": [{ x: 112, y: 70 }],
    "Hiperlordose Cervical": [{ x: 112, y: 78 }],
    "Rotação Interna dos Ombros": [{ x: 96, y: 110 }],
    "Hipercifose Torácica": [{ x: 118, y: 150 }],
    "Protusão Abdominal": [{ x: 90, y: 220 }],
    "Hiperlordose Lombar": [{ x: 122, y: 220 }],
    "Retificação Lombar": [{ x: 118, y: 232 }],
    "Anteversão de Quadril": [{ x: 108, y: 260 }],
    "Retroversão de Quadril": [{ x: 116, y: 270 }],
    "Genu - Flexo": [{ x: 100, y: 332 }],
    "Genu - Recurvado": [{ x: 108, y: 332 }],
    "Pé - Plano": [{ x: 110, y: 460 }],
    "Pé - Cavo": [{ x: 110, y: 458 }],
    "Pé - Calcâneo": [{ x: 94, y: 462 }],
    "Pé - Equino": [{ x: 126, y: 460 }],
  },
  posterior: {
    "Ombros assimétricos (post.)": [
      { x: 62, y: 96, side: "L" },
      { x: 138, y: 96, side: "R" },
    ],
    "Escápulas aladas": [
      { x: 76, y: 130, side: "L" },
      { x: 124, y: 130, side: "R" },
    ],
    "Escápulas assimétricas": [
      { x: 78, y: 145, side: "L" },
      { x: 122, y: 145, side: "R" },
    ],
    "Escoliose": [
      { x: 100, y: 130 },
      { x: 100, y: 180 },
      { x: 100, y: 230 },
    ],
    "Triângulo de Talles desigual": [
      { x: 82, y: 220, side: "L" },
      { x: 118, y: 220, side: "R" },
    ],
    "Calcâneo valgo": [
      { x: 86, y: 460, side: "L" },
      { x: 114, y: 460, side: "R" },
    ],
    "Calcâneo varo": [
      { x: 86, y: 460, side: "L" },
      { x: 114, y: 460, side: "R" },
    ],
  },
};

interface Props {
  view: PosturalView;
  selected: string[];
  items: string[];
  onToggle: (item: string) => void;
}

/** Silhueta anatômica em SVG — proporções aproximadas ao corpo humano */
function Silhouette({ view }: { view: PosturalView }) {
  // Cor da silhueta: tom de pele neutro com sombreamento suave
  const skin = "url(#skinGrad)";
  const stroke = "hsl(var(--foreground) / 0.18)";

  if (view === "lateral") {
    return (
      <g>
        {/* Perfil lateral (virado para a direita) */}
        <path
          d="
            M 110 28
            C 132 28, 140 50, 138 72
            C 137 84, 130 92, 122 96
            L 122 108
            C 130 110, 138 116, 142 128
            L 148 168
            C 148 190, 144 208, 138 228
            L 132 252
            C 128 268, 128 282, 132 296
            L 132 340
            C 130 360, 126 380, 122 400
            L 120 430
            C 118 446, 116 458, 116 466
            L 138 466
            L 138 472
            L 96 472
            L 96 466
            L 106 458
            L 104 430
            L 100 400
            C 96 380, 94 360, 96 340
            L 96 296
            C 100 282, 100 268, 96 252
            L 90 228
            C 84 208, 80 190, 80 168
            L 86 128
            C 90 116, 98 110, 106 108
            L 106 96
            C 98 92, 91 84, 90 72
            C 88 50, 90 28, 110 28 Z
          "
          fill={skin}
          stroke={stroke}
          strokeWidth="1.2"
        />
        {/* Linha da coluna referência */}
        <path
          d="M 115 70 C 118 110, 110 150, 118 200 C 124 240, 118 270, 120 300"
          fill="none"
          stroke="hsl(var(--primary) / 0.35)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </g>
    );
  }

  // Frente / Costas — mesma silhueta (vista frontal)
  return (
    <g>
      {/* Cabeça */}
      <ellipse cx="100" cy="42" rx="28" ry="32" fill={skin} stroke={stroke} strokeWidth="1.2" />
      {/* Pescoço */}
      <path d="M 88 70 L 88 86 L 112 86 L 112 70 Z" fill={skin} stroke={stroke} strokeWidth="1.2" />
      {/* Tronco + braços + pernas em um único path para sombra coesa */}
      <path
        d="
          M 60 92
          C 50 96, 44 110, 44 124
          L 44 184
          C 44 200, 48 210, 56 214
          L 60 180
          L 64 130
          C 68 120, 76 112, 88 110
          L 112 110
          C 124 112, 132 120, 136 130
          L 140 180
          L 144 214
          C 152 210, 156 200, 156 184
          L 156 124
          C 156 110, 150 96, 140 92
          L 130 88
          L 70 88 Z
        "
        fill={skin}
        stroke={stroke}
        strokeWidth="1.2"
      />
      {/* Tronco inferior / abdômen */}
      <path
        d="
          M 64 130
          L 62 200
          C 60 220, 60 240, 64 254
          L 72 270
          L 128 270
          L 136 254
          C 140 240, 140 220, 138 200
          L 136 130 Z
        "
        fill={skin}
        stroke={stroke}
        strokeWidth="1.2"
      />
      {/* Pernas */}
      <path
        d="
          M 72 268
          L 70 340
          C 70 360, 74 400, 80 440
          L 82 462
          L 100 462
          L 102 440
          C 104 400, 104 360, 102 340
          L 100 268 Z
        "
        fill={skin}
        stroke={stroke}
        strokeWidth="1.2"
      />
      <path
        d="
          M 100 268
          L 98 340
          C 96 360, 96 400, 98 440
          L 100 462
          L 118 462
          L 120 440
          C 126 400, 130 360, 130 340
          L 128 268 Z
        "
        fill={skin}
        stroke={stroke}
        strokeWidth="1.2"
      />
      {/* Pés */}
      <ellipse cx="91" cy="468" rx="13" ry="6" fill={skin} stroke={stroke} strokeWidth="1.2" />
      <ellipse cx="109" cy="468" rx="13" ry="6" fill={skin} stroke={stroke} strokeWidth="1.2" />
      {/* Antebraços (estendendo os braços laterais) */}
      <path
        d="M 48 214 L 42 270 L 50 274 L 58 218 Z"
        fill={skin}
        stroke={stroke}
        strokeWidth="1.2"
      />
      <path
        d="M 152 214 L 158 270 L 150 274 L 142 218 Z"
        fill={skin}
        stroke={stroke}
        strokeWidth="1.2"
      />
      {/* Linha central de referência postural */}
      <line
        x1="100"
        y1="20"
        x2="100"
        y2="472"
        stroke="hsl(var(--primary) / 0.25)"
        strokeWidth="0.6"
        strokeDasharray="2 4"
      />
    </g>
  );
}

export function PosturalBody({ view, selected, items, onToggle }: Props) {
  const visibleItems = useMemo(
    () => items.filter((i) => HOTSPOTS[view][i]),
    [view, items],
  );

  const activeItems = visibleItems.filter((i) => selected.includes(i));

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <svg
        viewBox="0 0 200 500"
        className="w-full h-auto"
        role="img"
        aria-label={`Silhueta vista ${view}`}
      >
        <defs>
          <linearGradient id="skinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted) / 0.9)" />
            <stop offset="60%" stopColor="hsl(var(--muted) / 0.6)" />
            <stop offset="100%" stopColor="hsl(var(--muted) / 0.4)" />
          </linearGradient>
          <radialGradient id="dotActive" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Sombra de contato */}
        <ellipse cx="100" cy="480" rx="48" ry="4" fill="hsl(var(--foreground) / 0.12)" filter="url(#softShadow)" />

        <Silhouette view={view} />

        {/* Marcadores */}
        {visibleItems.map((item) => {
          const isActive = selected.includes(item);
          const spots = HOTSPOTS[view][item];
          return (
            <g key={item}>
              {spots.map((s, idx) => (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => onToggle(item)}
                  role="button"
                  aria-label={item}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <>
                      <circle cx={s.x} cy={s.y} r="11" fill="url(#dotActive)">
                        <animate
                          attributeName="r"
                          values="9;14;9"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.7;0.15;0.7"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r="4.2"
                        fill="hsl(var(--primary))"
                        stroke="hsl(var(--background))"
                        strokeWidth="1.4"
                      />
                    </>
                  )}
                  {!isActive && (
                    <>
                      {/* alvo discreto, mas visível, clicável */}
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r="6"
                        fill="hsl(var(--background) / 0.7)"
                        stroke="hsl(var(--muted-foreground) / 0.5)"
                        strokeWidth="0.9"
                        strokeDasharray="2 2"
                      />
                      <circle cx={s.x} cy={s.y} r="1.6" fill="hsl(var(--muted-foreground))" />
                    </>
                  )}
                  <title>{item}</title>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legenda dos achados ativos */}
      {activeItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
          {activeItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition"
            >
              {item} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

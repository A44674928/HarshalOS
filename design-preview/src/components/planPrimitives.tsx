import type { ReactNode } from "react";
import type { LayerId } from "../data/properties";

export const OX = 86;
export const OY = 58;
export const SIDE = 466.69;

export const X = (east: number) => OX + east;
export const Y = (north: number) => OY + (SIDE - north);

export const VIEW = `0 0 ${OX + SIDE + 86} ${OY + SIDE + 72}`;

export type MeasurePoint = { east: number; north: number };

export type PlanHandlers = {
  layers: Set<LayerId>;
  selected: string | null;
  hovered: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  measureMode?: boolean;
  measurePts?: MeasurePoint[];
  onMeasureClick?: (pt: MeasurePoint) => void;
};

export function on(layers: Set<LayerId>, id: LayerId) {
  return layers.has(id);
}

export function CadDefs() {
  return (
    <defs>
      <pattern id="sheetGrid" width="50" height="50" patternUnits="userSpaceOnUse" x={OX} y={OY}>
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a2a22" strokeWidth="0.6" />
      </pattern>
      <pattern id="sheetGridFine" width="10" height="10" patternUnits="userSpaceOnUse" x={OX} y={OY}>
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#121c18" strokeWidth="0.35" />
      </pattern>
      <pattern id="hatchWhite" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 6 L6 0" stroke="#8b95a8" strokeWidth="0.4" />
      </pattern>
      <pattern id="hatchCyan" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 6 L6 0" stroke="#3ec6d8" strokeWidth="0.45" />
      </pattern>
      <pattern id="hatchGold" width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M0 5 L5 0" stroke="#e8c547" strokeWidth="0.4" />
      </pattern>
      <pattern id="hatchOrchard" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="7" r="1.6" fill="none" stroke="#3dcc6a" strokeWidth="0.6" />
      </pattern>
      <pattern id="hatchPasture" width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M0 16 L16 0" stroke="#7a4dff" strokeWidth="0.35" opacity="0.5" />
      </pattern>
      <pattern id="hatchLeach" width="10" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 3 H10" stroke="#e8943a" strokeWidth="0.7" strokeDasharray="3 2" />
      </pattern>
      <filter id="glowGold" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glowBlue" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.4" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <marker id="arrowRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#e4453a" />
      </marker>
      <marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#3dcc6a" />
      </marker>
      <marker id="arrowDim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#3dcc6a" />
      </marker>
    </defs>
  );
}

export function Tree({ x, y, r = 7.5 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="rgba(61,204,106,0.05)" stroke="#3dcc6a" strokeWidth="1.05" />
      <circle cx={x} cy={y} r={r * 0.32} fill="none" stroke="#3dcc6a" strokeWidth="0.7" />
      <line x1={x - r} y1={y} x2={x + r} y2={y} stroke="#3dcc6a" strokeWidth="0.55" />
      <line x1={x} y1={y - r} x2={x} y2={y + r} stroke="#3dcc6a" strokeWidth="0.55" />
    </g>
  );
}

export function OrchardTree({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill="rgba(61,204,106,0.07)" stroke="#3dcc6a" strokeWidth="0.9" />
      <circle cx={x} cy={y} r={2} fill="none" stroke="#3dcc6a" strokeWidth="0.6" />
    </g>
  );
}

export function Geodesic({
  x,
  y,
  r,
  id,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  x: number;
  y: number;
  r: number;
  id: string;
  selected?: boolean;
  hovered?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const active = selected || hovered;
  return (
    <g
      className="hot"
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(id);
      }}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
      filter={active ? "url(#glowGold)" : undefined}
    >
      <circle cx={x} cy={y} r={r} fill="rgba(232,197,71,0.07)" stroke="#e8c547" strokeWidth={active ? 2 : 1.35} />
      <circle cx={x} cy={y} r={r * 0.38} fill="none" stroke="#e8c547" strokeWidth="0.85" />
      <line x1={x - r} y1={y} x2={x + r} y2={y} stroke="#e8c547" strokeWidth="0.7" />
      <line x1={x} y1={y - r} x2={x} y2={y + r} stroke="#e8c547" strokeWidth="0.7" />
      <line x1={x - r * 0.7} y1={y - r * 0.7} x2={x + r * 0.7} y2={y + r * 0.7} stroke="#e8c547" strokeWidth="0.45" />
      <line x1={x + r * 0.7} y1={y - r * 0.7} x2={x - r * 0.7} y2={y + r * 0.7} stroke="#e8c547" strokeWidth="0.45" />
    </g>
  );
}

export function Pin({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <rect x={x - 3.2} y={y - 3.2} width="6.4" height="6.4" fill="#07090e" stroke="#e4453a" strokeWidth="1.2" transform={`rotate(45 ${x} ${y})`} />
      <text x={x + 8} y={y - 8} fill="#e4453a" fontSize="7.2" letterSpacing="0.4">
        {label}
      </text>
    </g>
  );
}

export function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <text x="0" y="-52" fill="#e4453a" fontSize="8" fontWeight="600" textAnchor="middle" letterSpacing="1.4">
        TRUE NORTH
      </text>
      <line x1="0" y1="-44" x2="0" y2="18" stroke="#e4453a" strokeWidth="1.4" />
      <polygon points="0,-48 -5.5,-28 0,-32 5.5,-28" fill="#e4453a" />
      <polygon points="0,22 -4,10 0,13 4,10" fill="#8b95a8" />
      <text x="8" y="-30" fill="#e4453a" fontSize="9" fontWeight="600">
        N
      </text>
    </g>
  );
}

export function ScaleBar({ x, y }: { x: number; y: number }) {
  const segs = [0, 40, 80, 120, 160];
  return (
    <g transform={`translate(${x}, ${y})`}>
      <text x="0" y="-8" fill="#8b95a8" fontSize="7" letterSpacing="0.8">
        GRAPHIC SCALE — FEET
      </text>
      {segs.slice(0, -1).map((s, i) => (
        <rect
          key={s}
          x={s}
          y={0}
          width={40}
          height={8}
          fill={i % 2 === 0 ? "#e8edf5" : "#07090e"}
          stroke="#e8edf5"
          strokeWidth="0.7"
        />
      ))}
      {segs.map((s) => (
        <text key={s} x={s} y={20} fill="#8b95a8" fontSize="6.5" textAnchor="middle">
          {s}
        </text>
      ))}
      <text x="168" y="20" fill="#8b95a8" fontSize="6.5">
        160'
      </text>
    </g>
  );
}

export function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  offset = 0,
  vertical = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  offset?: number;
  vertical?: boolean;
}) {
  const ax = vertical ? x1 + offset : x1;
  const ay = vertical ? y1 : y1 + offset;
  const bx = vertical ? x2 + offset : x2;
  const by = vertical ? y2 : y2 + offset;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  return (
    <g>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#3dcc6a" strokeWidth="0.8" markerStart="url(#arrowDim)" markerEnd="url(#arrowDim)" />
      <line x1={x1} y1={y1} x2={ax} y2={ay} stroke="#3dcc6a" strokeWidth="0.5" />
      <line x1={x2} y1={y2} x2={bx} y2={by} stroke="#3dcc6a" strokeWidth="0.5" />
      <rect
        x={vertical ? mx - 18 : mx - 22}
        y={vertical ? my - 6 : my - 7}
        width={vertical ? 16 : 44}
        height="12"
        fill="#07090e"
      />
      <text
        x={mx}
        y={my + 3}
        fill="#3dcc6a"
        fontSize="7.4"
        textAnchor="middle"
        transform={vertical ? `rotate(-90 ${mx} ${my})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

export function HotRect({
  id,
  x,
  y,
  w,
  h,
  stroke,
  fill,
  hatch,
  selected,
  hovered,
  onSelect,
  onHover,
  label,
  sub,
  labelColor,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill?: string;
  hatch?: string;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  label?: string;
  sub?: string;
  labelColor?: string;
}) {
  const active = selected || hovered;
  return (
    <g
      className="hot"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={hatch ? `url(#${hatch})` : fill || "rgba(232,237,245,0.03)"}
        stroke={stroke}
        strokeWidth={active ? 2.2 : 1.25}
        style={{ outline: active ? `1px solid ${stroke}` : undefined }}
      />
      {active && (
        <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.7" />
      )}
      {label && (
        <text
          x={x + w / 2}
          y={x && h > 22 ? y + h / 2 - (sub ? 3 : 0) : y + h / 2}
          fill={labelColor || stroke}
          fontSize={Math.min(8.2, w / 9)}
          textAnchor="middle"
          fontWeight="500"
        >
          {label}
        </text>
      )}
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 9} fill={labelColor || stroke} fontSize="6.4" textAnchor="middle" opacity="0.85">
          {sub}
        </text>
      )}
    </g>
  );
}

export function Frame({
  layers,
  children,
  setbackColor = "#3dcc6a",
  extraTrees,
}: {
  layers: Set<LayerId>;
  children: ReactNode;
  setbackColor?: string;
  extraTrees?: React.ReactNode;
}) {
  const west = X(0);
  const north = Y(SIDE);
  const east = X(SIDE);
  const south = Y(0);
  const s = 50;

  const northTrees = Array.from({ length: 9 }, (_, i) => ({ e: 28 + i * 52, n: SIDE - 18 }));
  const southTrees = Array.from({ length: 9 }, (_, i) => ({ e: 28 + i * 52, n: 18 }));
  const westTrees = Array.from({ length: 7 }, (_, i) => ({ e: 18, n: 70 + i * 52 }));
  const eastTrees = Array.from({ length: 7 }, (_, i) => ({ e: SIDE - 18, n: 70 + i * 52 }));

  return (
    <>
      {on(layers, "grid") && (
        <>
          <rect x={west} y={north} width={SIDE} height={SIDE} fill="url(#sheetGridFine)" />
          <rect x={west} y={north} width={SIDE} height={SIDE} fill="url(#sheetGrid)" />
        </>
      )}

      {on(layers, "setback") && (
        <rect
          x={X(s)}
          y={Y(SIDE - s)}
          width={SIDE - s * 2}
          height={SIDE - s * 2}
          fill="none"
          stroke={setbackColor}
          strokeWidth="1.15"
          strokeDasharray="7 4"
        />
      )}

      {on(layers, "boundary") && (
        <rect x={west} y={north} width={SIDE} height={SIDE} fill="none" stroke="#e4453a" strokeWidth="2.2" />
      )}

      {on(layers, "trees") && (
        <g>
          {northTrees.map((t, i) => (
            <Tree key={`n${i}`} x={X(t.e)} y={Y(t.n)} />
          ))}
          {southTrees.map((t, i) => (
            <Tree key={`s${i}`} x={X(t.e)} y={Y(t.n)} />
          ))}
          {westTrees.map((t, i) => (
            <Tree key={`w${i}`} x={X(t.e)} y={Y(t.n)} />
          ))}
          {eastTrees.map((t, i) => (
            <Tree key={`e${i}`} x={X(t.e)} y={Y(t.n)} />
          ))}
          {extraTrees}
        </g>
      )}

      {children}

      {on(layers, "dims") && (
        <g>
          <DimLine x1={west} y1={north} x2={east} y2={north} label="466.69'" offset={-22} />
          <DimLine x1={west} y1={south} x2={east} y2={south} label="466.69'" offset={22} />
          <DimLine x1={west} y1={north} x2={west} y2={south} label="466.69'" offset={-28} vertical />
          <DimLine x1={east} y1={north} x2={east} y2={south} label="466.69'" offset={22} vertical />
          <Pin x={west} y={north} label="NW PIN (0.00, 466.69)" />
          <Pin x={east} y={north} label="NE PIN (466.69, 466.69)" />
          <Pin x={west} y={south} label="SW PIN (0.00, 0.00)" />
          <Pin x={east} y={south} label="SE PIN (466.69, 0.00)" />
          <text x={(west + east) / 2} y={north - 36} fill="#3dcc6a" fontSize="8" textAnchor="middle" letterSpacing="1.2">
            466.69'  (5.0000 ACRES)
          </text>
        </g>
      )}

      {on(layers, "labels") && on(layers, "setback") && (
        <g>
          <text x={(west + east) / 2} y={Y(SIDE - 26)} fill={setbackColor} fontSize="7.4" textAnchor="middle" letterSpacing="0.8">
            50'-0" FRONT / REAR SETBACK ENVELOPE
          </text>
          <text
            x={X(26)}
            y={(north + south) / 2}
            fill={setbackColor}
            fontSize="7.4"
            textAnchor="middle"
            letterSpacing="0.6"
            transform={`rotate(-90 ${X(26)} ${(north + south) / 2})`}
          >
            50'-0" SIDE SETBACK (AR-5 DESIGN)
          </text>
        </g>
      )}

      <NorthArrow x={east + 48} y={north + 70} />
      {(on(layers, "topo") || on(layers, "redlines")) && <WindRose x={east + 48} y={north + 165} />}
      <ScaleBar x={west} y={south + 48} />
    </>
  );
}

export function WindRose({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="22" fill="rgba(62,198,216,0.05)" stroke="#3ec6d8" strokeWidth="0.8" strokeDasharray="3 2" />
      <circle cx="0" cy="0" r="11" fill="none" stroke="#3ec6d8" strokeWidth="0.5" opacity="0.6" />
      <line x1="-16" y1="16" x2="14" y2="-14" stroke="#3ec6d8" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
      <text x="0" y="-27" fill="#3ec6d8" fontSize="6.2" textAnchor="middle" letterSpacing="0.7">
        PREVAILING WIND
      </text>
      <text x="0" y="32" fill="#3ec6d8" fontSize="6" textAnchor="middle">
        SW 225° · 11 MPH AVG
      </text>
    </g>
  );
}

export function FireCistern({
  x,
  y,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  x: number;
  y: number;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const active = selected || hovered;
  return (
    <g
      className="hot"
      onClick={(e) => {
        e.stopPropagation();
        onSelect("rev-cistern");
      }}
      onMouseEnter={() => onHover("rev-cistern")}
      onMouseLeave={() => onHover(null)}
    >
      <rect
        x={x - 16}
        y={y - 9}
        width="32"
        height="18"
        rx="4"
        fill="rgba(255,90,82,0.14)"
        stroke="#ff5a52"
        strokeWidth={active ? 2 : 1.25}
      />
      <circle cx={x - 10} cy={y} r="3" fill="#ff5a52" />
      <circle cx={x + 8} cy={y} r="3.5" fill="none" stroke="#ff5a52" strokeWidth="1" />
      <text x={x} y={y - 13} fill="#ff5a52" fontSize="6" textAnchor="middle" fontWeight="600">
        10,000G FIRE CISTERN + NST DRY HYDRANT
      </text>
    </g>
  );
}

export function RevCloud({
  id,
  tag,
  x,
  y,
  w,
  h,
  label,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  id: string;
  tag: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const active = selected || hovered;
  return (
    <g
      className="hot"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="8"
        fill={active ? "rgba(255,77,109,0.14)" : "rgba(255,77,109,0.06)"}
        stroke="#ff4d6d"
        strokeWidth={active ? 2 : 1.35}
        strokeDasharray="6 3"
      />
      {/* Revision Delta Triangle */}
      <polygon
        points={`${x + 10},${y - 12} ${x + 2},${y} ${x + 18},${y}`}
        fill="#ff4d6d"
        stroke="#07090e"
        strokeWidth="0.8"
      />
      <text x={x + 10} y={y - 2} fill="#07090e" fontSize="5.4" fontWeight="700" textAnchor="middle">
        A
      </text>
      <rect x={x + 21} y={y - 11} width={Math.max(66, label.length * 4.1 + 12)} height="11" rx="2" fill="#ff4d6d" />
      <text x={x + 25} y={y - 3.5} fill="#07090e" fontSize="6" fontWeight="700">
        {tag}: {label}
      </text>
    </g>
  );
}

export function MeasureOverlay({ pts }: { pts?: MeasurePoint[] }) {
  if (!pts || pts.length === 0) return null;
  const p1 = pts[0];
  const p2 = pts[1];

  let distFt = 0;
  let bearingDeg = 0;
  if (p1 && p2) {
    const de = p2.east - p1.east;
    const dn = p2.north - p1.north;
    distFt = Math.hypot(de, dn);
    bearingDeg = ((Math.atan2(de, dn) * 180) / Math.PI + 360) % 360;
  }

  return (
    <g pointerEvents="none">
      {p1 && (
        <g>
          <circle cx={X(p1.east)} cy={Y(p1.north)} r="4.5" fill="#c9a24a" stroke="#07090e" strokeWidth="1.2" />
          <text x={X(p1.east) + 7} y={Y(p1.north) - 6} fill="#c9a24a" fontSize="6.5" fontWeight="600">
            PT A ({p1.east.toFixed(1)}', {p1.north.toFixed(1)}')
          </text>
        </g>
      )}
      {p1 && p2 && (
        <g>
          <line
            x1={X(p1.east)}
            y1={Y(p1.north)}
            x2={X(p2.east)}
            y2={Y(p2.north)}
            stroke="#c9a24a"
            strokeWidth="1.8"
            strokeDasharray="4 2"
          />
          <circle cx={X(p2.east)} cy={Y(p2.north)} r="4.5" fill="#c9a24a" stroke="#07090e" strokeWidth="1.2" />
          <rect
            x={(X(p1.east) + X(p2.east)) / 2 - 58}
            y={(Y(p1.north) + Y(p2.north)) / 2 - 11}
            width="116"
            height="16"
            rx="3"
            fill="#07090e"
            stroke="#c9a24a"
            strokeWidth="1.1"
          />
          <text
            x={(X(p1.east) + X(p2.east)) / 2}
            y={(Y(p1.north) + Y(p2.north)) / 2}
            fill="#c9a24a"
            fontSize="7"
            fontWeight="600"
            textAnchor="middle"
          >
            {distFt.toFixed(1)} FT  ·  BRG {bearingDeg.toFixed(1)}°
          </text>
        </g>
      )}
    </g>
  );
}

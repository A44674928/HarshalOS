import type { MouseEvent } from "react";
import {
  CadDefs,
  FireCistern,
  Frame,
  HotRect,
  MeasureOverlay,
  OX,
  OY,
  PlanHandlers,
  RevCloud,
  Tree,
  X,
  Y,
  VIEW,
  SIDE,
  on,
} from "./planPrimitives";

const YURTS: { id: string; e: number; n: number }[] = [
  { id: "Y1", e: 198, n: 210 },
  { id: "Y2", e: 178, n: 188 },
  { id: "Y3", e: 172, n: 162 },
  { id: "Y4", e: 188, n: 140 },
  { id: "Y5", e: 214, n: 128 },
  { id: "Y6", e: 242, n: 132 },
  { id: "Y7", e: 264, n: 150 },
  { id: "Y8", e: 270, n: 176 },
];

export default function HearthPlan({
  layers,
  selected,
  hovered,
  onSelect,
  onHover,
  measureMode,
  measurePts,
  onMeasureClick,
}: PlanHandlers) {
  const is = (id: string) => selected === id || hovered === id;

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    if (measureMode && onMeasureClick) {
      const svg = e.currentTarget;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const loc = pt.matrixTransform(ctm.inverse());
        const east = Math.max(0, Math.min(SIDE, loc.x - OX));
        const north = Math.max(0, Math.min(SIDE, SIDE - (loc.y - OY)));
        onMeasureClick({ east, north });
        return;
      }
    }
    onSelect(null);
  };

  const eastWindbreak = Array.from({ length: 12 }, (_, i) => ({ e: SIDE - 22, n: 48 + i * 34 }));
  const northWindbreak = Array.from({ length: 11 }, (_, i) => ({ e: 42 + i * 38, n: SIDE - 20 }));

  return (
    <svg
      viewBox={VIEW}
      className={`plan-svg h-full w-full ${measureMode ? "cursor-crosshair" : ""}`}
      onClick={handleSvgClick}
    >
      <CadDefs />
      <rect width="100%" height="100%" fill="#07090e" />

      <Frame
        layers={layers}
        setbackColor="#e8c547"
        extraTrees={
          on(layers, "trees") ? (
            <g>
              {eastWindbreak.map((t, i) => (
                <Tree key={`ew${i}`} x={X(t.e)} y={Y(t.n)} r={8} />
              ))}
              {northWindbreak.map((t, i) => (
                <Tree key={`nw${i}`} x={X(t.e)} y={Y(t.n)} r={8} />
              ))}
            </g>
          ) : null
        }
      >
        {/* TOPOGRAPHY & DRAINAGE SWALES */}
        {on(layers, "topo") && (
          <g>
            {[
              { d: `M ${X(0)} ${Y(428)} Q ${X(230)} ${Y(418)} ${X(SIDE)} ${Y(435)}`, el: "6966'" },
              { d: `M ${X(0)} ${Y(340)} Q ${X(220)} ${Y(328)} ${X(SIDE)} ${Y(348)}`, el: "6964'" },
              { d: `M ${X(0)} ${Y(250)} Q ${X(210)} ${Y(236)} ${X(SIDE)} ${Y(260)}`, el: "6962'" },
              { d: `M ${X(0)} ${Y(160)} Q ${X(200)} ${Y(144)} ${X(SIDE)} ${Y(172)}`, el: "6960'" },
              { d: `M ${X(0)} ${Y(78)} Q ${X(195)} ${Y(66)} ${X(SIDE)} ${Y(88)}`, el: "6958'" },
            ].map((c) => (
              <g key={c.el} opacity="0.45">
                <path d={c.d} fill="none" stroke="#3ec6d8" strokeWidth="0.65" strokeDasharray="10 4" />
                <text x={X(16)} y={Number(c.d.split(" ")[2]) - 3} fill="#3ec6d8" fontSize="5.6">
                  {c.el}
                </text>
              </g>
            ))}
            {/* Drainage swale feeding Retention Basin */}
            <path
              d={`M ${X(352)} ${Y(300)} Q ${X(240)} ${Y(260)} ${X(166)} ${Y(192)}`}
              fill="none"
              stroke="#3ec6d8"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              markerEnd="url(#arrowGreen)"
            />
            {on(layers, "labels") && (
              <text x={X(258)} y={Y(274)} fill="#3ec6d8" fontSize="5.8" textAnchor="middle">
                BIOSWALE TO RETENTION BASIN (1.8% SLOPE)
              </text>
            )}
          </g>
        )}

        {/* SOUTH GATE + DRIVE */}
        {on(layers, "access") && (
          <g>
            <rect x={X(226)} y={Y(0)} width="16" height="52" fill="#1a2130" stroke="#8b95a8" strokeWidth="1" />
            <rect x={X(218)} y={Y(8)} width="8" height="10" fill="#07090e" stroke="#e8edf5" strokeWidth="1.1" />
            <rect x={X(242)} y={Y(8)} width="8" height="10" fill="#07090e" stroke="#e8edf5" strokeWidth="1.1" />
            {on(layers, "labels") && (
              <text x={X(234)} y={Y(-14)} fill="#8b95a8" fontSize="6.4" textAnchor="middle" letterSpacing="0.5">
                DUAL STONE PILLAR ENTRY GATE
              </text>
            )}
            <circle cx={X(234)} cy={Y(108)} r="44" fill="#161d28" stroke="#8b95a8" strokeWidth="1.2" />
            <circle cx={X(234)} cy={Y(108)} r="16" fill="#0d121a" stroke="#6b7380" strokeWidth="0.8" />
            {on(layers, "labels") && (
              <text x={X(234)} y={Y(106)} fill="#8b95a8" fontSize="6.2" textAnchor="middle">
                ARRIVAL COURT
              </text>
            )}
            <path d={`M ${X(234)} ${Y(52)} L ${X(234)} ${Y(64)}`} stroke="#6b7380" strokeWidth="10" />
            <path d={`M ${X(248)} ${Y(130)} C ${X(280)} ${Y(170)}, ${X(300)} ${Y(230)}, ${X(308)} ${Y(268)}`} fill="none" stroke="#6b7380" strokeWidth="8" />
            <path d={`M ${X(210)} ${Y(140)} C ${X(160)} ${Y(210)}, ${X(140)} ${Y(280)}, ${X(130)} ${Y(318)}`} fill="none" stroke="#6b7380" strokeWidth="7" />
          </g>
        )}

        {/* WELL */}
        {on(layers, "water") && (
          <g
            className="hot"
            filter={is("well") ? "url(#glowBlue)" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect("well");
            }}
            onMouseEnter={() => onHover("well")}
            onMouseLeave={() => onHover(null)}
          >
            <circle
              cx={X(392)}
              cy={Y(400)}
              r="100"
              fill="rgba(77,141,255,0.05)"
              stroke="#4d8dff"
              strokeWidth="1.15"
              strokeDasharray="6 4"
            />
            <circle cx={X(392)} cy={Y(400)} r="5" fill="#4d8dff" />
            <circle cx={X(392)} cy={Y(400)} r="9" fill="none" stroke="#4d8dff" strokeWidth="1.2" />
            {on(layers, "labels") && (
              <>
                <text x={X(392)} y={Y(418)} fill="#4d8dff" fontSize="6.5" textAnchor="middle">
                  400' DEEP WELL
                </text>
                <text x={X(392)} y={Y(312)} fill="#4d8dff" fontSize="6.1" textAnchor="middle">
                  100' SANITARY BUFFER
                </text>
              </>
            )}
          </g>
        )}

        {/* PASTURE */}
        {on(layers, "ag") && (
          <g
            className="hot"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("pasture");
            }}
            onMouseEnter={() => onHover("pasture")}
            onMouseLeave={() => onHover(null)}
          >
            <rect
              x={X(78)}
              y={Y(248)}
              width="214"
              height="168"
              fill="rgba(61,204,106,0.035)"
              stroke="#3dcc6a"
              strokeWidth={is("pasture") ? 2 : 1.15}
              strokeDasharray="8 4"
            />
            {on(layers, "labels") && (
              <text x={X(185)} y={Y(88)} fill="#3dcc6a" fontSize="6.8" textAnchor="middle" letterSpacing="0.4">
                2.8-ACRE PASTURE & CORRAL  ·  8 YURT PITCHER PADS
              </text>
            )}
            <rect x={X(92)} y={Y(108)} width="36" height="18" fill="rgba(61,204,106,0.08)" stroke="#3dcc6a" strokeWidth="1" />
            {on(layers, "labels") && (
              <text x={X(110)} y={Y(97)} fill="#3dcc6a" fontSize="5.6" textAnchor="middle">
                LOADING SHED
              </text>
            )}
          </g>
        )}

        {/* RETENTION */}
        {on(layers, "water") && (
          <g
            className="hot"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("retention");
            }}
            onMouseEnter={() => onHover("retention")}
            onMouseLeave={() => onHover(null)}
          >
            <circle cx={X(138)} cy={Y(168)} r="36" fill="rgba(77,141,255,0.07)" stroke="#4d8dff" strokeWidth={is("retention") ? 2 : 1.3} />
            <circle cx={X(138)} cy={Y(168)} r="22" fill="none" stroke="#4d8dff" strokeWidth="0.6" strokeDasharray="3 2" />
            {on(layers, "labels") && (
              <text x={X(138)} y={Y(166)} fill="#4d8dff" fontSize="6.4" textAnchor="middle">
                RETENTION
              </text>
            )}
            {on(layers, "labels") && (
              <text x={X(138)} y={Y(157)} fill="#4d8dff" fontSize="6.4" textAnchor="middle">
                BASIN
              </text>
            )}
          </g>
        )}

        {/* SEPTIC + 100% ADEQ RESERVE + PHASE 2 CUP STUB */}
        {on(layers, "septic") && (
          <g
            className="hot"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("rev-septic");
            }}
            onMouseEnter={() => onHover("rev-septic")}
            onMouseLeave={() => onHover(null)}
          >
            <rect x={X(292)} y={Y(78)} width="18" height="10" fill="none" stroke="#e8943a" strokeWidth="1.1" strokeDasharray="3 2" />
            {[0, 1, 2].map((i) => (
              <line
                key={i}
                x1={X(314)}
                y1={Y(72 - i * 6)}
                x2={X(372)}
                y2={Y(72 - i * 6)}
                stroke="#e8943a"
                strokeWidth="0.9"
                strokeDasharray="4 2"
              />
            ))}
            <rect
              x={X(314)}
              y={Y(54)}
              width="58"
              height="16"
              fill="rgba(232,148,58,0.08)"
              stroke="#e8943a"
              strokeWidth={is("rev-septic") ? 1.8 : 1}
              strokeDasharray="3 2"
            />
            {on(layers, "labels") && (
              <>
                <text x={X(343)} y={Y(82)} fill="#e8943a" fontSize="5.8" textAnchor="middle">
                  PHASE 1 BY-RIGHT 1,500G SEPTIC
                </text>
                <text x={X(343)} y={Y(31)} fill="#e8943a" fontSize="5.6" textAnchor="middle">
                  100% RESERVE + PHASE 2 CUP 3,000G STUB
                </text>
              </>
            )}
          </g>
        )}

        {/* BUILDINGS */}
        {on(layers, "buildings") && (
          <g>
            {/* Barn with 4 stalls */}
            <HotRect
              id="barn"
              x={X(92)}
              y={Y(368)}
              w={78}
              h={52}
              stroke="#3ec6d8"
              hatch="hatchCyan"
              selected={selected === "barn"}
              hovered={hovered === "barn"}
              onSelect={onSelect}
              onHover={onHover}
              label="EQUESTRIAN BARN"
              sub="3,000 SF  ·  4 STALLS"
              labelColor="#3ec6d8"
            />
            {[1, 2, 3].map((i) => (
              <line key={i} x1={X(92 + i * 19.5)} y1={Y(342)} x2={X(92 + i * 19.5)} y2={Y(316)} stroke="#3ec6d8" strokeWidth="0.7" />
            ))}
            <line x1={X(92)} y1={Y(342)} x2={X(170)} y2={Y(342)} stroke="#3ec6d8" strokeWidth="0.7" />

            {/* Farmhouse + deck + porch */}
            <g
              className="hot"
              onClick={(e) => {
                e.stopPropagation();
                onSelect("farmhouse");
              }}
              onMouseEnter={() => onHover("farmhouse")}
              onMouseLeave={() => onHover(null)}
            >
              <rect
                x={X(268)}
                y={Y(364)}
                width="86"
                height="50"
                fill="rgba(232,237,245,0.05)"
                stroke="#e8edf5"
                strokeWidth={is("farmhouse") ? 2.2 : 1.35}
              />
              <rect x={X(278)} y={Y(376)} width="48" height="12" fill="none" stroke="#e8edf5" strokeWidth="0.9" />
              <rect x={X(288)} y={Y(314)} width="50" height="12" fill="none" stroke="#e8edf5" strokeWidth="0.9" />
              {on(layers, "labels") && (
                <>
                  <text x={X(311)} y={Y(337)} fill="#e8edf5" fontSize="7.4" textAnchor="middle" fontWeight="500">
                    PRINCIPAL FARMHOUSE
                  </text>
                  <text x={X(311)} y={Y(327)} fill="#8b95a8" fontSize="6.4" textAnchor="middle">
                    4,000 SF GFA
                  </text>
                  <text x={X(302)} y={Y(370)} fill="#8b95a8" fontSize="5.6" textAnchor="middle">
                    STARGAZING DECK  12' × 48'
                  </text>
                  <text x={X(313)} y={Y(306)} fill="#8b95a8" fontSize="5.6" textAnchor="middle">
                    COVERED PORCH
                  </text>
                </>
              )}
            </g>

            <HotRect
              id="guest"
              x={X(298)}
              y={Y(278)}
              w={32}
              h={26}
              stroke="#e8edf5"
              fill="rgba(232,237,245,0.04)"
              selected={selected === "guest"}
              hovered={hovered === "guest"}
              onSelect={onSelect}
              onHover={onHover}
              label="ADU"
              sub="750 SF"
            />

            <HotRect
              id="bathhouse"
              x={X(198)}
              y={Y(228)}
              w={28}
              h={22}
              stroke="#3ec6d8"
              fill="rgba(62,198,216,0.07)"
              selected={selected === "bathhouse"}
              hovered={hovered === "bathhouse"}
              onSelect={onSelect}
              onHover={onHover}
              label="BATH"
              sub="480 SF"
              labelColor="#3ec6d8"
            />
          </g>
        )}

        {/* FIRE PLAZA + YURTS (CUP) */}
        {on(layers, "conditional") && (
          <g>
            <g
              className="hot"
              onClick={(e) => {
                e.stopPropagation();
                onSelect("plaza");
              }}
              onMouseEnter={() => onHover("plaza")}
              onMouseLeave={() => onHover(null)}
            >
              <circle
                cx={X(228)}
                cy={Y(178)}
                r="18"
                fill="rgba(232,148,58,0.08)"
                stroke="#e8943a"
                strokeWidth={is("plaza") ? 2.2 : 1.4}
              />
              <circle cx={X(228)} cy={Y(178)} r="6" fill="none" stroke="#e8943a" strokeWidth="1" />
              {on(layers, "labels") && (
                <>
                  <text x={X(228)} y={Y(180)} fill="#e8943a" fontSize="5.8" textAnchor="middle">
                    FIRE PIT
                  </text>
                  <text x={X(228)} y={Y(202)} fill="#e8943a" fontSize="5.8" textAnchor="middle">
                    GATHERING PLAZA
                  </text>
                </>
              )}
            </g>

            {YURTS.map((y) => (
              <g
                key={y.id}
                className="hot"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect("yurts");
                }}
                onMouseEnter={() => onHover("yurts")}
                onMouseLeave={() => onHover(null)}
              >
                <circle
                  cx={X(y.e)}
                  cy={Y(y.n)}
                  r="13"
                  fill="rgba(196,92,255,0.07)"
                  stroke="#c45cff"
                  strokeWidth={is("yurts") ? 1.8 : 1.15}
                  strokeDasharray="4 2"
                />
                <circle cx={X(y.e)} cy={Y(y.n)} r="4.5" fill="none" stroke="#c45cff" strokeWidth="0.7" />
                <text x={X(y.e)} y={Y(y.n) + 2.2} fill="#c45cff" fontSize="6" textAnchor="middle">
                  {y.id}
                </text>
              </g>
            ))}
          </g>
        )}

        {/* FIRE / WUI DEFENSIBLE SPACE & SNOW STORAGE */}
        {on(layers, "fire") && (
          <g>
            <FireCistern
              x={X(188)}
              y={Y(66)}
              selected={selected === "rev-cistern"}
              hovered={hovered === "rev-cistern"}
              onSelect={onSelect}
              onHover={onHover}
            />
            {/* 30' & 100' WUI Defensible Space around Principal Farmhouse */}
            <ellipse
              cx={X(311)}
              cy={Y(339)}
              rx="64"
              ry="44"
              fill="none"
              stroke="#ff5a52"
              strokeWidth="0.9"
              strokeDasharray="4 3"
            />
            <ellipse
              cx={X(311)}
              cy={Y(339)}
              rx="102"
              ry="74"
              fill="none"
              stroke="#ff5a52"
              strokeWidth="0.65"
              strokeDasharray="8 5"
              opacity="0.7"
            />
            <rect
              x={X(264)}
              y={Y(108)}
              width="32"
              height="16"
              fill="rgba(62,198,216,0.12)"
              stroke="#3ec6d8"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            {on(layers, "labels") && (
              <>
                <text x={X(311)} y={Y(390)} fill="#ff5a52" fontSize="5.8" textAnchor="middle">
                  30' / 100' WUI DEFENSIBLE SPACE ENVELOPE
                </text>
                <text x={X(280)} y={Y(115)} fill="#3ec6d8" fontSize="5.4" textAnchor="middle">
                  SNOW PUSH POCKET
                </text>
              </>
            )}
          </g>
        )}

        {/* PE REVIEW REDLINES (REV A) */}
        {on(layers, "redlines") && (
          <g>
            <RevCloud
              id="rev-septic"
              tag="REV-A1"
              x={X(286)}
              y={Y(86)}
              w={96}
              h={56}
              label="100% RESERVE + CUP SEPTIC"
              selected={selected === "rev-septic"}
              hovered={hovered === "rev-septic"}
              onSelect={onSelect}
              onHover={onHover}
            />
            <RevCloud
              id="rev-cistern"
              tag="REV-A2"
              x={X(162)}
              y={Y(82)}
              w={76}
              h={34}
              label="10kG FIRE CISTERN + NST"
              selected={selected === "rev-cistern"}
              hovered={hovered === "rev-cistern"}
              onSelect={onSelect}
              onHover={onHover}
            />
            <RevCloud
              id="bathhouse"
              tag="REV-A4"
              x={X(190)}
              y={Y(236)}
              w={82}
              h={38}
              label="2-STAGE CUP WASTEWATER"
              selected={selected === "bathhouse"}
              hovered={hovered === "bathhouse"}
              onSelect={onSelect}
              onHover={onHover}
            />
            <RevCloud
              id="rev-swale"
              tag="REV-A5"
              x={X(195)}
              y={Y(282)}
              w={125}
              h={28}
              label="BIOSWALE TO RETENTION"
              selected={selected === "rev-swale"}
              hovered={hovered === "rev-swale"}
              onSelect={onSelect}
              onHover={onHover}
            />
            <RevCloud
              id="rev-snow"
              tag="REV-A6"
              x={X(258)}
              y={Y(116)}
              w={72}
              h={28}
              label="SNOW PLOW POCKET"
              selected={selected === "rev-snow"}
              hovered={hovered === "rev-snow"}
              onSelect={onSelect}
              onHover={onHover}
            />
          </g>
        )}

        {/* ENERGY */}
        {on(layers, "energy") && (
          <g
            className="hot"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("solar");
            }}
            onMouseEnter={() => onHover("solar")}
            onMouseLeave={() => onHover(null)}
          >
            {Array.from({ length: 4 }, (_, r) =>
              Array.from({ length: 4 }, (_, c) => (
                <rect
                  key={`${r}${c}`}
                  x={X(318 + c * 14)}
                  y={Y(118 - r * 10)}
                  width="12"
                  height="8"
                  fill="url(#hatchGold)"
                  stroke="#e8c547"
                  strokeWidth="0.7"
                />
              )),
            )}
            <rect x={X(378)} y={Y(86)} width="14" height="10" fill="none" stroke="#e8943a" strokeWidth="1" />
            {on(layers, "labels") && (
              <text x={X(346)} y={Y(128)} fill="#e8c547" fontSize="6.2" textAnchor="middle">
                20 kW SOLAR PV ARRAY
              </text>
            )}
            {on(layers, "labels") && (
              <text x={X(385)} y={Y(72)} fill="#e8943a" fontSize="5.6" textAnchor="middle">
                80 kWh BESS
              </text>
            )}
          </g>
        )}

        {on(layers, "labels") && (
          <g>
            <text x={X(234)} y={Y(SIDE - 8)} fill="#e8c547" fontSize="7" textAnchor="middle" letterSpacing="0.6">
              50'-0" REAR SETBACK (NORTH)
            </text>
            <text x={X(234)} y={Y(8)} fill="#e8c547" fontSize="7" textAnchor="middle" letterSpacing="0.6">
              50'-0" FRONT SETBACK (SOUTH ENTRY)
            </text>
          </g>
        )}

        <MeasureOverlay pts={measurePts} />
      </Frame>
    </svg>
  );
}

import type { MouseEvent } from "react";
import {
  CadDefs,
  FireCistern,
  Frame,
  Geodesic,
  HotRect,
  MeasureOverlay,
  OrchardTree,
  OX,
  OY,
  PlanHandlers,
  RevCloud,
  X,
  Y,
  VIEW,
  SIDE,
  on,
} from "./planPrimitives";

export default function EngineRoomPlan({
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

  const orchard: { e: number; n: number }[] = [];
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 8; r++) {
      orchard.push({ e: 382 + c * 18, n: 198 + r * 22 });
    }
  }

  return (
    <svg
      viewBox={VIEW}
      className={`plan-svg h-full w-full ${measureMode ? "cursor-crosshair" : ""}`}
      onClick={handleSvgClick}
    >
      <CadDefs />
      <rect width="100%" height="100%" fill="#07090e" />

      <Frame layers={layers} setbackColor="#3dcc6a">
        {/* TOPOGRAPHY & DRAINAGE SWALES */}
        {on(layers, "topo") && (
          <g>
            {[
              { d: `M ${X(0)} ${Y(420)} Q ${X(220)} ${Y(438)} ${X(SIDE)} ${Y(452)}`, el: "7286'" },
              { d: `M ${X(0)} ${Y(330)} Q ${X(230)} ${Y(350)} ${X(SIDE)} ${Y(380)}`, el: "7284'" },
              { d: `M ${X(0)} ${Y(240)} Q ${X(240)} ${Y(265)} ${X(SIDE)} ${Y(300)}`, el: "7282'" },
              { d: `M ${X(0)} ${Y(145)} Q ${X(245)} ${Y(172)} ${X(SIDE)} ${Y(210)}`, el: "7280'" },
              { d: `M ${X(0)} ${Y(65)} Q ${X(255)} ${Y(88)} ${X(SIDE)} ${Y(120)}`, el: "7278'" },
            ].map((c) => (
              <g key={c.el} opacity="0.45">
                <path d={c.d} fill="none" stroke="#3ec6d8" strokeWidth="0.65" strokeDasharray="10 4" />
                <text x={X(16)} y={Number(c.d.split(" ")[2]) - 3} fill="#3ec6d8" fontSize="5.6">
                  {c.el}
                </text>
              </g>
            ))}
            {/* Up-gradient interceptor swale & southern basalt rip-rap bioswale */}
            <path
              d={`M ${X(155)} ${Y(224)} Q ${X(265)} ${Y(232)} ${X(352)} ${Y(205)}`}
              fill="none"
              stroke="#3ec6d8"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              markerEnd="url(#arrowGreen)"
            />
            <path
              d={`M ${X(95)} ${Y(64)} L ${X(370)} ${Y(58)}`}
              fill="none"
              stroke="#3ec6d8"
              strokeWidth="2.2"
              strokeDasharray="6 3"
              markerEnd="url(#arrowGreen)"
            />
            {on(layers, "labels") && (
              <>
                <text x={X(268)} y={Y(227)} fill="#3ec6d8" fontSize="5.8" textAnchor="middle">
                  UP-SLOPE INTERCEPTOR SWALE (2% GRADE)
                </text>
                <text x={X(235)} y={Y(47)} fill="#3ec6d8" fontSize="6" textAnchor="middle">
                  BASALT RIP-RAP INFILTRATION BIOSWALE
                </text>
              </>
            )}
          </g>
        )}

        {/* ACCESS ROAD + GATE */}
        {on(layers, "access") && (
          <g>
            <rect x={X(218)} y={Y(SIDE) - 18} width="32" height="18" fill="#141c28" stroke="#8b95a8" strokeWidth="1" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={i} x1={X(220 + i * 5)} y1={Y(SIDE) - 16} x2={X(220 + i * 5)} y2={Y(SIDE) - 2} stroke="#8b95a8" strokeWidth="0.8" />
            ))}
            <text x={X(234)} y={Y(SIDE) - 22} fill="#8b95a8" fontSize="6.6" textAnchor="middle" letterSpacing="0.6">
              N. PEAKS VISTA WAY · CATTLE GUARD
            </text>
            <path
              d={`M ${X(228)} ${Y(SIDE - 18)} C ${X(232)} ${Y(400)}, ${X(240)} ${Y(370)}, ${X(255)} ${Y(348)}`}
              fill="none"
              stroke="#6b7380"
              strokeWidth="11"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d={`M ${X(240)} ${Y(SIDE - 18)} C ${X(244)} ${Y(400)}, ${X(250)} ${Y(370)}, ${X(255)} ${Y(348)}`}
              fill="none"
              stroke="#2a3340"
              strokeWidth="7"
            />
            <circle cx={X(255)} cy={Y(330)} r="46" fill="#161d28" stroke="#8b95a8" strokeWidth="1.3" />
            <circle cx={X(255)} cy={Y(330)} r="18" fill="#0d121a" stroke="#8b95a8" strokeWidth="0.9" />
            <circle cx={X(255)} cy={Y(330)} r="5" fill="none" stroke="#e8c547" strokeWidth="1" />
            {on(layers, "labels") && (
              <text x={X(255)} y={Y(330) + 2} fill="#8b95a8" fontSize="6.2" textAnchor="middle">
                TV ROTUNDA
              </text>
            )}
            <path d={`M ${X(255)} ${Y(312)} L ${X(255)} ${Y(230)}`} fill="none" stroke="#6b7380" strokeWidth="9" />
            <path d={`M ${X(255)} ${Y(312)} L ${X(255)} ${Y(230)}`} fill="none" stroke="#2a3340" strokeWidth="5.5" />
            <path d={`M ${X(270)} ${Y(318)} C ${X(310)} ${Y(300)}, ${X(330)} ${Y(250)}, ${X(292)} ${Y(185)}`} fill="none" stroke="#6b7380" strokeWidth="8" />
            <path d={`M ${X(238)} ${Y(310)} C ${X(200)} ${Y(280)}, ${X(195)} ${Y(250)}, ${X(200)} ${Y(230)}`} fill="none" stroke="#6b7380" strokeWidth="7" />
          </g>
        )}

        {/* WELL + BUFFER */}
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
              cx={X(108)}
              cy={Y(378)}
              r="100"
              fill="rgba(77,141,255,0.05)"
              stroke="#4d8dff"
              strokeWidth="1.15"
              strokeDasharray="6 4"
            />
            <rect x={X(103)} y={Y(383)} width="10" height="10" fill="#07090e" stroke="#4d8dff" strokeWidth="1.4" />
            <circle cx={X(108)} cy={Y(378)} r="3.2" fill="#4d8dff" />
            {on(layers, "labels") && (
              <>
                <text x={X(108)} y={Y(396)} fill="#4d8dff" fontSize="6.6" textAnchor="middle">
                  500' DEEP WELL
                </text>
                <text x={X(108)} y={Y(288)} fill="#4d8dff" fontSize="6.2" textAnchor="middle">
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
              x={X(92)}
              y={Y(232)}
              width="148"
              height="150"
              fill="url(#hatchPasture)"
              stroke="#b56bff"
              strokeWidth={is("pasture") ? 2 : 1.2}
              strokeDasharray="8 4"
            />
            {on(layers, "labels") && (
              <text x={X(166)} y={Y(155)} fill="#b56bff" fontSize="7" textAnchor="middle" letterSpacing="0.5">
                1.5-ACRE TIMBER POST-AND-BOARD PASTURE CORRAL
              </text>
            )}
            <rect x={X(148)} y={Y(200)} width="38" height="22" fill="rgba(232,237,245,0.04)" stroke="#e8edf5" strokeWidth="1" />
            {on(layers, "labels") && (
              <text x={X(167)} y={Y(189)} fill="#e8edf5" fontSize="5.8" textAnchor="middle">
                LOAFING SHED
              </text>
            )}
          </g>
        )}

        {/* ORCHARD */}
        {on(layers, "ag") && (
          <g
            className="hot"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("orchard");
            }}
            onMouseEnter={() => onHover("orchard")}
            onMouseLeave={() => onHover(null)}
          >
            <rect
              x={X(368)}
              y={Y(382)}
              width="78"
              height="198"
              fill="rgba(61,204,106,0.04)"
              stroke="#3dcc6a"
              strokeWidth={is("orchard") ? 2 : 1.15}
              strokeDasharray="7 4"
            />
            {orchard.map((t, i) => (
              <OrchardTree key={i} x={X(t.e)} y={Y(t.n)} />
            ))}
            {on(layers, "labels") && (
              <text
                x={X(456)}
                y={Y(280)}
                fill="#3dcc6a"
                fontSize="6.6"
                textAnchor="middle"
                transform={`rotate(90 ${X(456)} ${Y(280)})`}
                letterSpacing="0.5"
              >
                1.5-ACRE HEIRLOOM APPLE / CHERRY ORCHARD
              </text>
            )}
          </g>
        )}

        {/* SEPTIC + 100% ADEQ RESERVE AREA */}
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
            <rect x={X(118)} y={Y(128)} width="22" height="12" fill="none" stroke="#e8943a" strokeWidth="1.2" strokeDasharray="4 2" />
            <circle cx={X(143)} cy={Y(122)} r="2.8" fill="#e8943a" />
            <rect x={X(148)} y={Y(132)} width="72" height="16" fill="url(#hatchLeach)" stroke="#e8943a" strokeWidth="1" strokeDasharray="5 3" />
            <rect
              x={X(148)}
              y={Y(112)}
              width="72"
              height="16"
              fill="rgba(232,148,58,0.08)"
              stroke="#e8943a"
              strokeWidth={is("rev-septic") ? 1.8 : 1.1}
              strokeDasharray="3 2"
            />
            {on(layers, "labels") && (
              <>
                <text x={X(184)} y={Y(136)} fill="#e8943a" fontSize="5.8" textAnchor="middle">
                  PRIMARY 3,000 SF LEACH
                </text>
                <text x={X(184)} y={Y(102)} fill="#e8943a" fontSize="5.8" textAnchor="middle">
                  100% ADEQ RESERVE LEACH AREA (PROTECTED)
                </text>
                <text x={X(184)} y={Y(82)} fill="#e8943a" fontSize="6" textAnchor="middle">
                  2,000G SEPTIC + DUAL-ALTERNATING VALVE
                </text>
              </>
            )}
          </g>
        )}

        {/* BUILDINGS */}
        {on(layers, "buildings") && (
          <g>
            <HotRect
              id="adu"
              x={X(186)}
              y={Y(292)}
              w={32}
              h={24}
              stroke="#e8edf5"
              hatch="hatchWhite"
              selected={selected === "adu"}
              hovered={hovered === "adu"}
              onSelect={onSelect}
              onHover={onHover}
              label="ADU"
              sub="800 SF"
            />
            <HotRect
              id="shop"
              x={X(168)}
              y={Y(258)}
              w={48}
              h={52}
              stroke="#c5cdd8"
              fill="rgba(232,237,245,0.03)"
              selected={selected === "shop"}
              hovered={hovered === "shop"}
              onSelect={onSelect}
              onHover={onHover}
              label="GYM / SHOP"
              sub="1,500 SF"
            />
            {/* stall ticks in shop */}
            <line x1={X(168)} y1={Y(240)} x2={X(216)} y2={Y(240)} stroke="#8b95a8" strokeWidth="0.5" />
            <line x1={X(184)} y1={Y(258)} x2={X(184)} y2={Y(206)} stroke="#8b95a8" strokeWidth="0.5" />
            <line x1={X(200)} y1={Y(258)} x2={X(200)} y2={Y(206)} stroke="#8b95a8" strokeWidth="0.5" />

            <HotRect
              id="barn"
              x={X(168)}
              y={Y(200)}
              w={64}
              h={44}
              stroke="#d7dde6"
              fill="rgba(232,237,245,0.04)"
              selected={selected === "barn"}
              hovered={hovered === "barn"}
              onSelect={onSelect}
              onHover={onHover}
              label="5-STALL BARN"
              sub="3,200 SF"
            />

            <HotRect
              id="lodge"
              x={X(238)}
              y={Y(208)}
              w={92}
              h={54}
              stroke="#e8edf5"
              fill="rgba(232,237,245,0.05)"
              selected={selected === "lodge"}
              hovered={hovered === "lodge"}
              onSelect={onSelect}
              onHover={onHover}
              label="ALPINE MANOR LODGE"
              sub="4,500 SF GFA"
            />
            <rect x={X(262)} y={Y(154)} width="48" height="14" fill="none" stroke="#e8edf5" strokeWidth="0.9" />
            {on(layers, "labels") && (
              <text x={X(286)} y={Y(145)} fill="#8b95a8" fontSize="5.8" textAnchor="middle">
                COVERED PORCH
              </text>
            )}

            <HotRect
              id="spa"
              x={X(342)}
              y={Y(198)}
              w={42}
              h={32}
              stroke="#3ec6d8"
              hatch="hatchCyan"
              selected={selected === "spa"}
              hovered={hovered === "spa"}
              onSelect={onSelect}
              onHover={onHover}
              label="NORDIC SPA"
              sub="1,250 SF"
              labelColor="#3ec6d8"
            />
            <circle cx={X(392)} cy={Y(188)} r="5" fill="none" stroke="#3ec6d8" strokeWidth="0.9" />
            <circle cx={X(404)} cy={Y(182)} r="4" fill="none" stroke="#3ec6d8" strokeWidth="0.9" />

            <HotRect
              id="greenhouse"
              x={X(338)}
              y={Y(248)}
              w={50}
              h={36}
              stroke="#3ec6d8"
              fill="rgba(62,198,216,0.06)"
              selected={selected === "greenhouse"}
              hovered={hovered === "greenhouse"}
              onSelect={onSelect}
              onHover={onHover}
              label="GEOTHERMAL"
              sub="GREENHOUSE 1,750 SF"
              labelColor="#3ec6d8"
            />
          </g>
        )}

        {/* OBSERVATORY + GEODESICS */}
        {on(layers, "buildings") && (
          <g>
            <g
              className="hot"
              filter={is("observatory") ? "url(#glowGold)" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onSelect("observatory");
              }}
              onMouseEnter={() => onHover("observatory")}
              onMouseLeave={() => onHover(null)}
            >
              <circle cx={X(318)} cy={Y(408)} r="13" fill="rgba(232,197,71,0.08)" stroke="#e8c547" strokeWidth={is("observatory") ? 2.2 : 1.5} />
              <circle cx={X(318)} cy={Y(408)} r="5" fill="none" stroke="#e8c547" strokeWidth="1" />
              <line x1={X(318)} y1={Y(421)} x2={X(318)} y2={Y(395)} stroke="#e8c547" strokeWidth="0.8" />
              <line x1={X(305)} y1={Y(408)} x2={X(331)} y2={Y(408)} stroke="#e8c547" strokeWidth="0.8" />
              {on(layers, "labels") && (
                <text x={X(318)} y={Y(428)} fill="#e8c547" fontSize="6.3" textAnchor="middle">
                  10' ASH-DOME OBSERVATORY
                </text>
              )}
            </g>
            <Geodesic id="geo1" x={X(292)} y={Y(358)} r={16} selected={selected === "geo1"} hovered={hovered === "geo1"} onSelect={onSelect} onHover={onHover} />
            <Geodesic id="geo2" x={X(348)} y={Y(352)} r={18} selected={selected === "geo2"} hovered={hovered === "geo2"} onSelect={onSelect} onHover={onHover} />
            <Geodesic id="geo3" x={X(328)} y={Y(312)} r={14} selected={selected === "geo3"} hovered={hovered === "geo3"} onSelect={onSelect} onHover={onHover} />
            <Geodesic id="geo4" x={X(372)} y={Y(298)} r={17} selected={selected === "geo4"} hovered={hovered === "geo4"} onSelect={onSelect} onHover={onHover} />
            <Geodesic id="geo5" x={X(350)} y={Y(262)} r={15} selected={selected === "geo5"} hovered={hovered === "geo5"} onSelect={onSelect} onHover={onHover} />
            {on(layers, "labels") && (
              <text x={X(360)} y={Y(372)} fill="#e8c547" fontSize="6.2">
                GEODESIC STEWARDSHIP ZONES
              </text>
            )}
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
            {[0, 1, 2].map((i) => (
              <rect
                key={i}
                x={X(248 + i * 34)}
                y={Y(132)}
                width="30"
                height="14"
                fill="url(#hatchGold)"
                stroke="#e8c547"
                strokeWidth="1"
              />
            ))}
            <rect x={X(352)} y={Y(128)} width="16" height="12" fill="none" stroke="#e8943a" strokeWidth="1.1" />
            {on(layers, "labels") && (
              <text x={X(293)} y={Y(108)} fill="#e8c547" fontSize="6.4" textAnchor="middle">
                25 kW BIFACIAL PV  ·  80 kWh BESS  ·  30 kW GEN
              </text>
            )}
          </g>
        )}

        {/* FIRE / WUI DEFENSIBLE SPACE & SNOW STORAGE */}
        {on(layers, "fire") && (
          <g>
            <FireCistern
              x={X(192)}
              y={Y(402)}
              selected={selected === "rev-cistern"}
              hovered={hovered === "rev-cistern"}
              onSelect={onSelect}
              onHover={onHover}
            />
            {/* 30' & 100' WUI Defensible Space around Alpine Manor Lodge */}
            <ellipse
              cx={X(284)}
              cy={Y(181)}
              rx="66"
              ry="46"
              fill="none"
              stroke="#ff5a52"
              strokeWidth="0.9"
              strokeDasharray="4 3"
            />
            <ellipse
              cx={X(284)}
              cy={Y(181)}
              rx="108"
              ry="78"
              fill="none"
              stroke="#ff5a52"
              strokeWidth="0.65"
              strokeDasharray="8 5"
              opacity="0.7"
            />
            {/* Rotunda Snow Storage Push Pocket */}
            <rect
              x={X(282)}
              y={Y(372)}
              width="34"
              height="16"
              fill="rgba(62,198,216,0.12)"
              stroke="#3ec6d8"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            {on(layers, "labels") && (
              <>
                <text x={X(284)} y={Y(232)} fill="#ff5a52" fontSize="5.8" textAnchor="middle">
                  30' WUI LEAN/CLEAN ZONE · 100' REDUCED FUEL ZONE
                </text>
                <text x={X(299)} y={Y(380)} fill="#3ec6d8" fontSize="5.5" textAnchor="middle">
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
              x={X(112)}
              y={Y(138)}
              w={116}
              h={50}
              label="100% ADEQ RESERVE LEACH"
              selected={selected === "rev-septic"}
              hovered={hovered === "rev-septic"}
              onSelect={onSelect}
              onHover={onHover}
            />
            <RevCloud
              id="rev-cistern"
              tag="REV-A2"
              x={X(168)}
              y={Y(418)}
              w={82}
              h={36}
              label="10kG FIRE CISTERN + NST"
              selected={selected === "rev-cistern"}
              hovered={hovered === "rev-cistern"}
              onSelect={onSelect}
              onHover={onHover}
            />
            <RevCloud
              id="observatory"
              tag="REV-A3"
              x={X(292)}
              y={Y(428)}
              w={92}
              h={44}
              label="SW WIND / SEEING BUFFER"
              selected={selected === "observatory"}
              hovered={hovered === "observatory"}
              onSelect={onSelect}
              onHover={onHover}
            />
            <RevCloud
              id="rev-swale"
              tag="REV-A5"
              x={X(225)}
              y={Y(236)}
              w={120}
              h={28}
              label="UP-SLOPE INTERCEPTOR SWALE"
              selected={selected === "rev-swale"}
              hovered={hovered === "rev-swale"}
              onSelect={onSelect}
              onHover={onHover}
            />
            <RevCloud
              id="rev-snow"
              tag="REV-A6"
              x={X(276)}
              y={Y(378)}
              w={74}
              h={28}
              label="SNOW PLOW POCKET"
              selected={selected === "rev-snow"}
              hovered={hovered === "rev-snow"}
              onSelect={onSelect}
              onHover={onHover}
            />
          </g>
        )}

        {/* VIEW RAY */}
        {on(layers, "views") && (
          <g>
            <line
              x1={X(292)}
              y1={Y(181)}
              x2={X(292 + Math.sin((138.8 * Math.PI) / 180) * 240)}
              y2={Y(181 + Math.cos((138.8 * Math.PI) / 180) * 240)}
              stroke="#e4453a"
              strokeWidth="1.15"
              strokeDasharray="8 5"
              markerEnd="url(#arrowRed)"
              className="dash-anim"
            />
            {on(layers, "labels") && (
              <text
                x={X(390)}
                y={Y(130)}
                fill="#e4453a"
                fontSize="6.4"
                transform={`rotate(42 ${X(390)} ${Y(130)})`}
                letterSpacing="0.4"
              >
                PRESERVED 138.8° SE MT. HUMPHREYS VIEW RAY · 12 MI
              </text>
            )}
          </g>
        )}

        {on(layers, "labels") && (
          <g>
            <text x={X(234)} y={Y(SIDE - 8)} fill="#3dcc6a" fontSize="7" textAnchor="middle" letterSpacing="0.7">
              50'-0" FRONT SETBACK  (NORTH ENTRY / N. PEAKS VISTA WAY)
            </text>
            <text x={X(234)} y={Y(8)} fill="#3dcc6a" fontSize="7" textAnchor="middle" letterSpacing="0.7">
              50'-0" REAR SETBACK  (SOUTH PRESERVED CORRIDOR)
            </text>
            <text
              x={X(8)}
              y={Y(233)}
              fill="#3dcc6a"
              fontSize="7"
              textAnchor="middle"
              transform={`rotate(-90 ${X(8)} ${Y(233)})`}
              letterSpacing="0.5"
            >
              50'-0" WEST SIDE SETBACK (AR-5)
            </text>
            <text
              x={X(SIDE - 8)}
              y={Y(233)}
              fill="#3dcc6a"
              fontSize="7"
              textAnchor="middle"
              transform={`rotate(90 ${X(SIDE - 8)} ${Y(233)})`}
              letterSpacing="0.5"
            >
              50'-0" EAST SIDE SETBACK (AR-5)
            </text>
          </g>
        )}

        <MeasureOverlay pts={measurePts} />
      </Frame>
    </svg>
  );
}

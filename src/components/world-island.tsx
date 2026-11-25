"use client";

import { useState, type ReactNode } from "react";
import { ZONE_LABELS, type IslandZone } from "./world-zones";

const VIEW_W = 600;
const VIEW_H = 440;

type Box = { x: number; y: number; w: number; h: number };

const HOTSPOTS: Record<IslandZone, Box> = {
  garden: { x: 40, y: 92, w: 176, h: 140 },
  pond: { x: 230, y: 120, w: 176, h: 162 },
  home: { x: 410, y: 60, w: 106, h: 140 },
  mailbox: { x: 520, y: 196, w: 44, h: 76 },
};

const ISLAND_ZONES: IslandZone[] = ["garden", "pond", "home", "mailbox"];

/** Pond center in island units; the duck sits here. */
export const POND_CENTER = { x: 318 / VIEW_W, y: 238 / VIEW_H };

const SPROUTS = [
  [84, 186], [118, 182], [156, 181], [190, 184],
  [96, 204], [136, 202], [176, 203],
] as const;

const TUFTS = [
  [70, 250], [130, 262], [196, 270], [258, 286], [412, 284], [470, 262], [516, 246],
  [216, 168], [380, 176], [548, 214], [60, 222], [290, 180],
] as const;

const BLOOMS = [
  [150, 252, "#ff8fab"], [232, 280, "#ffd23a"], [448, 270, "#b9a8ff"],
  [500, 214, "#ff8fab"], [398, 186, "#ffd23a"], [88, 238, "#8fd3ff"],
] as const;

const FENCE = Array.from({ length: 10 }, (_, i) => {
  const t = i / 9;
  const x = 50 + t * 160;
  const y = 226 + Math.sin(t * Math.PI) * 10;
  return { x, y };
});

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

export function WorldIsland({
  activeZone,
  mailReady,
  onZone,
  children,
}: {
  activeZone: IslandZone | null;
  mailReady: boolean;
  onZone: (zone: IslandZone) => void;
  children?: ReactNode;
}) {
  const [hovered, setHovered] = useState<IslandZone | null>(null);
  const lit = (zone: IslandZone) => zone === activeZone || zone === hovered;

  return (
    <div className="world-island" data-mail={mailReady ? "ready" : "idle"}>
      <svg className="island-art" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
        <defs>
          <linearGradient id="isle-earth-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b98458" />
            <stop offset="0.55" stopColor="#8d5b3d" />
            <stop offset="1" stopColor="#5d3a2c" />
          </linearGradient>
          <radialGradient id="isle-grass-fill" cx="0.42" cy="0.32" r="0.8">
            <stop offset="0" stopColor="#a8e6a0" />
            <stop offset="0.6" stopColor="#7fcf86" />
            <stop offset="1" stopColor="#5fb46f" />
          </radialGradient>
          <linearGradient id="isle-water-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fd8fb" />
            <stop offset="1" stopColor="#2f9fdc" />
          </linearGradient>
          <linearGradient id="isle-fall-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fd8fb" stopOpacity="0.95" />
            <stop offset="0.7" stopColor="#8fd3ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#8fd3ff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="isle-window-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd23a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffd23a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="isle-roof-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff9fb6" />
            <stop offset="1" stopColor="#f2708f" />
          </linearGradient>
        </defs>

        <g className="isle-floaters">
          <path className="isle-rock isle-float-a" d="M132 372c8-10 26-10 32 0 4 8-4 18-16 18s-20-9-16-18z" />
          <path className="isle-rock isle-float-b" d="M468 388c6-8 20-8 24 0 3 6-3 13-12 13s-15-6-12-13z" />
          <path className="isle-rock isle-float-c" d="M96 318c4-5 12-5 14 0 2 4-2 8-7 8s-9-4-7-8z" />
        </g>

        <path
          className="isle-earth"
          d="M34 214C40 262 110 300 170 330c45 22 80 70 130 90 50-20 88-68 132-90 60-30 128-68 134-116z"
        />
        <path className="isle-earth-shade" d="M170 330c45 22 80 70 130 90 50-20 88-68 132-90-42 20-87 32-132 34-45-2-90-14-130-34z" />
        <path className="isle-earth-band" d="M72 252c58 40 128 70 228 78 100-8 170-38 228-78" />
        <path className="isle-earth-band" d="M142 302c58 30 108 48 158 54 50-6 100-24 158-54" />
        <circle className="isle-pebble" cx="210" cy="300" r="7" />
        <circle className="isle-pebble" cx="404" cy="318" r="5" />
        <circle className="isle-pebble" cx="300" cy="372" r="6" />
        <path className="isle-root" d="M240 378c-6 14 2 24-4 36" />
        <path className="isle-root" d="M394 360c6 12-2 22 4 32" />
        <path className="isle-root" d="M300 412c-2 8 2 14 0 20" />

        <g className="isle-fall">
          <path className="isle-fall-body" d="M348 304c0 30-2 62-6 104h30c-2-42-4-74-4-104z" />
          <path className="isle-fall-streak" d="M354 308v92" />
          <path className="isle-fall-streak isle-fall-streak-late" d="M363 308v84" />
          <circle className="isle-mist" cx="350" cy="404" r="5" />
          <circle className="isle-mist isle-mist-late" cx="366" cy="410" r="4" />
        </g>

        <ellipse className="isle-rim" cx="300" cy="220" rx="268" ry="88" />
        <ellipse className="isle-grass" cx="300" cy="206" rx="268" ry="88" />
        <ellipse className="isle-grass-light" cx="270" cy="184" rx="196" ry="50" />
        <path className="isle-moonlight" d="M420 128c70 12 128 40 142 70" />

        <g className={`isle-zone isle-zone-garden${lit("garden") ? " is-lit" : ""}`}>
          <ellipse className="zone-ring" cx="128" cy="196" rx="96" ry="44" />
          <rect className="isle-trunk" x="74" y="132" width="10" height="38" rx="4" />
          <g className="isle-tree">
            <circle className="isle-canopy" cx="58" cy="128" r="20" />
            <circle className="isle-canopy" cx="100" cy="126" r="22" />
            <circle className="isle-canopy" cx="79" cy="108" r="28" />
            <circle className="isle-canopy-light" cx="70" cy="98" r="9" />
          </g>
          <path
            className="isle-soil"
            d="M52 196c0-14 20-26 48-28l78-2c22 0 30 12 28 26-2 18-18 30-44 32l-76 2c-22 0-34-14-34-30z"
          />
          <path className="isle-furrow" d="M70 186c40-8 90-9 126-4" />
          <path className="isle-furrow" d="M66 202c44-6 96-6 134-2" />
          <path className="isle-furrow" d="M76 216c40-4 82-5 116-2" />
          {SPROUTS.map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <g className="isle-sprout">
                <path d="M0 0v-7" />
                <path className="isle-leaf" d="M0-6c-6-1-8-6-6-8 4 0 6 4 6 8z" />
                <path className="isle-leaf" d="M0-6c6-1 8-6 6-8-4 0-6 4-6 8z" />
              </g>
            </g>
          ))}
          <path className="isle-fence-rail" d={`M${FENCE.map(({ x, y }) => `${x} ${y - 8}`).join(" L")}`} />
          {FENCE.map(({ x, y }) => (
            <path key={x} className="isle-picket" d={`M${x - 3} ${y + 4}v-16l3-4 3 4v16z`} />
          ))}
          <circle className="isle-firefly" cx="120" cy="150" r="2.6" />
          <circle className="isle-firefly isle-firefly-b" cx="168" cy="160" r="2.2" />
          <circle className="isle-firefly isle-firefly-c" cx="44" cy="170" r="2.4" />
        </g>

        <path className="isle-stone" d="M454 196c4-4 14-4 16 0 1 4-5 7-9 7s-9-3-7-7z" />
        <path className="isle-stone" d="M434 206c4-4 14-4 16 0 1 4-5 7-9 7s-9-3-7-7z" />
        <path className="isle-stone" d="M416 216c4-4 12-4 14 0 1 4-4 6-8 6s-8-2-6-6z" />
        <path className="isle-stone" d="M210 230c3-3 11-3 12 0 1 3-3 5-6 5s-7-2-6-5z" />

        <g className={`isle-zone isle-zone-pond${lit("pond") ? " is-lit" : ""}`}>
          <ellipse className="zone-ring" cx="318" cy="236" rx="114" ry="46" />
          <path className="isle-stream" d="M340 262c4 14 8 28 10 44h20c-2-16-6-30-10-44z" />
          <ellipse className="isle-bank" cx="318" cy="240" rx="102" ry="36" />
          <ellipse className="isle-pond" cx="318" cy="238" rx="92" ry="30" />
          <ellipse className="isle-pond-light" cx="302" cy="230" rx="58" ry="12" />
          <path className="isle-ripple" d="M246 240c8 6 18 9 28 9" />
          <path className="isle-ripple isle-ripple-late" d="M362 248c10 0 20-3 28-8" />
          <path className="isle-ripple" d="M280 222c10-4 20-5 30-4" />
          <path className="isle-lily" d="M260 232c6-6 18-6 22 0-4 6-16 6-22 0z" />
        </g>

        <g className="isle-lantern">
          <path className="isle-post" d="M204 292v-36" />
          <circle className="isle-lantern-glow" cx="204" cy="250" r="18" />
          <rect className="isle-lamp" x="197" y="242" width="14" height="14" rx="4" />
        </g>

        <g className={`isle-zone isle-zone-home${lit("home") ? " is-lit" : ""}`}>
          <ellipse className="zone-ring" cx="464" cy="148" rx="70" ry="66" />
          <circle className="isle-window-glow" cx="436" cy="150" r="34" />
          <rect className="isle-chimney" x="488" y="84" width="14" height="30" rx="2" />
          <circle className="isle-smoke" cx="495" cy="74" r="6" />
          <circle className="isle-smoke isle-smoke-b" cx="499" cy="62" r="7.5" />
          <circle className="isle-smoke isle-smoke-c" cx="494" cy="48" r="9" />
          <rect className="isle-wall" x="420" y="118" width="88" height="68" rx="6" />
          <path className="isle-roof" d="M408 126l56-48 56 48c3 3 1 8-3 8H411c-4 0-6-5-3-8z" />
          <circle className="isle-roof-window" cx="464" cy="108" r="7" />
          <rect className="isle-window" x="427" y="140" width="20" height="18" rx="3" />
          <path className="isle-mullion" d="M437 140v18M427 149h20" />
          <path className="isle-door" d="M480 186v-26c0-7 5-12 11-12s11 5 11 12v26z" />
          <circle className="isle-knob" cx="497" cy="172" r="1.8" />
          <ellipse className="isle-step" cx="491" cy="190" rx="16" ry="5" />
          <path className="isle-bush" d="M410 186c-6-10 6-20 14-14 6-8 20-2 16 8 6 2 4 10-4 10h-22c-4 0-6-2-4-4z" />
        </g>

        <g className={`isle-zone isle-zone-mailbox${lit("mailbox") ? " is-lit" : ""}`}>
          <ellipse className="zone-ring" cx="541" cy="236" rx="24" ry="38" />
          <rect className="isle-post" x="538" y="232" width="6" height="34" rx="2" />
          <path className="isle-mailbox" d="M526 236v-14c0-8 7-14 15-14s15 6 15 14v14z" />
          <path className="isle-mail-slot" d="M532 226h18" />
          <g className="isle-flag">
            <rect className="isle-flag-pole" x="556" y="212" width="3" height="16" rx="1" />
            <path className="isle-flag-cloth" d="M559 212h12l-3 4 3 4h-12z" />
          </g>
        </g>

        {TUFTS.map(([x, y]) => (
          <path key={`${x}-${y}`} className="isle-tuft" d={`M${x - 6} ${y}q2-8 4-1q2-9 4 0q2-7 4 1`} />
        ))}
        {BLOOMS.map(([x, y, color]) => (
          <g key={`${x}-${y}`} className="isle-bloom" transform={`translate(${x} ${y})`}>
            <circle cx="-3" cy="0" r="3" fill={color} />
            <circle cx="3" cy="0" r="3" fill={color} />
            <circle cx="0" cy="-3" r="3" fill={color} />
            <circle cx="0" cy="3" r="3" fill={color} />
            <circle className="isle-bloom-heart" cx="0" cy="0" r="2" />
          </g>
        ))}
      </svg>
      {children}
      {ISLAND_ZONES.map((zone) => {
        const box = HOTSPOTS[zone];
        return (
          <button
            key={zone}
            type="button"
            className={`island-hotspot is-${zone}`}
            style={{
              left: pct(box.x, VIEW_W),
              top: pct(box.y, VIEW_H),
              width: pct(box.w, VIEW_W),
              height: pct(box.h, VIEW_H),
            }}
            aria-label={`Open ${ZONE_LABELS[zone].title}`}
            aria-pressed={activeZone === zone}
            onClick={() => onZone(zone)}
            onPointerEnter={() => setHovered(zone)}
            onPointerLeave={() => setHovered((current) => (current === zone ? null : current))}
            onFocus={() => setHovered(zone)}
            onBlur={() => setHovered((current) => (current === zone ? null : current))}
          >
            <span className="island-hotspot-label" aria-hidden="true">{ZONE_LABELS[zone].title}</span>
          </button>
        );
      })}
    </div>
  );
}

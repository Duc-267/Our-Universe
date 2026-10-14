"use client";

import { useEffect, useRef } from "react";
import { SKY_TINT, type CoupleSky, type DuckPose } from "@/features/checkin/weather";
import { paintIconSticker } from "@/features/memory/icons";
import { categoryColor, STICKER_INK } from "@/features/memory/palette";

export type SceneStar = {
  memoryId: string;
  title: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  scale: number;
  brightness: number;
  rotation: number;
  visualSeed: number;
  bright: boolean;
  category: string;
  icon: string;
};

export type SceneCapsule = {
  id: string;
  title: string;
  state: "locked" | "ready" | "open";
  positionX: number;
  positionY: number;
  positionZ: number;
  scale: number;
  rotation: number;
  visualSeed: number;
};

export type SceneTwin = {
  momentId: string;
  title: string;
  slot: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  scale: number;
  rotation: number;
  visualSeed: number;
};

type SceneTarget = { kind: "star" | "capsule" | "moment"; id: string };

type Props = {
  stars: SceneStar[];
  capsules: SceneCapsule[];
  twins: SceneTwin[];
  selectedId: string | null;
  onSelect: (target: SceneTarget | null) => void;
  sky: CoupleSky;
  bornId: string | null;
  cheer: "star" | "checkin" | null;
};

const MIN_DIST = 115;
const MAX_DIST = 320;
const START_DIST = 175;
const START_YAW = 0.65;
const START_PITCH = -0.22;
const CREAM = "#fff6e6";

type BackgroundStar = { x: number; y: number; z: number; size: number; twinkle: boolean; phase: number };
type Cloud = { x: number; y: number; scale: number; depth: number; puffs: [number, number, number][] };
type Mote = { angle: number; radius: number; lift: number; heart: boolean; hue: string; size: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeBackgroundStars(count: number): BackgroundStar[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const radius = 430;
  const stars: BackgroundStar[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    const phi = Math.acos(1 - 2 * t);
    const theta = golden * i;
    stars.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
      size: 0.9 + (((i * 37) % 13) / 13) * 1.3,
      twinkle: i % 6 === 0,
      phase: (i * 0.618) % (Math.PI * 2),
    });
  }
  return stars;
}

function makeClouds(): Cloud[] {
  const shapes: [number, number, number][][] = [
    [[0, 0, 1], [0.9, -0.25, 0.8], [1.7, 0.05, 0.7], [-0.8, 0.1, 0.65]],
    [[0, 0, 0.9], [0.8, -0.3, 0.75], [1.5, 0, 0.6]],
    [[0, 0, 1.1], [1, -0.2, 0.85], [-0.9, -0.05, 0.7], [1.9, 0.1, 0.55]],
  ];
  return [
    { x: 0.12, y: 0.24, scale: 46, depth: 0.35, puffs: shapes[0] },
    { x: 0.62, y: 0.12, scale: 34, depth: 0.22, puffs: shapes[1] },
    { x: 0.86, y: 0.58, scale: 52, depth: 0.45, puffs: shapes[2] },
    { x: 0.32, y: 0.78, scale: 40, depth: 0.3, puffs: shapes[1] },
  ];
}

function makeMotes(): Mote[] {
  const motes: Mote[] = [];
  for (let i = 0; i < 22; i += 1) {
    const heart = i % 3 === 0;
    motes.push({
      angle: (i / 22) * Math.PI * 2,
      radius: 40 + (i % 4) * 5,
      lift: Math.sin(i * 1.7) * 14,
      heart,
      hue: heart ? "#ff8fab" : i % 2 === 0 ? "#ffd23a" : CREAM,
      size: heart ? 3.4 : 1.4 + (i % 3) * 0.4,
    });
  }
  return motes;
}

function paintBackdrop(target: HTMLCanvasElement, width: number, height: number) {
  target.width = Math.max(1, Math.round(width));
  target.height = Math.max(1, Math.round(height));
  const sky = target.getContext("2d");
  if (!sky) return;
  const gradient = sky.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#151036");
  gradient.addColorStop(0.45, "#2a1f5c");
  gradient.addColorStop(0.8, "#4a2d73");
  gradient.addColorStop(1, "#7a3f7f");
  sky.fillStyle = gradient;
  sky.fillRect(0, 0, width, height);
  const horizon = sky.createRadialGradient(width * 0.5, height * 1.05, 0, width * 0.5, height * 1.05, Math.max(width, height) * 0.7);
  horizon.addColorStop(0, "rgba(255, 158, 122, 0.45)");
  horizon.addColorStop(0.5, "rgba(255, 128, 171, 0.14)");
  horizon.addColorStop(1, "rgba(255, 128, 171, 0)");
  sky.fillStyle = horizon;
  sky.fillRect(0, 0, width, height);
}

function makeMoon(): HTMLCanvasElement {
  const size = 120;
  const moon = document.createElement("canvas");
  moon.width = size;
  moon.height = size;
  const ctx = moon.getContext("2d");
  if (!ctx) return moon;
  ctx.fillStyle = "rgba(255, 238, 190, 0.1)";
  ctx.beginPath();
  ctx.arc(60, 60, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff1c2";
  ctx.beginPath();
  ctx.arc(60, 60, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(76, 50, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255, 210, 140, 0.55)";
  ctx.beginPath();
  ctx.arc(44, 70, 4, 0, Math.PI * 2);
  ctx.arc(52, 82, 2.6, 0, Math.PI * 2);
  ctx.fill();
  return moon;
}

export function UniverseScene({ stars, capsules, twins, selectedId, onSelect, sky, bornId, cheer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef(stars);
  const capsulesRef = useRef(capsules);
  const twinsRef = useRef(twins);
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);
  const skyRef = useRef(sky);
  const bornRef = useRef(bornId);
  const cheerRef = useRef(cheer);
  const duckRef = useRef<HTMLDivElement>(null);
  const duckMotionRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ zoomIn: () => void; zoomOut: () => void; reset: () => void } | null>(
    null,
  );
  useEffect(() => {
    starsRef.current = stars;
    capsulesRef.current = capsules;
    twinsRef.current = twins;
    selectedRef.current = selectedId;
    selectRef.current = onSelect;
    skyRef.current = sky;
    bornRef.current = bornId;
    cheerRef.current = cheer;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const front = frontRef.current;
    if (!canvas || !front) return;
    const backCtx = canvas.getContext("2d");
    const frontCtx = front.getContext("2d");
    if (!backCtx || !frontCtx) return;
    let ctx: CanvasRenderingContext2D = backCtx;
    const container = canvas.parentElement;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const labelFont = getComputedStyle(canvas).fontFamily || "sans-serif";
    const cam = { yaw: START_YAW, pitch: START_PITCH, dist: START_DIST };
    const background = makeBackgroundStars(200);
    const clouds = makeClouds();
    const motes = makeMotes();
    const backdrop = document.createElement("canvas");
    const moon = makeMoon();
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart = 0;
    let pinchDistStart = START_DIST;
    let dragStart = { x: 0, y: 0, moved: 0 };
    let hoverId: string | null = null;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let lastTime = 0;
    let lastInteraction = -10_000;
    let backdropKey = "";
    let bornKey: string | null = null;
    let bornStamp = 0;
    let cheerKind: "star" | "checkin" | null = null;
    let cheerStamp = 0;
    const labels: { x: number; y: number; text: string }[] = [];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      front.width = canvas.width;
      front.height = canvas.height;
      const key = `${Math.round(width)}x${Math.round(height)}`;
      if (key !== backdropKey) {
        backdropKey = key;
        paintBackdrop(backdrop, width, height);
      }
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const focal = () => Math.min(width, height) * 1.15;

    const projectPoint = (px: number, py: number, pz: number, yawMul: number, extraDist: number) => {
      const yaw = cam.yaw * yawMul;
      const pitch = cam.pitch * yawMul;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const x1 = px * cy - pz * sy;
      const z1 = px * sy + pz * cy;
      const y2 = py * cp - z1 * sp;
      const z2 = py * sp + z1 * cp;
      const depth = cam.dist + extraDist - z2;
      if (depth < 6) return null;
      const f = focal();
      return {
        x: width / 2 + (f * x1) / depth,
        y: height / 2 - (f * y2) / depth,
        depth,
      };
    };

    const projectStar = (star: SceneStar) => {
      const point = projectPoint(star.positionX, star.positionY, star.positionZ, 1, 0);
      if (!point) return null;
      const f = focal();
      const base = Math.max(15, star.scale * 4.8 * (f / point.depth));
      return {
        star,
        x: point.x,
        y: point.y,
        depth: point.depth,
        r: star.bright ? base * 1.18 : base,
      };
    };

    const projectCapsule = (capsule: SceneCapsule) => {
      const point = projectPoint(capsule.positionX, capsule.positionY, capsule.positionZ, 1, 0);
      if (!point) return null;
      const base = Math.max(16, capsule.scale * 5.2 * (focal() / point.depth));
      return { capsule, x: point.x, y: point.y, depth: point.depth, r: base };
    };

    const projectTwin = (twin: SceneTwin) => {
      const point = projectPoint(twin.positionX, twin.positionY, twin.positionZ, 1, 0);
      if (!point) return null;
      const base = Math.max(14, twin.scale * 4.6 * (focal() / point.depth));
      return { twin, x: point.x, y: point.y, depth: point.depth, r: base };
    };

    const hitTest = (px: number, py: number): SceneTarget | null => {
      let best: SceneTarget | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      const consider = (id: string, kind: SceneTarget["kind"], x: number, y: number, radius: number) => {
        const distance = Math.hypot(px - x, py - y);
        if (distance <= Math.max(16, radius + 6) && distance < bestDistance) {
          best = { kind, id };
          bestDistance = distance;
        }
      };
      for (const star of starsRef.current) {
        const projected = projectStar(star);
        if (projected) consider(star.memoryId, "star", projected.x, projected.y, projected.r);
      }
      for (const capsule of capsulesRef.current) {
        const projected = projectCapsule(capsule);
        if (projected) consider(capsule.id, "capsule", projected.x, projected.y, projected.r);
      }
      for (const twin of twinsRef.current) {
        const projected = projectTwin(twin);
        if (projected) consider(twin.momentId, "moment", projected.x, projected.y, projected.r);
      }
      return best;
    };

    const drawOrbit = (time: number, near: boolean, centerDepth: number) => {
      const spin = reducedMotion.matches ? 0 : time / 30000;
      const rings = [
        { radius: 50, tilt: 0.28, alpha: 0.5, dash: 0 },
        { radius: 64, tilt: -0.18, alpha: 0.28, dash: 1 },
      ];
      for (const ring of rings) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = `rgba(255, 241, 194, ${near ? ring.alpha : ring.alpha * 0.6})`;
        ctx.lineWidth = near ? 2.2 : 1.6;
        if (ring.dash) ctx.setLineDash([2, 9]);
        ctx.beginPath();
        let drawing = false;
        for (let i = 0; i <= 96; i += 1) {
          const angle = (i / 96) * Math.PI * 2 + spin;
          const px = Math.cos(angle) * ring.radius;
          const pz = Math.sin(angle) * ring.radius;
          const point = projectPoint(px, Math.sin(angle) * ring.radius * ring.tilt, pz, 1, 0);
          if (!point || point.depth < centerDepth !== near) {
            drawing = false;
            continue;
          }
          if (drawing) ctx.lineTo(point.x, point.y);
          else ctx.moveTo(point.x, point.y);
          drawing = true;
        }
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawSparkle = (x: number, y: number, size: number, color: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.quadraticCurveTo(x + size * 0.18, y - size * 0.18, x + size, y);
      ctx.quadraticCurveTo(x + size * 0.18, y + size * 0.18, x, y + size);
      ctx.quadraticCurveTo(x - size * 0.18, y + size * 0.18, x - size, y);
      ctx.quadraticCurveTo(x - size * 0.18, y - size * 0.18, x, y - size);
      ctx.fill();
      ctx.restore();
    };

    const drawHeart = (x: number, y: number, size: number, color: string, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size, size);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 0.35);
      ctx.bezierCurveTo(-0.55, -0.05, -0.4, -0.72, 0, -0.32);
      ctx.bezierCurveTo(0.4, -0.72, 0.55, -0.05, 0, 0.35);
      ctx.fill();
      ctx.restore();
    };

    const drawSky = (time: number) => {
      if (backdrop.width > 0) ctx.drawImage(backdrop, 0, 0, width, height);
      const reduced = reducedMotion.matches;
      for (const tint of skyRef.current.tints) {
        const color = SKY_TINT[tint];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
      }

      for (const bg of background) {
        const point = projectPoint(bg.x, bg.y, bg.z, 0.75, 520);
        if (!point) continue;
        const pulse = reduced ? 0.75 : 0.55 + 0.45 * Math.sin(time / 1100 + bg.phase);
        if (bg.twinkle) {
          drawSparkle(point.x, point.y, bg.size * 2.6, "#fff1c2", pulse);
        } else {
          ctx.globalAlpha = 0.35 + pulse * 0.4;
          ctx.fillStyle = CREAM;
          ctx.beginPath();
          ctx.arc(point.x, point.y, bg.size * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      const moonSize = Math.min(width, height) * 0.2;
      const moonX = width * 0.84 - Math.sin(cam.yaw) * 24;
      const moonY = height * 0.18 + cam.pitch * 18;
      ctx.drawImage(moon, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);

      const windy = skyRef.current.poses.includes("fidget") ? 3 : 1;
      for (const cloud of clouds) {
        const drift = reduced ? 0 : (time / 40000) * windy;
        const span = width + cloud.scale * 6;
        const baseX = ((cloud.x + drift * cloud.depth) * width - cam.yaw * 60 * cloud.depth) % span;
        const x = (baseX + span) % span - cloud.scale * 2;
        const y = cloud.y * height + cam.pitch * 30 * cloud.depth;
        ctx.fillStyle = skyRef.current.tints.includes("rain") ? "rgba(132, 146, 196, 0.42)" : "rgba(146, 118, 214, 0.28)";
        ctx.beginPath();
        for (const [px, py, pr] of cloud.puffs) {
          ctx.moveTo(x + px * cloud.scale + pr * cloud.scale, y + py * cloud.scale);
          ctx.arc(x + px * cloud.scale, y + py * cloud.scale, pr * cloud.scale, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = "rgba(255, 246, 230, 0.06)";
        ctx.beginPath();
        const [hx, hy, hr] = cloud.puffs[0];
        ctx.arc(x + hx * cloud.scale - hr * cloud.scale * 0.2, y + hy * cloud.scale - hr * cloud.scale * 0.25, hr * cloud.scale * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      if (skyRef.current.tints.includes("rain") && !reduced) {
        ctx.strokeStyle = "rgba(186, 214, 255, 0.55)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (let i = 0; i < 26; i += 1) {
          const x = (i * 83 + time / 22) % width;
          const y = (i * 47 + time / 6) % height;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2, y + 8);
          ctx.stroke();
        }
      }
    };

    const drawHalo = () => {
      const center = projectPoint(0, 0, 0, 1, 0);
      if (!center) return;
      const radius = (46 * focal()) / cam.dist;
      const halo = ctx.createRadialGradient(center.x, center.y, radius * 0.1, center.x, center.y, radius);
      halo.addColorStop(0, "rgba(255, 226, 150, 0.16)");
      halo.addColorStop(1, "rgba(255, 226, 150, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawMotes = (time: number, near: boolean, centerDepth: number) => {
      const poses = skyRef.current.poses;
      const speed = poses.includes("fidget") ? 2.2 : poses.every((pose) => pose === "rest") ? 0.3 : 1;
      const spin = reducedMotion.matches ? 0 : (time / 9000) * speed;
      const quiet = poses.every((pose) => pose === "rest") ? 0.4 : 1;
      for (const mote of motes) {
        const angle = mote.angle + spin;
        const point = projectPoint(Math.cos(angle) * mote.radius, mote.lift, Math.sin(angle) * mote.radius, 1, 0);
        if (!point || point.depth < centerDepth !== near) continue;
        const size = Math.max(1.6, (mote.size * focal()) / point.depth);
        const alpha = (near ? 0.75 : 0.85) * quiet;
        if (mote.heart) drawHeart(point.x, point.y, size * 1.7, mote.hue, alpha);
        else drawSparkle(point.x, point.y, size * 1.4, mote.hue, alpha);
      }
    };

    const drawLabel = (x: number, y: number, text: string) => {
      ctx.font = `700 13px ${labelFont}`;
      const padX = 10;
      const boxHeight = 26;
      const textWidth = Math.min(ctx.measureText(text).width, 220);
      const boxWidth = textWidth + padX * 2;
      const bx = clamp(x - boxWidth / 2, 6, width - boxWidth - 6);
      const by = clamp(y - boxHeight - 12, 6, height - boxHeight - 6);
      ctx.fillStyle = "rgba(43, 29, 58, 0.35)";
      ctx.beginPath();
      ctx.roundRect(bx + 1, by + 3, boxWidth, boxHeight, 13);
      ctx.fill();
      ctx.fillStyle = CREAM;
      ctx.strokeStyle = STICKER_INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxWidth, boxHeight, 13);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = STICKER_INK;
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx + padX, by + boxHeight / 2 + 1, textWidth);
    };

    const drawSticker = (entry: NonNullable<ReturnType<typeof projectStar>>, time: number) => {
      const { star, x, y } = entry;
      const reduced = reducedMotion.matches;
      let r = entry.r;
      if (star.memoryId === bornKey && !reduced) {
        const age = (time - bornStamp) / 900;
        if (age >= 0 && age < 1) {
          r *= age < 0.5 ? 0.3 + age * 2 * 1.0 : 1.3 - (age - 0.5) * 0.6;
          for (let i = 0; i < 8; i += 1) {
            const angle = (i / 8) * Math.PI * 2;
            const reach = entry.r * (1.2 + age * 1.4);
            drawSparkle(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach, entry.r * 0.22 * (1 - age), "#ffd23a", 1 - age);
          }
        }
      }
      const bob = reduced ? 0 : Math.sin(time / 1400 + star.rotation * 5) * r * 0.06;
      const sy = y + bob;
      const tilt = reduced ? 0 : Math.sin(time / 2600 + star.rotation * 3) * 0.08;
      const fill = categoryColor(star.category);
      const fade = clamp(1.25 - entry.depth / (cam.dist + 90), 0.55, 1);

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(x, sy);
      ctx.rotate(tilt);
      paintIconSticker(ctx, star.icon, 0, 0, r * 2.75, fill, STICKER_INK);
      ctx.restore();

      if (star.bright) {
        const spin = reduced ? 0 : time / 1600;
        for (let i = 0; i < 3; i += 1) {
          const angle = spin + (i * Math.PI * 2) / 3 + star.rotation;
          const twinkle = reduced ? 1 : 0.6 + 0.4 * Math.sin(time / 300 + i);
          drawSparkle(x + Math.cos(angle) * r * 1.65, sy + Math.sin(angle) * r * 1.65, r * 0.24 * twinkle, "#fff1c2", fade);
        }
      }

      if (star.memoryId === selectedRef.current) {
        ctx.save();
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = reduced ? 0 : -time / 60;
        ctx.beginPath();
        ctx.arc(x, sy, r * 1.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (star.memoryId === hoverId || star.memoryId === selectedRef.current) {
        labels.push({ x, y: sy - r * 1.3, text: star.title });
      }
    };

    const drawCapsule = (entry: NonNullable<ReturnType<typeof projectCapsule>>, time: number) => {
      const { capsule, x, y, r } = entry;
      const reduced = reducedMotion.matches;
      const angle = -2.4 + capsule.rotation;
      const tail = r * (capsule.state === "open" ? 1.5 : 3);
      const rgb = capsule.state === "locked" ? "186, 214, 255" : "255, 210, 58";
      ctx.save();
      ctx.globalAlpha = clamp(1.2 - entry.depth / (cam.dist + 110), 0.55, 1);
      ctx.strokeStyle = `rgba(${rgb}, 0.9)`;
      ctx.lineWidth = Math.max(2, r * 0.34);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * tail, y + Math.sin(angle) * tail);
      ctx.stroke();
      if (capsule.state === "open") {
        paintIconSticker(ctx, "letter", x, y, r * 2.5, "#fff1c2", STICKER_INK);
      } else {
        ctx.fillStyle = capsule.state === "locked" ? "#d7e6ff" : "#fff1c2";
        ctx.strokeStyle = STICKER_INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (capsule.state === "ready") {
          const pulse = reduced ? 1 : 0.65 + 0.35 * Math.sin(time / 280);
          drawSparkle(x, y - r * 0.95, r * 0.28 * pulse, "#ffd23a", 1);
        }
      }
      if (capsule.id === bornKey && !reduced) {
        const age = (time - bornStamp) / 900;
        if (age >= 0 && age < 1) {
          drawSparkle(x - r, y - r, r * 0.3 * (1 - age), "#fff1c2", 1 - age);
          drawSparkle(x + r, y, r * 0.24 * (1 - age), "#ffd23a", 1 - age);
        }
      }
      if (capsule.id === selectedRef.current) {
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = reduced ? 0 : -time / 60;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (capsule.id === hoverId || capsule.id === selectedRef.current) {
        labels.push({ x, y: y - r * 1.4, text: capsule.title });
      }
    };

    const drawTwin = (entry: NonNullable<ReturnType<typeof projectTwin>>, time: number) => {
      const { twin, x, y, r } = entry;
      const reduced = reducedMotion.matches;
      const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(time / 700 + twin.slot);
      ctx.save();
      ctx.globalAlpha = clamp(1.2 - entry.depth / (cam.dist + 110), 0.55, 1);
      ctx.fillStyle = twin.slot === 1 ? "#ff8fab" : "#ffd23a";
      ctx.strokeStyle = STICKER_INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawSparkle(x, y, r * 0.35, CREAM, 0.9);
      if (twin.momentId === selectedRef.current) {
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (twin.momentId === hoverId || twin.momentId === selectedRef.current) {
        labels.push({ x, y: y - r * 1.4, text: twin.title });
      }
    };

    const drawTwinLinks = (projectedTwins: NonNullable<ReturnType<typeof projectTwin>>[]) => {
      const byMoment = new Map<string, NonNullable<ReturnType<typeof projectTwin>>[]>();
      for (const entry of projectedTwins) {
        const list = byMoment.get(entry.twin.momentId) ?? [];
        list.push(entry);
        byMoment.set(entry.twin.momentId, list);
      }
      ctx.save();
      ctx.strokeStyle = "rgba(255, 143, 171, 0.75)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      for (const pair of byMoment.values()) {
        if (pair.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(pair[0].x, pair[0].y);
        ctx.lineTo(pair[1].x, pair[1].y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const placeDuck = (time: number) => {
      const node = duckRef.current;
      const motion = duckMotionRef.current;
      const anchor = projectPoint(0, 0, 0, 1, 0);
      if (!node || !motion || !anchor) return;
      const reduced = reducedMotion.matches;
      const poses = skyRef.current.poses;
      const pose: DuckPose = reduced || poses.length < 2
        ? (poses[0] ?? "look")
        : poses[Math.floor(time / 3600) % poses.length];
      if (cheerRef.current !== cheerKind) {
        cheerKind = cheerRef.current;
        cheerStamp = time;
      }
      const cheering = Boolean(cheerKind) && time - cheerStamp < 1400 && !reduced;
      const widthPx = (62 * focal()) / cam.dist;
      node.style.width = `${widthPx}px`;
      node.style.transform = `translate(${anchor.x}px, ${anchor.y}px) translate(-52%, -62%)`;
      node.style.visibility = "visible";
      motion.dataset.pose = reduced ? "still" : pose;
      motion.dataset.cheer = cheering && cheerKind ? cheerKind : "";
    };

    const draw = (time: number) => {
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
      lastTime = time;
      if (!reducedMotion.matches && time - lastInteraction > 4000) {
        cam.yaw += dt * 0.05;
      }
      if (bornRef.current !== bornKey) {
        bornKey = bornRef.current;
        bornStamp = time;
      }
      const centerDepth = projectPoint(0, 0, 0, 1, 0)?.depth ?? cam.dist;
      const twinEntries = twinsRef.current
        .map((twin) => projectTwin(twin))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      const projected = [
        ...starsRef.current
          .map((star) => projectStar(star))
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
          .map((entry) => ({ depth: entry.depth, paint: () => drawSticker(entry, time) })),
        ...capsulesRef.current
          .map((capsule) => projectCapsule(capsule))
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
          .map((entry) => ({ depth: entry.depth, paint: () => drawCapsule(entry, time) })),
        ...twinEntries.map((entry) => ({ depth: entry.depth, paint: () => drawTwin(entry, time) })),
      ].sort((a, b) => b.depth - a.depth);
      labels.length = 0;

      ctx = backCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawSky(time);
      drawHalo();
      drawOrbit(time, false, centerDepth);
      drawMotes(time, false, centerDepth);
      drawTwinLinks(twinEntries.filter((entry) => entry.depth >= centerDepth));
      for (const entry of projected) if (entry.depth >= centerDepth) entry.paint();

      ctx = frontCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawOrbit(time, true, centerDepth);
      drawMotes(time, true, centerDepth);
      drawTwinLinks(twinEntries.filter((entry) => entry.depth < centerDepth));
      for (const entry of projected) if (entry.depth < centerDepth) entry.paint();
      for (const label of labels) drawLabel(label.x, label.y, label.text);
      placeDuck(time);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const canvasPoint = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      const point = canvasPoint(event);
      pointers.set(event.pointerId, point);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        pinchDistStart = cam.dist;
      }
      dragStart = { ...point, moved: 0 };
      lastInteraction = performance.now();
    };

    const onPointerMove = (event: PointerEvent) => {
      const point = canvasPoint(event);
      if (!pointers.has(event.pointerId)) {
        const hit = hitTest(point.x, point.y);
        hoverId = hit ? hit.id : null;
        canvas.style.cursor = hit ? "pointer" : "grab";
        return;
      }
      const previous = pointers.get(event.pointerId);
      pointers.set(event.pointerId, point);
      lastInteraction = performance.now();
      if (!previous) return;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart > 0 && distance > 0) {
          cam.dist = clamp(pinchDistStart * (pinchStart / distance), MIN_DIST, MAX_DIST);
        }
        return;
      }
      dragStart.moved += Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
      cam.yaw += (point.x - previous.x) * 0.006;
      cam.pitch = clamp(cam.pitch + (point.y - previous.y) * 0.005, -1.25, 1.25);
    };

    const onPointerUp = (event: PointerEvent) => {
      const wasSinglePointer = pointers.size === 1;
      const wasClick = wasSinglePointer && dragStart.moved < 8;
      pointers.delete(event.pointerId);
      lastInteraction = performance.now();
      if (wasClick) {
        const point = canvasPoint(event);
        selectRef.current(hitTest(point.x, point.y));
      }
    };

    const onPointerLeave = () => {
      hoverId = null;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cam.dist = clamp(cam.dist * (1 + event.deltaY * 0.0012), MIN_DIST, MAX_DIST);
      lastInteraction = performance.now();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      let handled = true;
      if (event.key === "ArrowLeft") cam.yaw -= 0.12;
      else if (event.key === "ArrowRight") cam.yaw += 0.12;
      else if (event.key === "ArrowUp") cam.pitch = clamp(cam.pitch + 0.1, -1.25, 1.25);
      else if (event.key === "ArrowDown") cam.pitch = clamp(cam.pitch - 0.1, -1.25, 1.25);
      else if (event.key === "+" || event.key === "=")
        cam.dist = clamp(cam.dist - 18, MIN_DIST, MAX_DIST);
      else if (event.key === "-" || event.key === "_")
        cam.dist = clamp(cam.dist + 18, MIN_DIST, MAX_DIST);
      else if (event.key === "Escape") selectRef.current(null);
      else handled = false;
      if (handled) {
        event.preventDefault();
        lastInteraction = performance.now();
      }
    };

    apiRef.current = {
      zoomIn: () => {
        cam.dist = clamp(cam.dist - 24, MIN_DIST, MAX_DIST);
        lastInteraction = performance.now();
      },
      zoomOut: () => {
        cam.dist = clamp(cam.dist + 24, MIN_DIST, MAX_DIST);
        lastInteraction = performance.now();
      },
      reset: () => {
        cam.yaw = START_YAW;
        cam.pitch = START_PITCH;
        cam.dist = START_DIST;
        lastInteraction = performance.now();
      },
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKeyDown);
      apiRef.current = null;
    };
  }, []);

  return (
    <div className="universe-scene">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Universe scene with your duck, memory stars, and capsules. Arrow keys rotate the view, plus and minus zoom, and the lists below open each memory or capsule."
      />
      <canvas ref={frontRef} className="universe-front" aria-hidden="true" />
      <div ref={duckRef} className="universe-mascot" style={{ visibility: "hidden" }}>
        <div ref={duckMotionRef} className="duck-motion" data-pose="look" data-cheer="">
          <svg className="duck-art" viewBox="0 0 240 200" aria-hidden="true">
            <defs>
              <linearGradient id="duck-body-shade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe04f" />
                <stop offset="0.6" stopColor="#f9c62a" />
                <stop offset="1" stopColor="#e39a18" />
              </linearGradient>
              <radialGradient id="duck-head-shade" cx="0.38" cy="0.32" r="0.75">
                <stop offset="0" stopColor="#ffec70" />
                <stop offset="0.55" stopColor="#fcd232" />
                <stop offset="1" stopColor="#eaa91c" />
              </radialGradient>
              <linearGradient id="duck-wing-shade" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffe866" />
                <stop offset="1" stopColor="#f7bf1f" />
              </linearGradient>
              <linearGradient id="duck-beak-shade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffa23a" />
                <stop offset="1" stopColor="#f2741a" />
              </linearGradient>
            </defs>
            <g className="duck-pond">
              <ellipse className="duck-water" cx="122" cy="174" rx="94" ry="20" />
              <ellipse className="duck-water-light" cx="122" cy="170" rx="70" ry="11" />
              <path className="duck-ripple" d="M50 167c5-6 12-9 20-10" />
              <path className="duck-ripple duck-ripple-late" d="M46 178c7 3 14 4 22 3" />
              <path className="duck-ripple" d="M186 178c8-1 14-3 20-7" />
            </g>
            <g className="duck-bob">
              <path
                className="duck-body"
                d="M178 116c14 20 6 54-34 60l-54 0c-34 0-52-20-50-46 1-14 3-28-6-46 16 0 30 10 38 22 20-12 52-14 76-6z"
              />
              <path className="duck-belly-shine" d="M150 160c10-4 18-12 20-22" />
              <g className="duck-wing">
                <path
                  className="duck-wing-shape"
                  d="M82 122c10-16 40-18 52 0 7 12-1 30-22 32-12 1-22-2-28-8-6 2-12-2-11-8-6-2-7-10 1-13-3-2-1-3 8-3z"
                />
                <path className="duck-line" d="M90 138c8 3 18 2 26-3" />
                <path className="duck-line" d="M94 128c9 2 18 1 26-4" />
              </g>
              <g className="duck-head">
                <circle className="duck-head-shape" cx="150" cy="78" r="44" />
                <ellipse className="duck-head-shine" cx="130" cy="52" rx="10" ry="6" transform="rotate(-28 130 52)" />
                <ellipse className="duck-blush" cx="128" cy="94" rx="9" ry="6" />
                <ellipse className="duck-blush" cx="176" cy="94" rx="6" ry="4.5" />
                <path className="duck-brow duck-brow-near" d="M131 57c6-5 13-5 18-1" />
                <path className="duck-brow duck-brow-far" d="M164 55c5-4 11-4 15 0" />
                <path className="duck-tear" d="M134 88c-3 5-4 8-1 10 3 2 6-1 5-4-1-2-2-4-4-6z" />
                <g className="duck-eye">
                  <ellipse cx="140" cy="74" rx="8.5" ry="10.5" />
                  <circle className="duck-shine" cx="143" cy="69" r="3.4" />
                  <circle className="duck-shine" cx="137.5" cy="79" r="1.5" />
                  <ellipse cx="171" cy="72" rx="7.5" ry="9.5" />
                  <circle className="duck-shine" cx="173.5" cy="67.5" r="3" />
                  <circle className="duck-shine" cx="168.5" cy="76.5" r="1.3" />
                </g>
                <path className="duck-shut" d="M132 76c5 5 12 5 17 0M164 74c4 4 10 4 14 0" />
                <path className="duck-beak" d="M174 84c14-11 38-11 52 2-9 13-34 17-52 10-6-4-6-8 0-12z" />
                <path className="duck-beak-line" d="M180 92c12 3 26 2 40-5" />
              </g>
            </g>
          </svg>
          <span className="duck-heart" aria-hidden="true">♥</span>
        </div>
      </div>
      <div className="scene-controls">
        <button type="button" aria-label="Zoom in" onClick={() => apiRef.current?.zoomIn()}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => apiRef.current?.zoomOut()}>−</button>
        <button type="button" onClick={() => apiRef.current?.reset()}>Reset view</button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { SkyWeather } from "@/features/checkin/weather";
import { paintMemoryIcon } from "@/features/memory/icons";

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

type Props = {
  stars: SceneStar[];
  selectedId: string | null;
  onSelect: (memoryId: string | null) => void;
  weather: SkyWeather;
  bornId: string | null;
};

const MIN_DIST = 115;
const MAX_DIST = 320;
const START_DIST = 175;
const START_YAW = 0.65;
const START_PITCH = -0.22;

type StarHue = { core: string; glow: string };

const STAR_HUES: Record<string, StarHue> = {
  everyday: { core: "#ffe4ef", glow: "255, 176, 206" },
  date: { core: "#ffd0e4", glow: "255, 112, 164" },
  trip: { core: "#ffe0b0", glow: "255, 186, 92" },
  funny: { core: "#ffd2c2", glow: "255, 154, 122" },
  special: { core: "#fff1c2", glow: "255, 214, 120" },
  difficult: { core: "#e4dcff", glow: "186, 164, 255" },
  random: { core: "#d7f3ff", glow: "126, 206, 255" },
};

const FIELD_COLORS = ["#fff6fb", "#ffd0e2", "#ffe0a8", "#ddd0ff", "#c8ecff"];

type BackgroundStar = { x: number; y: number; z: number; size: number; alpha: number; color: string };

type DustMote = {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  heart: boolean;
  hue: string;
  spin: number;
};

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
      size: 0.6 + (((i * 37) % 13) / 13) * 1.4,
      alpha: 0.28 + (((i * 53) % 17) / 17) * 0.55,
      color: FIELD_COLORS[i % FIELD_COLORS.length],
    });
  }
  return stars;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hueFor(category: string): StarHue {
  return STAR_HUES[category] ?? STAR_HUES.everyday;
}

function makeDust(): DustMote[] {
  const motes: DustMote[] = [];
  for (let i = 0; i < 28; i += 1) {
    const angle = (i / 28) * Math.PI * 2;
    const radius = 24 + (i % 5) * 2.4;
    const heart = i % 4 === 0;
    motes.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle * 2) * 4.5,
      z: Math.sin(angle) * radius,
      size: heart ? 5.5 : 1.3 + (i % 3) * 0.45,
      alpha: heart ? 0.72 : 0.35 + (i % 4) * 0.08,
      heart,
      hue: i % 2 === 0 ? "255, 140, 176" : "255, 196, 120",
      spin: angle,
    });
  }
  return motes;
}

function makeGlowSprite(rgb: string): HTMLCanvasElement {
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const glow = sprite.getContext("2d");
  if (!glow) return sprite;
  const gradient = glow.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, `rgba(${rgb}, 0.95)`);
  gradient.addColorStop(0.28, `rgba(${rgb}, 0.42)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  glow.fillStyle = gradient;
  glow.fillRect(0, 0, size, size);
  return sprite;
}

function paintBackdrop(target: HTMLCanvasElement, width: number, height: number) {
  target.width = Math.max(1, Math.round(width));
  target.height = Math.max(1, Math.round(height));
  const glow = target.getContext("2d");
  if (!glow) return;
  const sky = glow.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, "#3a1848");
  sky.addColorStop(0.42, "#1c0d2c");
  sky.addColorStop(1, "#140818");
  glow.fillStyle = sky;
  glow.fillRect(0, 0, width, height);
  const blobs = [
    { x: width * 0.18, y: height * 0.22, r: Math.max(width, height) * 0.48, color: "255, 96, 150" },
    { x: width * 0.82, y: height * 0.7, r: Math.max(width, height) * 0.42, color: "255, 176, 84" },
    { x: width * 0.58, y: height * 0.16, r: Math.max(width, height) * 0.32, color: "176, 132, 255" },
    { x: width * 0.36, y: height * 0.82, r: Math.max(width, height) * 0.34, color: "255, 128, 176" },
  ];
  for (const blob of blobs) {
    const gradient = glow.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
    gradient.addColorStop(0, `rgba(${blob.color}, 0.5)`);
    gradient.addColorStop(0.42, `rgba(${blob.color}, 0.16)`);
    gradient.addColorStop(1, `rgba(${blob.color}, 0)`);
    glow.fillStyle = gradient;
    glow.fillRect(0, 0, width, height);
  }
}

export function UniverseScene({ stars, selectedId, onSelect, weather, bornId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef(stars);
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);
  const weatherRef = useRef(weather);
  const bornRef = useRef(bornId);
  const apiRef = useRef<{ zoomIn: () => void; zoomOut: () => void; reset: () => void } | null>(
    null,
  );
  useEffect(() => {
    starsRef.current = stars;
    selectedRef.current = selectedId;
    selectRef.current = onSelect;
    weatherRef.current = weather;
    bornRef.current = bornId;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const container = canvas.parentElement;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cam = { yaw: START_YAW, pitch: START_PITCH, dist: START_DIST };
    const background = makeBackgroundStars(220);
    const dust = makeDust();
    const backdrop = document.createElement("canvas");
    const glowSprites = new Map<string, HTMLCanvasElement>();
    for (const hue of Object.values(STAR_HUES)) {
      if (!glowSprites.has(hue.glow)) glowSprites.set(hue.glow, makeGlowSprite(hue.glow));
    }
    glowSprites.set("255, 140, 176", makeGlowSprite("255, 140, 176"));
    glowSprites.set("255, 196, 120", makeGlowSprite("255, 196, 120"));
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

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
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
      return {
        star,
        x: point.x,
        y: point.y,
        depth: point.depth,
        r: Math.max(13, star.scale * 4.2 * (f / point.depth)),
      };
    };

    const hitTest = (px: number, py: number): SceneStar | null => {
      let best: SceneStar | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const star of starsRef.current) {
        const projected = projectStar(star);
        if (!projected) continue;
        const distance = Math.hypot(px - projected.x, py - projected.y);
        const hitRadius = Math.max(13, projected.r + 6);
        if (distance <= hitRadius && distance < bestDistance) {
          best = star;
          bestDistance = distance;
        }
      }
      return best;
    };

    const drawBackground = () => {
      if (backdrop.width > 0) ctx.drawImage(backdrop, 0, 0, width, height);
      for (const bg of background) {
        const point = projectPoint(bg.x, bg.y, bg.z, 0.75, 520);
        if (!point) continue;
        ctx.globalAlpha = bg.alpha;
        ctx.fillStyle = bg.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, bg.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const ringPoints = (time: number) => {
      const spin = reducedMotion.matches ? 0.4 : time / 14000;
      const points: { x: number; y: number; depth: number }[] = [];
      for (let i = 0; i <= 72; i += 1) {
        const angle = (i / 72) * Math.PI * 2 + spin;
        const point = projectPoint(Math.cos(angle) * 30, Math.sin(angle) * 5.5, Math.sin(angle) * 30, 1, 0);
        if (point) points.push(point);
      }
      return points;
    };

    const strokeRing = (
      points: { x: number; y: number; depth: number }[],
      far: boolean,
      planetDepth: number,
      alpha: number,
    ) => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 214, 150, ${alpha})`;
      ctx.lineWidth = far ? 1.4 : 2.2;
      let drawing = false;
      for (const point of points) {
        if ((point.depth > planetDepth) !== far) {
          drawing = false;
          continue;
        }
        if (!drawing) {
          ctx.moveTo(point.x, point.y);
          drawing = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    };

    const drawPlanet = () => {
      const point = projectPoint(0, 0, 0, 1, 0);
      if (!point) return null;
      const radius = (18 * focal()) / cam.dist;
      const atmosphere = ctx.createRadialGradient(point.x, point.y, radius * 0.7, point.x, point.y, radius * 2.6);
      atmosphere.addColorStop(0, "rgba(255, 150, 186, 0.45)");
      atmosphere.addColorStop(0.45, "rgba(255, 186, 120, 0.16)");
      atmosphere.addColorStop(1, "rgba(255, 150, 186, 0)");
      ctx.fillStyle = atmosphere;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 2.6, 0, Math.PI * 2);
      ctx.fill();
      const body = ctx.createRadialGradient(
        point.x - radius * 0.38,
        point.y - radius * 0.42,
        radius * 0.08,
        point.x + radius * 0.1,
        point.y + radius * 0.15,
        radius,
      );
      body.addColorStop(0, "#ffe0c2");
      body.addColorStop(0.28, "#ff8fb2");
      body.addColorStop(0.62, "#c45b86");
      body.addColorStop(1, "#4a2048");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 244, 230, 0.55)";
      ctx.beginPath();
      ctx.ellipse(point.x - radius * 0.28, point.y - radius * 0.32, radius * 0.22, radius * 0.14, -0.5, 0, Math.PI * 2);
      ctx.fill();
      return point;
    };

    const paintHeart = (x: number, y: number, size: number, rgb: string, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size, size);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.beginPath();
      ctx.moveTo(0, 0.35);
      ctx.bezierCurveTo(-0.55, -0.05, -0.4, -0.72, 0, -0.32);
      ctx.bezierCurveTo(0.4, -0.72, 0.55, -0.05, 0, 0.35);
      ctx.fill();
      ctx.restore();
    };

    const drawLabel = (x: number, y: number, text: string) => {
      const padX = 7;
      const boxHeight = 20;
      ctx.font = "12px Arial, Helvetica, sans-serif";
      const textWidth = ctx.measureText(text).width;
      const boxWidth = textWidth + padX * 2;
      const bx = clamp(x - boxWidth / 2, 4, width - boxWidth - 4);
      const by = clamp(y - boxHeight - 8, 4, height - boxHeight - 4);
      ctx.fillStyle = "rgba(21, 12, 32, 0.9)";
      ctx.strokeStyle = "rgba(255, 240, 245, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(bx, by, boxWidth, boxHeight);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffb3c8";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx + padX, by + boxHeight / 2);
    };

    const drawStars = (entries: NonNullable<ReturnType<typeof projectStar>>[], time: number) => {
      for (const entry of entries) {
        const { star, x, y, r } = entry;
        const hue = hueFor(star.category);
        const twinkle = reducedMotion.matches
          ? 0
          : Math.sin(time / 900 + star.rotation * 7) * 0.08;
        const alpha = clamp(star.brightness + twinkle, 0.2, 1);
        const sprite = glowSprites.get(hue.glow);
        const glowRadius = star.bright ? r * 7 : r * 4.6;
        if (sprite) {
          ctx.globalAlpha = alpha * (star.bright ? 0.95 : 0.72);
          ctx.drawImage(sprite, x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = `rgba(${hue.glow}, 0.34)`;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        paintMemoryIcon(ctx, star.icon, x, y, r * 1.35, star.bright ? "#fff8ee" : hue.core);

        if (star.memoryId === selectedRef.current) {
          ctx.strokeStyle = "rgba(255, 226, 170, 0.95)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (star.memoryId === bornRef.current && !reducedMotion.matches) {
          const pulse = 0.5 + 0.5 * Math.sin(time / 180);
          ctx.strokeStyle = `rgba(255, 236, 196, ${0.35 + pulse * 0.4})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, r * (0.9 + pulse * 0.45), 0, Math.PI * 2);
          ctx.stroke();
        }

        if (star.memoryId === hoverId) drawLabel(x, y - r, star.title);
      }
    };

    const drawDust = (far: boolean, planetDepth: number, time: number) => {
      const speed = weatherRef.current === "restless" ? 2.4 : weatherRef.current === "still" ? 0.35 : 1;
      const drift = reducedMotion.matches ? 0 : (time / 9000) * speed;
      for (const mote of dust) {
        const spin = mote.spin + drift;
        const point = projectPoint(
          Math.cos(spin) * Math.hypot(mote.x, mote.z),
          mote.y,
          Math.sin(spin) * Math.hypot(mote.x, mote.z),
          1,
          0,
        );
        if (!point) continue;
        const isFar = point.depth > planetDepth;
        if (isFar !== far) continue;
        if (mote.heart) {
          const size = Math.max(3.2, (mote.size * focal()) / point.depth);
          const quiet = weatherRef.current === "still" ? 0.35 : 1;
          paintHeart(point.x, point.y, size, mote.hue, mote.alpha * quiet);
        } else {
          const sprite = glowSprites.get(mote.hue);
          const radius = Math.max(1.2, (mote.size * focal()) / point.depth);
          if (sprite) {
            ctx.globalAlpha = mote.alpha;
            ctx.drawImage(sprite, point.x - radius * 4, point.y - radius * 4, radius * 8, radius * 8);
            ctx.globalAlpha = 1;
          }
          ctx.globalAlpha = mote.alpha + 0.2;
          ctx.fillStyle = `rgb(${mote.hue})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    };

    const draw = (time: number) => {
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
      lastTime = time;
      if (!reducedMotion.matches && time - lastInteraction > 4000) {
        cam.yaw += dt * 0.05;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawBackground();
      const sky = weatherRef.current;
      if (sky === "warm" || sky === "tender" || sky === "rain") {
        ctx.fillStyle = sky === "rain" ? "rgba(120, 146, 186, 0.14)" : sky === "tender" ? "rgba(255, 150, 186, 0.12)" : "rgba(255, 170, 110, 0.12)";
        ctx.fillRect(0, 0, width, height);
      }
      if (sky === "rain" && !reducedMotion.matches) {
        ctx.strokeStyle = "rgba(210, 224, 245, 0.28)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 18; i += 1) {
          const x = ((i * 97 + time / 18) % width);
          const y = ((i * 53 + time / 8) % height);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 3, y + 10);
          ctx.stroke();
        }
      }

      const planetPoint = projectPoint(0, 0, 0, 1, 0);
      const planetDepth = planetPoint?.depth ?? cam.dist;
      const ring = ringPoints(time);
      const projected = starsRef.current
        .map((star) => projectStar(star))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      const farStars = projected.filter((entry) => entry.depth > planetDepth).sort((a, b) => b.depth - a.depth);
      const nearStars = projected.filter((entry) => entry.depth <= planetDepth).sort((a, b) => b.depth - a.depth);

      strokeRing(ring, true, planetDepth, 0.4);
      drawDust(true, planetDepth, time);
      drawStars(farStars, time);
      drawPlanet();
      strokeRing(ring, false, planetDepth, 0.9);
      drawDust(false, planetDepth, time);
      drawStars(nearStars, time);
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
        hoverId = hit ? hit.memoryId : null;
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
        const hit = hitTest(point.x, point.y);
        selectRef.current(hit ? hit.memoryId : null);
      }
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
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
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
        aria-label="Universe scene with your central planet and memory stars. Arrow keys rotate the view, plus and minus zoom, and the star list below opens each memory."
      />
      <div className="scene-controls">
        <button type="button" aria-label="Zoom in" onClick={() => apiRef.current?.zoomIn()}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => apiRef.current?.zoomOut()}>-</button>
        <button type="button" onClick={() => apiRef.current?.reset()}>Reset view</button>
      </div>
    </div>
  );
}

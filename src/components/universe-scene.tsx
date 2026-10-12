"use client";

import { useEffect, useRef } from "react";

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
};

type Props = {
  stars: SceneStar[];
  selectedId: string | null;
  onSelect: (memoryId: string | null) => void;
};

const MIN_DIST = 115;
const MAX_DIST = 320;
const START_DIST = 175;
const START_YAW = 0.65;
const START_PITCH = -0.22;

type BackgroundStar = { x: number; y: number; z: number; size: number; alpha: number };

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
      size: 0.6 + (((i * 37) % 13) / 13) * 1.1,
      alpha: 0.16 + (((i * 53) % 17) / 17) * 0.4,
    });
  }
  return stars;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function UniverseScene({ stars, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef(stars);
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);
  const apiRef = useRef<{ zoomIn: () => void; zoomOut: () => void; reset: () => void } | null>(
    null,
  );
  useEffect(() => {
    starsRef.current = stars;
    selectedRef.current = selectedId;
    selectRef.current = onSelect;
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
    const background = makeBackgroundStars(170);
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

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
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
        r: Math.max(1.6, star.scale * 1.15 * (f / point.depth)),
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
      for (const bg of background) {
        const point = projectPoint(bg.x, bg.y, bg.z, 0.75, 520);
        if (!point) continue;
        ctx.globalAlpha = bg.alpha;
        ctx.fillStyle = "#c8d4ee";
        ctx.beginPath();
        ctx.arc(point.x, point.y, bg.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawPlanet = () => {
      const point = projectPoint(0, 0, 0, 1, 0);
      if (!point) return;
      const radius = (16 * focal()) / cam.dist;
      const glow = ctx.createRadialGradient(
        point.x,
        point.y,
        radius * 0.6,
        point.x,
        point.y,
        radius * 1.9,
      );
      glow.addColorStop(0, "rgba(86, 122, 182, 0.3)");
      glow.addColorStop(1, "rgba(86, 122, 182, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 1.9, 0, Math.PI * 2);
      ctx.fill();
      const body = ctx.createRadialGradient(
        point.x - radius * 0.35,
        point.y - radius * 0.4,
        radius * 0.1,
        point.x,
        point.y,
        radius,
      );
      body.addColorStop(0, "#4d6fa5");
      body.addColorStop(0.55, "#24395e");
      body.addColorStop(1, "#0b1526");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(158, 186, 229, 0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawLabel = (x: number, y: number, text: string) => {
      const padX = 7;
      const boxHeight = 20;
      ctx.font = "13px Arial, Helvetica, sans-serif";
      const textWidth = ctx.measureText(text).width;
      const boxWidth = textWidth + padX * 2;
      const bx = clamp(x - boxWidth / 2, 4, width - boxWidth - 4);
      const by = clamp(y - boxHeight - 8, 4, height - boxHeight - 4);
      ctx.fillStyle = "rgba(7, 13, 26, 0.88)";
      ctx.strokeStyle = "rgba(72, 86, 109, 0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(bx, by, boxWidth, boxHeight);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f3d7c2";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx + padX, by + boxHeight / 2);
    };

    const drawStars = (time: number) => {
      const projected = starsRef.current
        .map((star) => projectStar(star))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort((a, b) => b.depth - a.depth);

      for (const entry of projected) {
        const { star, x, y, r } = entry;
        const twinkle = reducedMotion.matches
          ? 0
          : Math.sin(time / 900 + star.rotation * 7) * 0.07;
        const alpha = clamp(star.brightness + twinkle, 0.05, 1);

        const glowRadius = star.bright ? r * 5 : r * 3.4;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        glow.addColorStop(
          0,
          star.bright
            ? `rgba(255, 226, 166, ${alpha * 0.55})`
            : `rgba(255, 244, 226, ${alpha * 0.4})`,
        );
        glow.addColorStop(1, "rgba(255, 244, 226, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = star.bright
          ? `rgba(255, 227, 170, ${alpha})`
          : `rgba(255, 245, 235, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        if (star.bright) {
          ctx.strokeStyle = `rgba(255, 227, 170, ${alpha * 0.45})`;
          ctx.lineWidth = 1;
          const spike = r * 2.6;
          ctx.beginPath();
          ctx.moveTo(x - spike, y);
          ctx.lineTo(x + spike, y);
          ctx.moveTo(x, y - spike);
          ctx.lineTo(x, y + spike);
          ctx.stroke();
        }

        if (star.memoryId === selectedRef.current) {
          ctx.strokeStyle = "rgba(243, 215, 194, 0.9)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (star.memoryId === hoverId) {
          drawLabel(x, y - r, star.title);
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
      drawPlanet();
      drawStars(time);
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

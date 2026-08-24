"use client";

import { useEffect, useReducer, useRef } from "react";

const flySwarmEvent = "mutatio:toggle-fly-swarm";

type SwarmState = { mode: "hidden" | "flying" | "leaving"; run: number };
type SwarmFly = {
  controlAX: number;
  controlAY: number;
  controlBX: number;
  controlBY: number;
  endX: number;
  endY: number;
  finished: boolean;
  phase: number;
  segmentDuration: number;
  segmentStartedAt: number;
  size: number;
  startX: number;
  startY: number;
  wave: number;
};

export function triggerFlySwarm() {
  window.dispatchEvent(new Event(flySwarmEvent));
}

function swarmReducer(state: SwarmState, action: "toggle" | "complete"): SwarmState {
  if (action === "complete") return { ...state, mode: "hidden" };
  if (state.mode === "hidden") return { mode: "flying", run: state.run + 1 };
  if (state.mode === "flying") return { ...state, mode: "leaving" };
  return state;
}

export function FlySwarmLayer() {
  const [state, dispatch] = useReducer(swarmReducer, { mode: "hidden", run: 0 });

  useEffect(() => {
    const toggle = () => dispatch("toggle");
    window.addEventListener(flySwarmEvent, toggle);
    return () => window.removeEventListener(flySwarmEvent, toggle);
  }, []);

  return <FlySwarm run={state.run} leaving={state.mode === "leaving"} onExitComplete={() => dispatch("complete")} />;
}

function FlySwarm({ run, leaving, onExitComplete }: { run: number; leaving: boolean; onExitComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const leavingRef = useRef(leaving);
  const onExitCompleteRef = useRef(onExitComplete);

  useEffect(() => {
    leavingRef.current = leaving;
    onExitCompleteRef.current = onExitComplete;
    if (leaving && window.matchMedia("(prefers-reduced-motion: reduce)").matches) onExitComplete();
  }, [leaving, onExitComplete]);

  useEffect(() => {
    const sprite = new Image();
    sprite.decoding = "async";
    sprite.src = "/mutatio-fly-swarm.png";
    spriteRef.current = sprite;
    return () => { spriteRef.current = null; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sprite = spriteRef.current;
    if (!run || !canvas || !sprite || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let mounted = true;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const start = () => {
      if (!mounted) return;
      resize();
      window.addEventListener("resize", resize);
      const pointOutside = (edge: number, size: number): [number, number] => {
        if (edge === 0) return [Math.random() * width, -size];
        if (edge === 1) return [width + size, Math.random() * height];
        if (edge === 2) return [Math.random() * width, height + size];
        return [-size, Math.random() * height];
      };
      const minimumFlySize = width <= 620 ? 22 : 18;
      const startedAt = performance.now();
      const flies: SwarmFly[] = Array.from({ length: Math.min(180, Math.max(96, Math.round(width / 8))) }, (_, index) => {
        const size = Math.min(45, Math.max(minimumFlySize, width * (0.02 + Math.random() * 0.015)));
        const [startX, startY] = pointOutside(index % 4, size);
        const endX = width * (0.05 + Math.random() * 0.9);
        const endY = height * (0.05 + Math.random() * 0.9);
        const endGuideX = width * (0.05 + Math.random() * 0.9);
        const endGuideY = height * (0.05 + Math.random() * 0.9);
        return {
          controlAX: width * (0.05 + Math.random() * 0.9),
          controlAY: height * (0.05 + Math.random() * 0.9),
          controlBX: endX + (endGuideX - endX) * 0.35,
          controlBY: endY + (endGuideY - endY) * 0.35,
          endX,
          endY,
          finished: false,
          phase: Math.random() * Math.PI * 2,
          segmentDuration: 2_000 + Math.random() * 1_600,
          segmentStartedAt: startedAt + Math.random() * 320,
          size,
          startX,
          startY,
          wave: 12 + Math.random() * 34,
        };
      });
      let lastRenderedAt = 0;
      let exitStarted = false;
      let exitCompleted = false;

      const retarget = (fly: SwarmFly, now: number) => {
        const tangentX = fly.endX - fly.controlBX;
        const tangentY = fly.endY - fly.controlBY;
        fly.startX = fly.endX;
        fly.startY = fly.endY;
        fly.controlAX = fly.startX + tangentX;
        fly.controlAY = fly.startY + tangentY;
        fly.endX = width * (0.05 + Math.random() * 0.9);
        fly.endY = height * (0.05 + Math.random() * 0.9);
        const endGuideX = width * (0.05 + Math.random() * 0.9);
        const endGuideY = height * (0.05 + Math.random() * 0.9);
        fly.controlBX = fly.endX + (endGuideX - fly.endX) * 0.35;
        fly.controlBY = fly.endY + (endGuideY - fly.endY) * 0.35;
        fly.segmentDuration = 1_800 + Math.random() * 2_200;
        fly.segmentStartedAt = now;
      };

      const sampleFly = (fly: SwarmFly, now: number) => {
        const progress = Math.min(1, Math.max(0, (now - fly.segmentStartedAt) / fly.segmentDuration));
        const inverse = 1 - progress;
        return {
          dx: 3 * inverse ** 2 * (fly.controlAX - fly.startX) + 6 * inverse * progress * (fly.controlBX - fly.controlAX) + 3 * progress ** 2 * (fly.endX - fly.controlBX),
          dy: 3 * inverse ** 2 * (fly.controlAY - fly.startY) + 6 * inverse * progress * (fly.controlBY - fly.controlAY) + 3 * progress ** 2 * (fly.endY - fly.controlBY),
          x: inverse ** 3 * fly.startX + 3 * inverse ** 2 * progress * fly.controlAX + 3 * inverse * progress ** 2 * fly.controlBX + progress ** 3 * fly.endX,
          y: inverse ** 3 * fly.startY + 3 * inverse ** 2 * progress * fly.controlAY + 3 * inverse * progress ** 2 * fly.controlBY + progress ** 3 * fly.endY,
        };
      };

      const beginExit = (fly: SwarmFly, now: number, edge: number) => {
        const current = sampleFly(fly, now);
        const velocity = Math.hypot(current.dx, current.dy) || 1;
        const directionX = current.dx / velocity;
        const directionY = current.dy / velocity;
        fly.startX = current.x;
        fly.startY = current.y;
        const lead = Math.min(120, Math.max(36, Math.min(width, height) * 0.1));
        fly.controlAX = current.x + directionX * lead;
        fly.controlAY = current.y + directionY * lead;
        if (edge === 0 || edge === 2) {
          fly.endY = edge === 0 ? -fly.size : height + fly.size;
          fly.endX = Math.min(width, Math.max(0, current.x + (Math.random() - 0.5) * width * 0.55));
        } else {
          fly.endX = edge === 1 ? width + fly.size : -fly.size;
          fly.endY = Math.min(height, Math.max(0, current.y + (Math.random() - 0.5) * height * 0.55));
        }
        const exitDistance = Math.hypot(fly.endX - current.x, fly.endY - current.y);
        const exitDirectionX = (fly.endX - current.x) / exitDistance;
        const exitDirectionY = (fly.endY - current.y) / exitDistance;
        fly.controlBX = fly.endX - exitDirectionX * Math.min(150, exitDistance * 0.28);
        fly.controlBY = fly.endY - exitDirectionY * Math.min(150, exitDistance * 0.28);
        fly.segmentDuration = Math.min(2_800, Math.max(900, exitDistance / 0.32));
        fly.segmentStartedAt = now;
        fly.finished = false;
      };

      const render = (now: number) => {
        if (now - lastRenderedAt < 1_000 / 30) {
          animationFrame = window.requestAnimationFrame(render);
          return;
        }
        lastRenderedAt = now;
        context.clearRect(0, 0, width, height);
        if (leavingRef.current && !exitStarted) {
          exitStarted = true;
          for (const [index, fly] of flies.entries()) beginExit(fly, now, index % 4);
        }

        for (const fly of flies) {
          if (fly.finished || now < fly.segmentStartedAt) continue;
          if (now - fly.segmentStartedAt >= fly.segmentDuration) {
            if (exitStarted) {
              fly.finished = true;
              continue;
            }
            retarget(fly, now);
          }
          const { x, y, dx, dy } = sampleFly(fly, now);
          const velocity = Math.hypot(dx, dy) || 1;
          const wiggle = Math.sin(now * 0.008 + fly.phase) * fly.wave;
          context.save();
          context.translate(x - (dy / velocity) * wiggle, y + (dx / velocity) * wiggle);
          context.rotate(Math.atan2(dy, dx) - Math.PI);
          const spriteHeight = fly.size * (sprite.naturalHeight / sprite.naturalWidth);
          context.drawImage(sprite, -fly.size / 2, -spriteHeight / 2, fly.size, spriteHeight);
          context.restore();
        }

        if (exitStarted && flies.every((fly) => fly.finished)) {
          context.clearRect(0, 0, width, height);
          if (!exitCompleted) {
            exitCompleted = true;
            onExitCompleteRef.current();
          }
          return;
        }
        animationFrame = window.requestAnimationFrame(render);
      };

      animationFrame = window.requestAnimationFrame(render);
    };

    if (sprite.complete && sprite.naturalWidth) start();
    else sprite.addEventListener("load", start, { once: true });

    return () => {
      mounted = false;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      sprite.removeEventListener("load", start);
      context.clearRect(0, 0, width, height);
    };
  }, [run]);

  return <canvas ref={canvasRef} className="fly-swarm" aria-hidden="true" />;
}

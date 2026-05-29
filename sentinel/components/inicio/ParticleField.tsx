"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Fondo sutil tipo "red neuronal": nodos que derivan lentamente y se conectan
 * con líneas cuando están cerca. Pensado para ir detrás del contenido del inicio.
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let raf = 0;
    const COUNT = 48;
    const LINK_DIST = 150;
    const nodes: Node[] = Array.from({ length: COUNT }, () => ({ x: 0, y: 0, vx: 0, vy: 0 }));

    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    const seed = () => {
      for (const n of nodes) {
        n.x = Math.random() * W;
        n.y = Math.random() * H;
        n.vx = (Math.random() - 0.5) * 0.28;
        n.vy = (Math.random() - 0.5) * 0.28;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            const alpha = 0.14 * (1 - d / LINK_DIST);
            ctx.strokeStyle = `rgba(91,140,255,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (let i = 0; i < COUNT; i++) {
        const n = nodes[i];
        ctx.fillStyle = i % 5 === 0 ? "rgba(155,124,255,0.55)" : "rgba(123,162,255,0.5)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, i % 7 === 0 ? 2.6 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      resize();
      seed();
    };

    resize();
    seed();
    draw();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.55,
        filter: "blur(0.4px)",
        pointerEvents: "none",
      }}
    />
  );
}

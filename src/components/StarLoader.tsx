"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  opacity: number;
  speed: number;
  size: number;
}

interface Connection {
  a: number;
  b: number;
  opacity: number;
}

export default function StarLoader({ label = "Mapping the stars..." }: { label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const NUM_STARS = 60;
    const stars: Star[] = Array.from({ length: NUM_STARS }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      opacity: Math.random(),
      speed: 0.003 + Math.random() * 0.007,
      size: 0.5 + Math.random() * 1.5,
    }));

    const connections: Connection[] = [];
    // Pre-compute nearby pairs
    for (let i = 0; i < NUM_STARS; i++) {
      for (let j = i + 1; j < NUM_STARS; j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          connections.push({ a: i, b: j, opacity: 0 });
        }
      }
    }

    let tick = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      tick += 0.5;

      // Animate star opacities
      stars.forEach((star) => {
        star.opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(tick * star.speed * 10));
      });

      // Draw connections
      connections.forEach((conn) => {
        const sa = stars[conn.a];
        const sb = stars[conn.b];
        const avgOp = (sa.opacity + sb.opacity) / 2;
        conn.opacity = avgOp * 0.3;
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.strokeStyle = `rgba(255,255,255,${conn.opacity})`;
        ctx.lineWidth = 0.3;
        ctx.stroke();
      });

      // Draw stars
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.opacity})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "200px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <p
        style={{
          position: "relative",
          fontFamily: "'Inter', sans-serif",
          fontSize: "10px",
          fontWeight: 300,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#888888",
          marginTop: "8px",
        }}
      >
        {label}
      </p>
    </div>
  );
}

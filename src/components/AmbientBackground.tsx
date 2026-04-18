"use client";

import { useEffect, useRef } from "react";

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;

    canvas.width = W;
    canvas.height = H;

    // Purple-tinted star palette — no cyan
    const starColors = [
      "220,215,255", // slight purple-white
      "200,185,255", // soft violet
      "215,205,255", // pale lavender
      "210,200,255", // soft purple
    ];

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.2 + Math.random() * 1.0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.007,
      dx: (Math.random() - 0.5) * 0.04,
      dy: (Math.random() - 0.5) * 0.04,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    let tick = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      tick += 1;

      for (const s of stars) {
        s.x += s.dx;
        s.y += s.dy;
        if (s.x < -2) s.x = W + 2;
        if (s.x > W + 2) s.x = -2;
        if (s.y < -2) s.y = H + 2;
        if (s.y > H + 2) s.y = -2;

        const a = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(tick * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color},${a})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      {/* Star field canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.65,
        }}
      />
      {/* ZORI atmospheric orbs — always present as the base ambient layer */}
      <div
        style={{
          position: "fixed",
          top: "-15%",
          left: "-12%",
          width: "620px",
          height: "620px",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 68%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          animation: "orbFloat 20s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-12%",
          right: "-15%",
          width: "540px",
          height: "540px",
          background:
            "radial-gradient(circle, rgba(196,127,255,0.09) 0%, transparent 68%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          animation: "orbFloat2 24s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "35%",
          right: "5%",
          width: "380px",
          height: "380px",
          background:
            "radial-gradient(circle, rgba(255,94,214,0.06) 0%, transparent 68%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          animation: "orbFloat3 16s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </>
  );
}

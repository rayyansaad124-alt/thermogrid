import { useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme';

interface TrailDot {
  x: number;
  y: number;
  born: number;
}

const FADE_DURATION = 1200;
const MAX_DOTS = 40;
const DOT_RADIUS = 4;

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<TrailDot[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const lastMoveRef = useRef(0);
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastMoveRef.current < 16) return;
      lastMoveRef.current = now;

      dotsRef.current.push({ x: e.clientX, y: e.clientY, born: now });
      if (dotsRef.current.length > MAX_DOTS) {
        dotsRef.current.shift();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const render = () => {
      const now = performance.now();
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      const dots = dotsRef.current;
      while (dots.length > 0 && now - dots[0].born > FADE_DURATION) {
        dots.shift();
      }

      const isDark = themeRef.current === 'dark';

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const age = now - dot.born;
        const lifeRatio = age / FADE_DURATION;

        if (lifeRatio >= 1) continue;

        const fade = 1 - lifeRatio;
        const radius = DOT_RADIUS * (1 - lifeRatio * 0.5);

        if (isDark) {
          // Silverish/glowing white for dark mode
          const opacity = fade * 0.8;
          const lightness = 72 + fade * 18; // 72% → 90% as it's fresher
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(210, 15%, ${lightness}%, ${opacity})`;
          ctx.shadowColor = `hsla(210, 30%, 85%, ${opacity * 0.9})`;
          ctx.shadowBlur = 10;
          ctx.fill();
        } else {
          // Blackish for light mode
          const opacity = fade * 0.55;
          const lightness = 12 + lifeRatio * 8; // dark, gets slightly lighter as it fades
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(220, 10%, ${lightness}%, ${opacity})`;
          ctx.shadowColor = `hsla(220, 10%, 20%, ${opacity * 0.5})`;
          ctx.shadowBlur = 6;
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' }}
    />
  );
}

import React, { useEffect, useRef } from 'react';

export default function HexBackground({ color, isRgbFlow, clearRadius }: { color: string, isRgbFlow: boolean, clearRadius: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    const render = () => {
      const w = canvas.width = window.innerWidth;
      const h = canvas.height = window.innerHeight;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      const HEX_RADIUS = 20;
      const HEX_GAP = 2;
      const horizStep = Math.sqrt(3) * (HEX_RADIUS + HEX_GAP);
      const vertStep = 1.5 * (HEX_RADIUS + HEX_GAP);
      const cols = Math.ceil(w / horizStep) + 2;
      const rows = Math.ceil(h / vertStep) + 2;
      const cx = w / 2;
      const cy = h / 2;

      const time = Date.now();

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let x = col * horizStep;
          if (row % 2 === 1) x += horizStep / 2;
          const y = row * vertStep;

          const dx = Math.abs(x - cx);
          const dy = Math.abs(y - cy);
          const dist = Math.max(dy, dx * 0.866 + dy * 0.5);

          if (dist < clearRadius) continue;

          const delay = dist * 5;
          const t = ((time - delay) % 2000) / 2000;
          const scale = Math.max(0.01, Math.abs(Math.cos(t * Math.PI)));
          const fade = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;

          ctx.beginPath();
          const r = HEX_RADIUS * scale;
          for (let i = 0; i < 6; i++) {
            const angle = (60 * i + 30) * Math.PI / 180;
            const px = x + r * Math.cos(angle);
            const py = y + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          if (isRgbFlow) {
            ctx.fillStyle = `hsla(${(time / 10 + dist) % 360}, 100%, 50%, ${fade})`;
          } else {
            ctx.fillStyle = color;
            ctx.globalAlpha = fade * 0.5;
          }
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [color, isRgbFlow, clearRadius]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

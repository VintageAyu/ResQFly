import React, { useEffect, useRef } from 'react';

interface TerminalOverlayProps {
  color?: string;
  heavyGlitch?: boolean;
  rgbBorders?: boolean;
  isMobile?: boolean;
}

export const TerminalOverlay: React.FC<TerminalOverlayProps> = ({ 
  color = 'rgb(255, 50, 50)', 
  heavyGlitch = false, 
  rgbBorders = false,
  isMobile = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = Date.now();

    const drawPath = (ctx: CanvasRenderingContext2D, pts: {x: number, y: number}[], close = true) => {
      if (pts.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      if (close) ctx.closePath();
    };

    const render = () => {
      const w = canvas.width = window.innerWidth;
      const h = canvas.height = window.innerHeight;
      
      if (w === 0 || h === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const t = (Date.now() - startTime) / 1000;

      let r = 255, g = 50, b = 50;
      if (rgbBorders) {
        const hue = (t * 50) % 360;
        const c = 1;
        const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
        const m = 0;
        let r1 = 0, g1 = 0, b1 = 0;
        if (hue >= 0 && hue < 60) { r1 = c; g1 = x; b1 = 0; }
        else if (hue >= 60 && hue < 120) { r1 = x; g1 = c; b1 = 0; }
        else if (hue >= 120 && hue < 180) { r1 = 0; g1 = c; b1 = x; }
        else if (hue >= 180 && hue < 240) { r1 = 0; g1 = x; b1 = c; }
        else if (hue >= 240 && hue < 300) { r1 = x; g1 = 0; b1 = c; }
        else if (hue >= 300 && hue < 360) { r1 = c; g1 = 0; b1 = x; }
        r = Math.round((r1 + m) * 255);
        g = Math.round((g1 + m) * 255);
        b = Math.round((b1 + m) * 255);
      } else {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          r = parseInt(match[1]);
          g = parseInt(match[2]);
          b = parseInt(match[3]);
        }
      }

      const sx = w / 1000.0;
      const sy = h / 640.0;
      const p = (x: number, y: number) => ({ x: x * sx, y: y * sy });

      const path = [
        p(980, 100), p(980, 370), p(995, 385), p(995, 485), p(980, 500), p(980, 560), p(960, 580), p(740, 580), p(720, 595), p(280, 595), p(260, 580), p(40, 580), p(20, 560), p(20, 525), p(40, 505), p(40, 160), p(20, 140), p(20, 80), p(40, 60), p(40, 20), p(120, 20), p(140, 40), p(730, 40), p(750, 60), p(780, 60), p(800, 80), p(960, 80), p(980, 100)
      ];
      
      const inner_base = [
        p(50, 110), p(50, 525), p(60, 535), p(250, 535), p(260, 545), p(740, 545), p(750, 535), p(940, 535), p(950, 525), p(950, 110), p(940, 100), p(790, 100), p(775, 85), p(140, 85), p(125, 100), p(60, 100), p(50, 110)
      ];

      const bottom_greeble = [p(55, 565), p(255, 565), p(270, 580), p(450, 580), p(455, 585), p(445, 595), p(290, 595), p(280, 580), p(55, 580), p(45, 572), p(55, 565)];
      const top_greeble_1 = [p(80, 55), p(295, 55), p(310, 40), p(490, 40), p(495, 35), p(485, 25), p(330, 25), p(320, 40), p(80, 40), p(55, 40), p(45, 50), p(55, 55), p(80, 55)];
      const top_greeble_2 = [p(580, 40), p(732, 40), p(752, 60), p(782, 60), p(805, 80), p(790, 85), p(770, 68), p(745, 68), p(725, 50), p(580, 50), p(570, 40)];
      const br_greeble = [p(750, 580), p(940, 580), p(950, 560), p(950, 550), p(930, 550), p(920, 560), p(770, 560), p(760, 570), p(750, 580)];
      const bc_greeble = [p(490, 595), p(720, 595), p(700, 615), p(505, 615), p(485, 605), p(490, 595)];

      ctx.clearRect(0, 0, w, h);

      // Inner base background
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
      drawPath(ctx, inner_base);
      ctx.fill();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Main border
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
      ctx.lineWidth = 12;
      drawPath(ctx, path);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      ctx.lineWidth = 3;
      drawPath(ctx, path);
      ctx.stroke();

      // Flow animation
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 5;
      ctx.setLineDash([30, 60]);
      ctx.lineDashOffset = -t * 100;
      drawPath(ctx, path);
      ctx.stroke();
      ctx.setLineDash([]);

      const getBoundingBox = (pts: {x: number, y: number}[]) => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        pts.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
      };

      // Greebles (Solid with 3D effect and shadow)
      const greebles = [bottom_greeble, top_greeble_1, top_greeble_2, br_greeble, bc_greeble];
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      greebles.forEach(greeblePts => {
        if (greeblePts.length === 0) return;
        const rect = getBoundingBox(greeblePts);
        if (!isFinite(rect.width) || !isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return;

        // 1. Drop Shadow
        ctx.save();
        ctx.translate(4, 4);
        ctx.fillStyle = `rgba(0, 0, 0, 0.6)`;
        drawPath(ctx, greeblePts);
        ctx.fill();
        ctx.restore();

        // 2. Gradient Body Fill
        const pulse_factor = (Math.sin(t * 4) + 1) / 2;
        const grad = ctx.createLinearGradient(rect.minX, rect.minY, rect.maxX, rect.maxY);
        
        const r1 = Math.round(Math.min(255, r + 50 * pulse_factor));
        const g1 = Math.round(Math.min(255, g + 50 * pulse_factor));
        const b1 = Math.round(Math.min(255, b + 50 * pulse_factor));
        
        const r2 = Math.round(r * 0.25);
        const g2 = Math.round(g * 0.25);
        const b2 = Math.round(b * 0.25);
        
        const rMid = Math.round(r * 0.7);
        const gMid = Math.round(g * 0.7);
        const bMid = Math.round(b * 0.7);

        grad.addColorStop(0.0, `rgba(${r1}, ${g1}, ${b1}, 0.9)`);
        grad.addColorStop(0.6, `rgba(${rMid}, ${gMid}, ${bMid}, 0.9)`);
        grad.addColorStop(1.0, `rgba(${r2}, ${g2}, ${b2}, 0.9)`);
        
        ctx.fillStyle = grad;
        drawPath(ctx, greeblePts);
        ctx.fill();

        // 3. Gradient Stroke (Bevel)
        const border_grad = ctx.createLinearGradient(rect.minX, rect.minY, rect.maxX, rect.maxY);
        border_grad.addColorStop(0.0, `rgba(255, 255, 255, 1)`);
        border_grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 1)`);
        border_grad.addColorStop(1.0, `rgba(${Math.round(r * 0.15)}, ${Math.round(g * 0.15)}, ${Math.round(b * 0.15)}, 1)`);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = border_grad;
        ctx.lineJoin = 'miter';
        drawPath(ctx, greeblePts);
        ctx.stroke();

        // 4. Gloss/Sheen (Top half overlay)
        ctx.save();
        drawPath(ctx, greeblePts);
        ctx.clip();
        const gloss_grad = ctx.createLinearGradient(rect.minX, rect.minY, rect.minX, rect.maxY);
        gloss_grad.addColorStop(0, `rgba(255, 255, 255, 0.15)`);
        gloss_grad.addColorStop(0.5, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = gloss_grad;
        ctx.fillRect(rect.minX, rect.minY, rect.width, rect.height);
        ctx.restore();

        // Greeble Glitch Effect
        const glitchChance = heavyGlitch ? 0.7 : 0.95;
        if (Math.random() > glitchChance) {
          ctx.save();
          const dx = (Math.random() - 0.5) * 10;
          const dy = (Math.random() - 0.5) * 4;
          ctx.translate(dx, dy);
          
          // Cyan glitch
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.translate((Math.random() - 0.5) * 20, 0);
          ctx.fillStyle = `rgba(0, 255, 255, 0.6)`;
          drawPath(ctx, greeblePts);
          ctx.fill();
          ctx.restore();
          
          // Magenta glitch
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.translate((Math.random() - 0.5) * 20, 0);
          ctx.fillStyle = `rgba(255, 0, 255, 0.6)`;
          drawPath(ctx, greeblePts);
          ctx.fill();
          ctx.restore();
          
          // Slices
          const numSlices = Math.floor(Math.random() * 5) + 3;
          for (let i = 0; i < numSlices; i++) {
            const sliceH = Math.random() * 45 + 5;
            const sliceY = Math.random() * h;
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, sliceY, w, sliceH);
            ctx.clip();
            const shiftX = (Math.random() - 0.5) * 40;
            ctx.translate(shiftX, 0);
            ctx.fillStyle = Math.random() > 0.8 ? 'rgba(255,255,255,1)' : `rgba(${r},${g},${b},1)`;
            drawPath(ctx, greeblePts);
            ctx.fill();
            ctx.restore();
          }
          
          ctx.restore();
        }
      });

      // Glitch rects
      const glitch_alpha = (t % 1.5 > 0.8) ? 0.8 : 0.15;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${glitch_alpha})`;
      ctx.fillRect(23 * sx, 110 * sy, 10 * sx, 3 * sy);
      ctx.fillRect(23 * sx, 145 * sy, 12 * sx, 4 * sy);

      // Dash line
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(p(965, 380).x, p(965, 380).y);
      ctx.lineTo(p(965, 200).x, p(965, 200).y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Small rects
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      ctx.fillRect(400 * sx, 28 * sy, 4 * sx, 4 * sy);
      ctx.fillRect(412 * sx, 28 * sy, 4 * sx, 4 * sy);
      ctx.fillRect(424 * sx, 28 * sy, 4 * sx, 4 * sy);

      // Status dot
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      ctx.beginPath();
      ctx.arc(p(820, 48).x, p(820, 48).y, 4 * sx, 0, Math.PI * 2);
      ctx.fill();

      // Global heavy glitch effect
      if (heavyGlitch && Math.random() > 0.85) {
        const sliceY = Math.floor(Math.random() * h);
        const sliceH = Math.floor(Math.random() * 50 + 10);
        const sliceOffset = Math.floor((Math.random() - 0.5) * 30);
        
        try {
          const imgData = ctx.getImageData(0, sliceY, w, sliceH);
          ctx.clearRect(0, sliceY, w, sliceH);
          ctx.putImageData(imgData, sliceOffset, sliceY);
          
          ctx.fillStyle = `rgba(255, 0, 0, 0.3)`;
          ctx.fillRect(sliceOffset - 5, sliceY, w, sliceH);
          ctx.fillStyle = `rgba(0, 255, 255, 0.3)`;
          ctx.fillRect(sliceOffset + 5, sliceY, w, sliceH);
        } catch (e) {
          // Ignore cross-origin errors if any
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, heavyGlitch, rgbBorders]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
    />
  );
};

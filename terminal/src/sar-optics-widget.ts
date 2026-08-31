// =============================================================================
// RESQFLY CONSOLE — SAR OPTICS / THERMAL WIDGET (TypeScript Port)
// =============================================================================

import type { TelemetryData } from './types';

export function drawOpticsWidget(ctx: CanvasRenderingContext2D, w: number, h: number, telem: TelemetryData): void {
  const t = performance.now() / 1000;

  ctx.fillStyle = 'rgb(4,4,6)';
  ctx.fillRect(0, 0, w, h);

  const halfW = w / 2;
  const margin = 6;

  // LEFT: Visible Camera Feed (simulated)
  drawBorderedRect(ctx, margin, margin, halfW - margin * 2, h - margin * 2, 'rgba(10,10,10,1)', 'rgba(80,18,24,0.63)');
  ctx.font = 'bold 9px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.textAlign = 'center';
  ctx.fillText('VISIBLE SPECTRUM • 4K HDR', halfW / 2, margin + 18);

  // Simulated camera static
  const cx = halfW / 2;
  const cy = (h - margin * 2) / 2 + margin;
  ctx.fillStyle = 'rgba(20,20,20,1)';
  ctx.fillRect(margin + 4, margin + 26, halfW - margin * 2 - 8, h - margin * 2 - 30);

  // Grid overlay
  ctx.strokeStyle = 'rgba(0,245,255,0.1)';
  ctx.lineWidth = 0.5;
  for (let gx = margin + 4; gx < halfW - margin; gx += 30) {
    ctx.beginPath(); ctx.moveTo(gx, margin + 26); ctx.lineTo(gx, h - margin); ctx.stroke();
  }
  for (let gy = margin + 26; gy < h - margin; gy += 30) {
    ctx.beginPath(); ctx.moveTo(margin + 4, gy); ctx.lineTo(halfW - margin - 4, gy); ctx.stroke();
  }

  // Center crosshair
  ctx.strokeStyle = 'rgba(255,35,50,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy); ctx.lineTo(cx - 8, cy);
  ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 30, cy);
  ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy - 8);
  ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 30);
  ctx.stroke();

  // Ranging circles
  ctx.strokeStyle = 'rgba(255,35,50,0.15)';
  ctx.lineWidth = 1;
  for (const r of [60, 120]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  // Camera info
  ctx.font = '7px Consolas, monospace';
  ctx.fillStyle = 'rgb(0,255,157)';
  ctx.textAlign = 'left';
  ctx.fillText(`REC ● ${new Date().toLocaleTimeString()}`, margin + 10, h - margin - 10);
  ctx.textAlign = 'right';
  ctx.fillText(`ISO 400 • f/2.8 • 1/500s`, halfW - margin - 10, h - margin - 10);

  // RIGHT: Thermal / IR Feed
  const rightX = halfW + margin;
  const rightW = halfW - margin * 2;
  drawBorderedRect(ctx, rightX, margin, rightW, h - margin * 2, 'rgba(10,10,10,1)', 'rgba(80,18,24,0.63)');
  ctx.font = 'bold 9px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.textAlign = 'center';
  ctx.fillText('THERMAL INFRARED • FLIR', halfW + rightW / 2 + margin, margin + 18);

  // Thermal gradient background
  const thermalGrad = ctx.createLinearGradient(rightX, margin + 26, rightX, h - margin);
  thermalGrad.addColorStop(0, 'rgb(0,0,40)');
  thermalGrad.addColorStop(0.3, 'rgb(30,0,80)');
  thermalGrad.addColorStop(0.6, 'rgb(100,0,100)');
  thermalGrad.addColorStop(0.8, 'rgb(200,50,0)');
  thermalGrad.addColorStop(1, 'rgb(255,200,0)');
  ctx.fillStyle = thermalGrad;
  ctx.fillRect(rightX + 4, margin + 26, rightW - 8, h - margin * 2 - 30);

  // Simulated heat spots
  const numSpots = 5;
  for (let i = 0; i < numSpots; i++) {
    const sx = rightX + 30 + Math.sin(t * 0.3 + i * 2.5) * (rightW * 0.3);
    const sy = margin + 80 + Math.cos(t * 0.4 + i * 1.8) * (h * 0.25);
    const sr = 15 + Math.sin(t * 2 + i) * 5;

    const heatGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    heatGrad.addColorStop(0, 'rgba(255,255,200,0.6)');
    heatGrad.addColorStop(0.3, 'rgba(255,200,0,0.4)');
    heatGrad.addColorStop(0.7, 'rgba(255,50,0,0.2)');
    heatGrad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = heatGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Temperature scale
  const scaleX = rightX + rightW - 24;
  const scaleH = h * 0.5;
  const scaleY = margin + 40;
  const tempGrad = ctx.createLinearGradient(0, scaleY, 0, scaleY + scaleH);
  tempGrad.addColorStop(0, 'rgb(255,255,200)');
  tempGrad.addColorStop(0.3, 'rgb(255,100,0)');
  tempGrad.addColorStop(0.7, 'rgb(100,0,100)');
  tempGrad.addColorStop(1, 'rgb(0,0,40)');
  ctx.fillStyle = tempGrad;
  ctx.fillRect(scaleX, scaleY, 12, scaleH);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(scaleX, scaleY, 12, scaleH);

  ctx.font = '6px Consolas, monospace';
  ctx.fillStyle = 'rgb(245,240,242)';
  ctx.textAlign = 'left';
  ctx.fillText('50°C', scaleX + 16, scaleY + 6);
  ctx.fillText('25°C', scaleX + 16, scaleY + scaleH / 2);
  ctx.fillText('0°C', scaleX + 16, scaleY + scaleH - 2);

  // Detection overlay
  ctx.font = '7px Consolas, monospace';
  ctx.fillStyle = 'rgb(255,200,0)';
  ctx.textAlign = 'left';
  ctx.fillText(`DETECTIONS: ${numSpots} HEAT SIGNATURES`, rightX + 10, h - margin - 10);
}

function drawBorderedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

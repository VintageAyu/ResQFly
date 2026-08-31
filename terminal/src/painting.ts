// =============================================================================
// RESQFLY CONSOLE — PAINTING & RENDERING ENGINE (TypeScript Port)
// =============================================================================
// Replicates all QPainter-based rendering: hex background, cyberpunk border
// paths, greeble shapes, glow effects, glitch distortion, loading ring, and
// the intro sequence.
// =============================================================================

import type { AppState } from './types';
import { SandSimulation } from './sand-simulation';

const BG_COLOR = '#000000';
const HEX_COLOR_START = { r: 255, g: 0, b: 0 };
const HEX_COLOR_END = { r: 60, g: 0, b: 0 };

// Cache for the scaled path points (recomputed on resize)
let cachedW = 0;
let cachedH = 0;
let cachedOuterPath: { x: number; y: number }[] = [];
let cachedInnerPath: { x: number; y: number }[] = [];
let cachedIntroInnerPath: { x: number; y: number }[] = [];
let cachedGreebles: { x: number; y: number }[][] = [];
let cachedCorners: { x: number; y: number }[][] = [];

// Offscreen sand simulation
let sandSim: SandSimulation | null = null;

function p(x: number, y: number, sx: number, sy: number): { x: number; y: number } {
  return { x: x * sx, y: y * sy };
}

function buildPaths(w: number, h: number): void {
  if (cachedW === w && cachedH === h) return;
  cachedW = w;
  cachedH = h;

  const sx = w / 1000;
  const sy = h / 640;

  // Outer cyberpunk border path (exact replication of Python painting.py line 284)
  cachedOuterPath = [
    p(980, 100, sx, sy), p(980, 370, sx, sy), p(995, 385, sx, sy), p(995, 485, sx, sy),
    p(980, 500, sx, sy), p(980, 560, sx, sy), p(960, 580, sx, sy), p(740, 580, sx, sy),
    p(720, 595, sx, sy), p(280, 595, sx, sy), p(260, 580, sx, sy), p(40, 580, sx, sy),
    p(20, 560, sx, sy), p(20, 525, sx, sy), p(40, 505, sx, sy), p(40, 160, sx, sy),
    p(20, 140, sx, sy), p(20, 80, sx, sy), p(40, 60, sx, sy), p(40, 20, sx, sy),
    p(120, 20, sx, sy), p(140, 40, sx, sy), p(730, 40, sx, sy), p(750, 60, sx, sy),
    p(780, 60, sx, sy), p(800, 80, sx, sy), p(960, 80, sx, sy), p(980, 100, sx, sy),
  ];

  // Thin inner path during intro animation (creates a sleek, thin honeycomb border)
  cachedIntroInnerPath = [
    p(965, 110, sx, sy), p(965, 360, sx, sy), p(980, 375, sx, sy), p(980, 475, sx, sy),
    p(965, 490, sx, sy), p(965, 550, sx, sy), p(948, 565, sx, sy), p(735, 565, sx, sy),
    p(712, 580, sx, sy), p(288, 580, sx, sy), p(265, 565, sx, sy), p(52, 565, sx, sy),
    p(35, 550, sx, sy),  p(35, 515, sx, sy),  p(52, 495, sx, sy),  p(52, 170, sx, sy),
    p(35, 130, sx, sy),  p(35, 90, sx, sy),   p(52, 70, sx, sy),   p(52, 35, sx, sy),
    p(115, 35, sx, sy),  p(148, 55, sx, sy),  p(722, 55, sx, sy),  p(758, 75, sx, sy),
    p(775, 75, sx, sy),  p(808, 95, sx, sy),  p(948, 95, sx, sy),  p(965, 110, sx, sy),
  ];

  // Inner screen area path
  cachedInnerPath = [
    p(50, 110, sx, sy), p(50, 525, sx, sy), p(60, 535, sx, sy), p(250, 535, sx, sy),
    p(260, 545, sx, sy), p(740, 545, sx, sy), p(750, 535, sx, sy), p(940, 535, sx, sy),
    p(950, 525, sx, sy), p(950, 110, sx, sy), p(940, 100, sx, sy), p(790, 100, sx, sy),
    p(775, 85, sx, sy), p(140, 85, sx, sy), p(125, 100, sx, sy), p(60, 100, sx, sy),
    p(50, 110, sx, sy),
  ];

  // Greeble shapes
  const bottomGreeble = [
    p(55, 565, sx, sy), p(255, 565, sx, sy), p(270, 580, sx, sy), p(450, 580, sx, sy),
    p(455, 585, sx, sy), p(445, 595, sx, sy), p(290, 595, sx, sy), p(280, 580, sx, sy),
    p(55, 580, sx, sy), p(45, 572, sx, sy), p(55, 565, sx, sy),
  ];
  const topGreeble = [
    p(80, 55, sx, sy), p(295, 55, sx, sy), p(310, 40, sx, sy), p(490, 40, sx, sy),
    p(495, 35, sx, sy), p(485, 25, sx, sy), p(330, 25, sx, sy), p(320, 40, sx, sy),
    p(80, 40, sx, sy), p(55, 40, sx, sy), p(45, 50, sx, sy), p(55, 55, sx, sy),
    p(80, 55, sx, sy),
  ];
  const brGreeble = [
    p(750, 580, sx, sy), p(940, 580, sx, sy), p(950, 560, sx, sy), p(950, 550, sx, sy),
    p(930, 550, sx, sy), p(920, 560, sx, sy), p(770, 560, sx, sy), p(760, 570, sx, sy),
    p(750, 580, sx, sy),
  ];
  const bcGreeble = [
    p(490, 595, sx, sy), p(720, 595, sx, sy), p(700, 615, sx, sy), p(505, 615, sx, sy),
    p(485, 605, sx, sy), p(490, 595, sx, sy),
  ];
  const trStairs = [
    p(745, 68, sx, sy), p(775, 68, sx, sy), p(795, 88, sx, sy), p(950, 88, sx, sy),
    p(955, 93, sx, sy), p(792, 93, sx, sy), p(772, 73, sx, sy), p(740, 73, sx, sy),
  ];
  cachedGreebles = [bottomGreeble, topGreeble, brGreeble, bcGreeble, trStairs];

  // Corner accents
  const tlCorner = [
    p(120, 20, sx, sy), p(40, 20, sx, sy), p(40, 60, sx, sy), p(20, 80, sx, sy),
    p(20, 140, sx, sy), p(40, 160, sx, sy),
  ];
  const trCorner = [p(960, 80, sx, sy), p(980, 100, sx, sy), p(980, 150, sx, sy)];
  const blCorner = [
    p(40, 505, sx, sy), p(20, 525, sx, sy), p(20, 560, sx, sy), p(40, 580, sx, sy),
  ];
  const brCorner = [
    p(940, 580, sx, sy), p(960, 580, sx, sy), p(980, 560, sx, sy), p(980, 520, sx, sy),
  ];
  const rightBridge = [
    p(980, 500, sx, sy), p(995, 485, sx, sy), p(995, 385, sx, sy), p(980, 370, sx, sy),
  ];
  cachedCorners = [tlCorner, trCorner, blCorner, brCorner, rightBridge];
}

function drawPolygon(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

function drawPath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
}

// --- HEX BACKGROUND ---
export function drawHexBackground(ctx: CanvasRenderingContext2D, w: number, h: number,
  hexDrawRadius: number, hexClearRadius: number,
  hexSize: number = 12, hexGap: number = 1.5,
  isIntroActive: boolean = false, introTick: number = 0): void {
  const HEX_RADIUS = Math.max(4, hexSize);
  const HEX_GAP = Math.max(0, hexGap);
  const ANIMATION_DURATION = 2000;
  const RIPPLE_SPEED = 5;
  const currentTime = performance.now();
  const centerX = w / 2;
  const centerY = h / 2;

  const horizStep = Math.sqrt(3) * (HEX_RADIUS + HEX_GAP);
  const vertStep = 1.5 * (HEX_RADIUS + HEX_GAP);
  const cols = Math.floor(w / horizStep) + 2;
  const rows = Math.floor(h / vertStep) + 2;

  // 3-Cycle Center-to-Sides Expansion during intro (slower, smoother speed)
  const WAVE_TICKS = 140; // ~2.33s per pulse (3 pulses = 420 ticks / 7.0s total)
  const waveIdx = Math.floor(introTick / WAVE_TICKS);
  const in3Waves = isIntroActive && waveIdx < 3;
  const rawProgress = in3Waves ? (introTick % WAVE_TICKS) / WAVE_TICKS : 1.0;
  // Ease out cubic for responsive snap
  const waveProgress = in3Waves ? (1 - Math.pow(1 - rawProgress, 2.4)) : 1.0;
  const maxReach = w / 2 + 80;
  const currentSpread = in3Waves ? (waveProgress * maxReach) : (w / 2 + 100);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let xPos = col * horizStep;
      if (row % 2 === 1) xPos += horizStep / 2;
      const yPos = row * vertStep;

      const dx = Math.abs(xPos - centerX);
      const dy = Math.abs(yPos - centerY);

      if (isIntroActive) {
        // Expand from center half outwards to both sides
        if (in3Waves && dx > currentSpread) {
          continue; // Not reached yet in this pulse
        }
      } else {
        const distFromCenter = Math.max(dy, dx * 0.866 + dy * 0.5);
        if (distFromCenter > hexDrawRadius) continue;
        if (distFromCenter < hexClearRadius) continue;
      }

      const distFromCenter = isIntroActive ? dx : Math.max(dy, dx * 0.866 + dy * 0.5);
      const delay = distFromCenter * RIPPLE_SPEED;
      const timeInCycle = ((currentTime - delay) % ANIMATION_DURATION + ANIMATION_DURATION) % ANIMATION_DURATION;
      const t = timeInCycle / ANIMATION_DURATION;
      let scale = Math.abs(Math.cos(t * Math.PI));
      scale = Math.max(0.01, scale);

      const fadeFactor = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      let r = Math.floor(HEX_COLOR_START.r + (HEX_COLOR_END.r - HEX_COLOR_START.r) * fadeFactor);
      let g = Math.floor(HEX_COLOR_START.g + (HEX_COLOR_END.g - HEX_COLOR_START.g) * fadeFactor);
      let b = Math.floor(HEX_COLOR_START.b + (HEX_COLOR_END.b - HEX_COLOR_START.b) * fadeFactor);

      // Leading edge laser flare on the wavefront
      if (in3Waves) {
        const distToFront = currentSpread - dx;
        if (distToFront >= 0 && distToFront < 75) {
          const flare = 1 - distToFront / 75;
          scale = Math.min(1.0, 0.45 + 0.55 * flare);
          r = 255;
          g = Math.min(255, Math.floor(g + 200 * flare));
          b = Math.min(255, Math.floor(b + 200 * flare));
        }
      }

      const currentRadius = HEX_RADIUS * scale;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i + 30;
        const angleRad = angleDeg * Math.PI / 180;
        const px = xPos + currentRadius * Math.cos(angleRad);
        const py = yPos + currentRadius * Math.sin(angleRad);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();
    }
  }
}

// --- LOADING RING (3D projected dotted ring) ---
export function drawLoadingRing(ctx: CanvasRenderingContext2D, cx: number, cy: number,
  radius: number, rotX: number, rotY: number, rotZAnim: number): void {
  const numPoints = 30;
  const rz = rotZAnim * Math.PI / 180;
  const rx = rotX * Math.PI / 180;
  const ry = rotY * Math.PI / 180;

  const projected: { z: number; scale: number; sx: number; sy: number; idx: number }[] = [];

  for (let i = 0; i < numPoints; i++) {
    const theta = (i * 360 / numPoints) * Math.PI / 180;
    let px = radius * Math.cos(theta);
    let py = radius * Math.sin(theta);

    // Rotate Z
    const x1 = px * Math.cos(rz) - py * Math.sin(rz);
    const y1 = px * Math.sin(rz) + py * Math.cos(rz);
    const z1 = 0;
    // Rotate Y
    const x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
    const y2 = y1;
    const z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);
    // Rotate X
    const x3 = x2;
    const y3 = y2 * Math.cos(rx) - z2 * Math.sin(rx);
    const z3 = y2 * Math.sin(rx) + z2 * Math.cos(rx);

    const dist = 1000;
    const scale = dist / (dist + z3);
    const sxPt = cx + x3 * scale;
    const syPt = cy + y3 * scale;

    projected.push({ z: z3, scale, sx: sxPt, sy: syPt, idx: i });
  }

  projected.sort((a, b) => b.z - a.z);
  const segmentLen = Math.floor(numPoints / 3);
  const activeIndices = new Set<number>();
  for (let i = 0; i < segmentLen; i++) activeIndices.add(i);

  for (const pt of projected) {
    if (activeIndices.has(pt.idx)) {
      const dotRadius = 2.5 * pt.scale;
      const alpha = Math.min(255, Math.max(50, Math.floor(255 * (pt.scale * 0.8 + 0.2))));
      ctx.fillStyle = `rgba(239,239,250,${alpha / 255})`;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const dotRadius = 1.5 * pt.scale;
      ctx.fillStyle = 'rgba(239,239,250,0.12)';
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- GLITCH INTRO (draw "RESQFLY" with chromatic aberration) ---
export function drawGlitchIntro(ctx: CanvasRenderingContext2D, w: number, h: number,
  state: AppState): void {
  ctx.save();

  if (state.blastTriggered) {
    drawBlastParticles(ctx, state);
    ctx.restore();
    return;
  }

  const cx = w / 2;
  const cy = h / 2;
  const fontSize = Math.min(w * 0.08, 80);

  ctx.font = `bold ${Math.floor(fontSize)}px Orbitron, sans-serif`;
  const txt = 'RESQFLY';
  const measured = ctx.measureText(txt);
  const txtStartX = cx - measured.width / 2;
  const txtStartY = cy + fontSize / 4;

  // Right Layer (cyan)
  ctx.save();
  ctx.translate(state.glitchOffsetRight.x + 4, state.glitchOffsetRight.y);
  ctx.fillStyle = 'rgb(27,199,251)';
  ctx.fillText(txt, txtStartX, txtStartY);
  ctx.restore();

  // Left Layer (magenta)
  ctx.save();
  ctx.translate(state.glitchOffsetLeft.x - 4, state.glitchOffsetLeft.y);
  ctx.fillStyle = 'rgb(224,40,125)';
  ctx.fillText(txt, txtStartX, txtStartY);
  ctx.restore();

  // White Layer (main)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(255,0,0,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeText(txt, txtStartX, txtStartY);
  ctx.fillText(txt, txtStartX, txtStartY);

  // Glitch Slices
  const textTopY = cy - fontSize / 2;
  for (const slice of state.glitchSlices) {
    ctx.save();
    const stripY = textTopY + slice.y;
    ctx.beginPath();
    ctx.rect(0, stripY, w, slice.h);
    ctx.clip();
    ctx.translate(slice.offsetX, 0);

    if (slice.colorMode === 0) ctx.fillStyle = '#ffffff';
    else if (slice.colorMode === 1) ctx.fillStyle = 'rgb(224,40,125)';
    else ctx.fillStyle = 'rgb(27,199,251)';

    ctx.fillText(txt, txtStartX, txtStartY);
    ctx.restore();
  }

  // Spinner rings
  const spinnerX = 895 * (w / 1000);
  const spinnerY = 495 * (h / 640);
  const rotAngle = (state.introTick % 60) / 60 * 360;
  drawLoadingRing(ctx, spinnerX, spinnerY, 32, 35, -45, rotAngle);
  drawLoadingRing(ctx, spinnerX, spinnerY, 32, 50, 10, rotAngle + 120);
  drawLoadingRing(ctx, spinnerX, spinnerY, 32, 35, 55, rotAngle + 240);

  ctx.restore();
}

function drawBlastParticles(ctx: CanvasRenderingContext2D, state: AppState): void {
  for (const bp of state.blastParticles) {
    if (bp.alpha <= 0) continue;
    ctx.save();
    ctx.translate(bp.x, bp.y);
    ctx.rotate(bp.rotation * Math.PI / 180);
    ctx.globalAlpha = bp.alpha / 255;

    if (bp.isTextPiece && bp.imageData) {
      // Draw as small text fragment image
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = bp.imgW || 10;
      tmpCanvas.height = bp.imgH || 10;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.putImageData(bp.imageData, 0, 0);
      ctx.drawImage(tmpCanvas, 0, 0);
    } else {
      const size = bp.size || 3;
      let color: string;
      if (bp.colorType === 1) color = 'rgb(224,40,125)';
      else if (bp.colorType === 2) color = 'rgb(27,199,251)';
      else color = '#ffffff';

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, size);
      ctx.lineTo(-size, size);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- MAIN PAINT FUNCTION ---
export function paintFrame(ctx: CanvasRenderingContext2D, w: number, h: number,
  state: AppState): void {
  buildPaths(w, h);

  const sx = w / 1000;
  const sy = h / 640;
  const timeSec = performance.now() / 1000;
  const isBioMode = state.activeTab === 'bio';

  // Resolve main border color
  let mainR = state.customColor.r;
  let mainG = state.customColor.g;
  let mainB = state.customColor.b;
  const useRainbow = state.isRgbFlow;

  if (state.rgbBreathingEnabled) {
    const breath = (Math.sin(timeSec * 3) + 1) / 2;
    const factor = 0.6 + 0.8 * breath;
    mainR = Math.min(255, Math.floor(mainR * factor));
    mainG = Math.min(255, Math.floor(mainG * factor));
    mainB = Math.min(255, Math.floor(mainB * factor));
  }

  // Red flash
  if (timeSec < state.redFlashEndTime) {
    if (Math.floor(timeSec * 30) % 2 === 0) {
      mainR = 255; mainG = 0; mainB = 0;
    } else {
      mainR = 50; mainG = 0; mainB = 0;
    }
  }

  const mainColor = `rgb(${mainR},${mainG},${mainB})`;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background behind border
  ctx.save();
  drawPolygon(ctx, cachedOuterPath);
  ctx.clip();

  if (state.hexClearRadius < state.hexMaxRadius && !isBioMode) {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);
    drawHexBackground(ctx, w, h, state.hexDrawRadius, state.hexClearRadius, state.hexSize, state.hexGap, state.introSequenceActive, state.introTick);
  } else {
    ctx.fillStyle = 'rgba(10,10,10,1)';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();

  // Border path strokes (only rendered after intro sequence finishes)
  if (!state.introSequenceActive && !isBioMode) {
    const progress = state.startupPhase === 0
      ? Math.min(1, (state.startupTick / state.phase1Limit) ** 3)
      : 1;

    const currentGlowWidth = state.borderGlowSize * 2.0;
    const currentBorderWidth = Math.max(2.5, state.borderGlowSize * 0.7);
    const currentCoreWidth = 2.0;
    const glowAlpha = Math.floor(20 + 10 * Math.sin(timeSec * 5));

    // Outer glow
    ctx.save();
    if (useRainbow) {
      const grad = ctx.createConicGradient(state.flowOffset * Math.PI / 180, w / 2, h / 2);
      const colors = ['#ff0000', '#ff7f00', '#ffff00', '#7fff00', '#00ff00', '#00ff7f',
        '#00ffff', '#007fff', '#0000ff', '#7f00ff', '#ff00ff', '#ff007f'];
      for (let i = 0; i < colors.length; i++) {
        grad.addColorStop(i / colors.length, colors[i]);
      }
      grad.addColorStop(1, colors[0]);
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.3;
    } else {
      ctx.strokeStyle = `rgba(${mainR},${mainG},${mainB},${glowAlpha / 255})`;
    }
    ctx.lineWidth = currentGlowWidth;
    if (progress < 1) ctx.setLineDash([progress * getPathLength(cachedOuterPath), 9999]);
    drawPath(ctx, cachedOuterPath);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Main border stroke
    ctx.save();
    if (useRainbow) {
      const grad = ctx.createConicGradient(state.flowOffset * Math.PI / 180, w / 2, h / 2);
      const colors = ['#ff0000', '#ff7f00', '#ffff00', '#7fff00', '#00ff00', '#00ff7f',
        '#00ffff', '#007fff', '#0000ff', '#7f00ff', '#ff00ff', '#ff007f'];
      for (let i = 0; i < colors.length; i++) {
        grad.addColorStop(i / colors.length, colors[i]);
      }
      grad.addColorStop(1, colors[0]);
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = mainColor;
    }
    ctx.lineWidth = currentBorderWidth;
    if (progress < 1) ctx.setLineDash([progress * getPathLength(cachedOuterPath), 9999]);
    drawPath(ctx, cachedOuterPath);
    ctx.closePath();
    ctx.stroke();

    // Core inner white/gradient stroke
    ctx.lineWidth = currentCoreWidth;
    if (progress < 1) ctx.setLineDash([progress * getPathLength(cachedOuterPath), 9999]);
    const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
    if (useRainbow) {
      lineGrad.addColorStop(0, '#ffffff');
      lineGrad.addColorStop(0.5, '#ffffff');
      lineGrad.addColorStop(1, '#ffffff');
    } else {
      lineGrad.addColorStop(0, mainColor);
      lineGrad.addColorStop(0.5, `rgb(${Math.min(255, mainR + 40)},${Math.min(255, mainG + 40)},${Math.min(255, mainB + 40)})`);
      lineGrad.addColorStop(1, mainColor);
    }
    ctx.strokeStyle = lineGrad;
    drawPath(ctx, cachedOuterPath);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Intro sequence
  if (state.introSequenceActive) {
    ctx.save();
    // Clip to thin intro inner path
    drawPolygon(ctx, cachedIntroInnerPath);
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    if (!sandSim || sandSim.w !== Math.floor(w) || sandSim.h !== Math.floor(h)) {
      sandSim = new SandSimulation(Math.floor(w), Math.floor(h));
    }

    // Compute clip area from inner path bounds
    const clipBounds = getPathBounds(cachedIntroInnerPath);
    
    // Reveal text smoothly during wave 3 and full visibility during simulation
    const textAlpha = state.introTick < 280
      ? 0
      : Math.min(1, (state.introTick - 280) / 100);

    if (textAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = textAlpha;
      sandSim.draw(ctx, w, h, clipBounds.x, clipBounds.y, clipBounds.w, clipBounds.h);
      ctx.restore();
    }
    ctx.restore();
  } else {
    // Access granted flash
    if (state.showingAccessGranted) {
      ctx.save();
      const alpha = Math.floor(128 + 127 * Math.sin(state.accessGrantedTick * 0.1));
      ctx.fillStyle = `rgba(57,255,20,${alpha / 255})`;
      ctx.font = `bold 32px Orbitron, sans-serif`;
      ctx.letterSpacing = '10px';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ACCESS GRANTED', w / 2, h / 2);
      ctx.restore();
    }
  }

  // Neon Flow dashes
  if (state.startupPhase >= 1 && state.animationStyle === 'Neon Flow') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = state.flowLineWidth;
    ctx.setLineDash([30, 60]);
    ctx.lineDashOffset = -state.flowOffset;
    drawPath(ctx, cachedOuterPath);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Greebles & corner accents
  const greebleProgress = state.startupPhase >= 1
    ? (state.startupPhase === 1
      ? Math.min(1, (state.startupTick - state.phase1Limit) / 40)
      : 1)
    : 0;

  if (greebleProgress > 0 && !isBioMode) {
    ctx.save();
    if (greebleProgress < 1) {
      ctx.beginPath();
      ctx.rect(0, 0, w, h * greebleProgress);
      ctx.clip();
    }

    // Draw 3D greeble shapes
    for (const greeble of cachedGreebles) {
      draw3dGreeble(ctx, greeble, timeSec, mainR, mainG, mainB);
    }

    // Corner glitch effects
    if (state.heavyGlitchEnabled) {
      for (const corner of cachedCorners) {
        drawHeavyGlitchLine(ctx, corner, mainColor, w, h, timeSec);
      }
      for (const greeble of cachedGreebles) {
        drawHeavyGlitchLine(ctx, greeble, mainColor, w, h, timeSec);
      }
    } else {
      for (const corner of cachedCorners) {
        drawGlitchEffect(ctx, corner, mainR, mainG, mainB, w, h, timeSec);
      }
    }

    // Bloom glow overlay
    const glowPulse = (Math.sin(timeSec * 1.5) + 1) / 2;
    const glowAlpha = Math.floor(80 + 60 * glowPulse);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,50,50,${glowAlpha / 255})`;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const greeble of cachedGreebles) {
      drawPath(ctx, greeble);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // Connecting lines
    ctx.strokeStyle = 'rgb(255,150,150)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(290 * sx, 590 * sy); ctx.lineTo(440 * sx, 590 * sy); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(260 * sx, 572 * sy); ctx.lineTo(452 * sx, 572 * sy); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(330 * sx, 30 * sy); ctx.lineTo(480 * sx, 30 * sy); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(300 * sx, 48 * sy); ctx.lineTo(492 * sx, 48 * sy); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(590 * sx, 45 * sy); ctx.lineTo(720 * sx, 45 * sy); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(770 * sx, 572 * sy); ctx.lineTo(930 * sx, 572 * sy); ctx.stroke();

    // Tech squares
    const glitchAlpha = (timeSec % 1.5 > 0.8) ? 200 : 40;
    ctx.fillStyle = `rgba(${mainR},${mainG},${mainB},${glitchAlpha / 255})`;
    ctx.fillRect(23 * sx, 110 * sy, 10 * sx, 3 * sy);
    ctx.fillRect(23 * sx, 145 * sy, 12 * sx, 4 * sy);

    // Dashed vert line on right
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(965 * sx, 380 * sy);
    ctx.lineTo(965 * sx, 200 * sy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Top squares
    ctx.fillStyle = mainColor;
    ctx.fillRect(400 * sx, 28 * sy, 4 * sx, 4 * sy);
    ctx.fillRect(412 * sx, 28 * sy, 4 * sx, 4 * sy);
    ctx.fillRect(424 * sx, 28 * sy, 4 * sx, 4 * sy);

    // Status LED
    ctx.fillStyle = 'rgb(255,215,0)';
    ctx.beginPath();
    ctx.arc(820 * sx, 48 * sy, 4 * sx, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Inner screen background (after intro fades)
  if (!state.introSequenceActive) {
    let innerAlpha = 0;
    if (state.startupPhase >= 2) {
      const startT = state.phase1Limit + 40;
      const prog = Math.min(1, (state.startupTick - startT) / 50);
      innerAlpha = prog;
    }
    if (innerAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = innerAlpha;
      drawPolygon(ctx, cachedInnerPath);
      ctx.fillStyle = 'rgba(20,0,0,0.4)';
      ctx.fill();
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function draw3dGreeble(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[],
  timeSec: number, mr: number, mg: number, mb: number): void {
  // Shadow
  ctx.save();
  ctx.translate(4, 4);
  drawPolygon(ctx, points);
  ctx.fillStyle = 'rgba(0,0,0,0.59)';
  ctx.fill();
  ctx.restore();

  // Main body with pulse gradient
  const pulseFactor = (Math.sin(timeSec * 4) + 1) / 2;
  const bounds = getPathBounds(points);
  const grad = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);
  grad.addColorStop(0, `rgba(255,${50 + Math.floor(50 * pulseFactor)},50,0.9)`);
  grad.addColorStop(0.6, 'rgba(180,20,20,0.9)');
  grad.addColorStop(1, 'rgba(60,0,0,0.9)');

  drawPolygon(ctx, points);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = `rgba(${mr},${mg},${mb},0.8)`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawGlitchEffect(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[],
  mr: number, mg: number, mb: number, w: number, h: number, timeSec: number): void {
  const seed = Math.floor(timeSec * 10);
  const rng = seededRandom(seed);

  if (rng() > 0.5) {
    ctx.save();
    ctx.translate(Math.floor(rng() * 11 - 5), Math.floor(rng() * 5 - 2));
    ctx.strokeStyle = `rgba(${mr},${mg},${mb},0.2)`;
    ctx.lineWidth = 2;
    drawPath(ctx, points);
    ctx.stroke();
    ctx.restore();
  }

  if (rng() > 0.3) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(0,255,255,0.7)`;
    ctx.lineWidth = 2;
    const dx1 = Math.floor(rng() * 21 - 10);
    ctx.translate(dx1, 0);
    drawPath(ctx, points);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,0,255,0.7)`;
    ctx.translate(Math.floor(rng() * 21 - 10) - dx1, Math.floor(rng() * 5 - 2));
    drawPath(ctx, points);
    ctx.stroke();
    ctx.restore();
  }

  if (rng() > 0.2) {
    const numSlices = 2 + Math.floor(rng() * 9);
    for (let s = 0; s < numSlices; s++) {
      ctx.save();
      const sliceY = Math.floor(rng() * h);
      const sliceH = 2 + Math.floor(rng() * 39);
      ctx.beginPath();
      ctx.rect(0, sliceY, w, sliceH);
      ctx.clip();
      const shifts = [-30, -20, -10, 10, 20, 30];
      ctx.translate(shifts[Math.floor(rng() * shifts.length)], 0);
      const sliceType = rng();
      if (sliceType > 0.7) {
        ctx.strokeStyle = 'rgba(255,255,255,1)';
        ctx.lineWidth = 3;
      } else if (sliceType > 0.4) {
        ctx.strokeStyle = `rgba(${Math.min(255, mr + 60)},${Math.min(255, mg + 60)},${Math.min(255, mb + 60)},1)`;
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = `rgb(${mr},${mg},${mb})`;
        ctx.lineWidth = 2;
      }
      drawPath(ctx, points);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawHeavyGlitchLine(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[],
  mainColor: string, w: number, h: number, timeSec: number): void {
  const seed = Math.floor(timeSec * 10);
  const rng = seededRandom(seed);

  ctx.save();
  ctx.translate(Math.floor(rng() * 11 - 5), Math.floor(rng() * 5 - 2));

  // Cyan ghost
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(Math.floor(rng() * 11 - 10), 0);
  ctx.strokeStyle = 'rgba(0,255,255,0.59)';
  ctx.lineWidth = 2;
  drawPath(ctx, points);
  ctx.stroke();
  ctx.restore();

  // Magenta ghost
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(Math.floor(rng() * 11), 0);
  ctx.strokeStyle = 'rgba(255,0,255,0.59)';
  ctx.lineWidth = 2;
  drawPath(ctx, points);
  ctx.stroke();
  ctx.restore();

  // Slices
  const numSlices = 3 + Math.floor(rng() * 6);
  for (let s = 0; s < numSlices; s++) {
    ctx.save();
    const sliceH = 5 + Math.floor(rng() * 46);
    const sliceY = Math.floor(rng() * h);
    ctx.beginPath();
    ctx.rect(0, sliceY, w, sliceH);
    ctx.clip();
    ctx.translate(Math.floor(rng() * 41 - 20), 0);
    if (rng() > 0.8) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2;
    }
    drawPath(ctx, points);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// --- HELPERS ---
function getPathLength(points: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function getPathBounds(points: { x: number; y: number }[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function getSandSim(): SandSimulation | null {
  return sandSim;
}

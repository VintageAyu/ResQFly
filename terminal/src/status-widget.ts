// =============================================================================
// RESQFLY CONSOLE — STATUS & 3D TELEMETRY DIAGNOSTICS WIDGET (TypeScript Port)
// =============================================================================
// Renders the full STATUS tab: left telemetry panel, center 3D drone viewport
// with wireframe mesh, and right RF diagnostics panel.
// =============================================================================

import type { TelemetryData } from './types';

// --- 3D DRONE MESH DATA ---
interface Vertex { x: number; y: number; z: number; }
interface Face { indices: number[]; }
interface Mesh { name: string; vertices: Vertex[]; faces: Face[]; color: string; }

// Build a simplified F450 drone model
function buildDroneModel(): Mesh[] {
  const meshes: Mesh[] = [];

  // Central body
  meshes.push(createBox('hull', 0.58, 0.02, 0.58, 'rgb(15,23,42)', [0, 0.06, 0]));
  meshes.push(createBox('hull', 0.42, 0.015, 0.22, 'rgb(217,119,6)', [0, 0.065, 0]));
  meshes.push(createBox('hull', 0.58, 0.02, 0.58, 'rgb(15,23,42)', [0, -0.06, 0]));
  meshes.push(createBox('hull', 0.30, 0.10, 0.44, 'rgb(245,158,11)', [0, -0.16, -0.08]));

  // Motor mount positions
  const motorCoords: [number, number, number][] = [
    [0.62, 0.08, 0.62],   // FR
    [-0.62, 0.08, 0.62],  // FL
    [0.62, 0.08, -0.62],  // RR
    [-0.62, 0.08, -0.62], // RL
  ];

  for (let i = 0; i < 4; i++) {
    const [mx, my, mz] = motorCoords[i];
    const isFront = i < 2;
    const armColor = isFront ? 'rgb(220,38,38)' : 'rgb(240,245,252)';

    // Arm beam (simplified as rotated box)
    const angle = Math.atan2(mx, mz);
    const armLen = Math.sqrt(mx * mx + mz * mz);
    const armVerts = createBoxVertices(0.08, 0.06, armLen, [0, 0, armLen / 2]);
    const rotated = armVerts.map(v => rotateY(v, angle * 180 / Math.PI));
    meshes.push({ name: 'hull', vertices: rotated, faces: boxFaces(), color: armColor });

    // Motor cylinder
    meshes.push(createCylinder('motor', 0.11, 0.10, 8, 'rgb(51,65,85)', [mx, 0.08, mz]));
    meshes.push(createCylinder('motor', 0.03, 0.05, 8, 'rgb(180,190,205)', [mx, 0.14, mz]));

    // Propeller disc
    const propColor = isFront ? 'rgba(0,210,255,0.55)' : 'rgba(255,110,0,0.55)';
    meshes.push(createCylinder('prop', 0.46, 0.01, 16, propColor, [mx, 0.16, mz]));
  }

  // Flight controller
  meshes.push(createBox('fc', 0.32, 0.03, 0.32, 'rgb(16,185,129)', [0, 0.09, 0.04]));

  // Camera & gimbal
  meshes.push(createBox('camera', 0.20, 0.16, 0.20, 'rgb(15,23,42)', [0, -0.31, 0.48]));
  meshes.push(createCylinder('camera', 0.075, 0.11, 12, 'rgb(51,65,85)', [0, -0.31, 0.60]));

  // Antennas
  meshes.push(createBox('antenna', 0.02, 0.25, 0.02, 'rgb(2,132,199)', [-0.14, 0.22, -0.36]));
  meshes.push(createBox('antenna', 0.02, 0.25, 0.02, 'rgb(2,132,199)', [0.14, 0.22, -0.36]));

  return meshes;
}

function createBox(name: string, sx: number, sy: number, sz: number, color: string, offset: number[]): Mesh {
  return { name, vertices: createBoxVertices(sx, sy, sz, offset), faces: boxFaces(), color };
}

function createBoxVertices(sx: number, sy: number, sz: number, offset: number[]): Vertex[] {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const [ox, oy, oz] = offset;
  return [
    { x: ox - hx, y: oy - hy, z: oz - hz }, { x: ox + hx, y: oy - hy, z: oz - hz },
    { x: ox + hx, y: oy + hy, z: oz - hz }, { x: ox - hx, y: oy + hy, z: oz - hz },
    { x: ox - hx, y: oy - hy, z: oz + hz }, { x: ox + hx, y: oy - hy, z: oz + hz },
    { x: ox + hx, y: oy + hy, z: oz + hz }, { x: ox - hx, y: oy + hy, z: oz + hz },
  ];
}

function boxFaces(): Face[] {
  return [
    { indices: [0, 1, 2, 3] }, { indices: [5, 4, 7, 6] },
    { indices: [4, 0, 3, 7] }, { indices: [1, 5, 6, 2] },
    { indices: [4, 5, 1, 0] }, { indices: [3, 2, 6, 7] },
  ];
}

function createCylinder(name: string, radius: number, height: number, segments: number, color: string, offset: number[]): Mesh {
  const [ox, oy, oz] = offset;
  const hy = height / 2;
  const verts: Vertex[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const c = radius * Math.cos(angle);
    const s = radius * Math.sin(angle);
    verts.push({ x: ox + c, y: oy - hy, z: oz + s });
    verts.push({ x: ox + c, y: oy + hy, z: oz + s });
  }
  const faces: Face[] = [];
  for (let i = 0; i < segments; i++) {
    const i1 = i * 2, i2 = i1 + 1;
    const i3 = ((i + 1) % segments) * 2 + 1;
    const i4 = ((i + 1) % segments) * 2;
    faces.push({ indices: [i1, i4, i3, i2] });
  }
  return { name, vertices: verts, faces, color };
}

function rotateY(v: Vertex, angleDeg: number): Vertex {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return { x: v.x * cos + v.z * sin, y: v.y, z: -v.x * sin + v.z * cos };
}

function rotateX(v: Vertex, angleDeg: number): Vertex {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return { x: v.x, y: v.y * cos - v.z * sin, z: v.y * sin + v.z * cos };
}

function project3D(v: Vertex, cx: number, cy: number, scale: number, camYaw: number, camPitch: number): { x: number; y: number; z: number } {
  let r = rotateY(v, camYaw * 180 / Math.PI);
  r = rotateX(r, camPitch * 180 / Math.PI);
  const z = r.z + 5.8;
  const fov = scale / Math.max(0.1, z);
  return { x: cx + r.x * fov, y: cy - r.y * fov, z };
}

// Drone model (singleton)
const droneModel = buildDroneModel();

// RF spectrum points
const rfPoints: number[] = new Array(50).fill(20);

// Camera state
let cameraYaw = 0;
let cameraPitch = 0.06;

function getCardinalDir(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

// --- MAIN DRAW FUNCTION ---
export function drawStatusWidget(ctx: CanvasRenderingContext2D, w: number, h: number, telemetry: TelemetryData): void {
  const t = performance.now() / 1000;

  // Background
  ctx.fillStyle = 'rgb(4,4,6)';
  ctx.fillRect(0, 0, w, h);

  // Layout
  const margin = 6;
  const gap = 8;
  const panelW = Math.max(220, w * 0.25);
  const centerW = w - panelW * 2 - gap * 2 - margin * 2;

  const leftX = margin;
  const centerX = margin + panelW + gap;
  const rightX = w - margin - panelW;
  const panelH = h - margin * 2;
  const panelY = margin;

  // LEFT PANEL: Telemetry
  drawTelemetryPanel(ctx, leftX, panelY, panelW, panelH, telemetry, t);

  // CENTER: 3D Drone Viewport
  drawDroneViewport(ctx, centerX, panelY, centerW, panelH, telemetry, t);

  // RIGHT PANEL: RF Diagnostics
  drawRFPanel(ctx, rightX, panelY, panelW, panelH, telemetry, t);

  // Update camera spin
  cameraYaw += 0.008;
}

function drawBorderedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawTelemetryPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, telem: TelemetryData, t: number): void {
  drawBorderedRect(ctx, x, y, w, h, 'rgba(10,8,10,0.94)', 'rgba(80,18,24,0.63)');

  const pad = 8;
  let cy = y + pad;
  const cw = w - pad * 2;

  // Header
  ctx.font = 'bold 9px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.fillText('LIVE TELEMETRY DATA', x + pad, cy + 12);

  // SIM badge
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.font = 'bold 6px Orbitron, sans-serif';
  drawBorderedRect(ctx, x + w - 48, cy, 40, 16, 'rgba(16,12,14,0.98)', 'rgb(255,35,50)');
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.textAlign = 'center';
  ctx.fillText('SIM', x + w - 28, cy + 11);
  ctx.textAlign = 'left';

  cy += 28;

  // Artificial Horizon
  const hudH = Math.min(160, h * 0.28);
  drawBorderedRect(ctx, x + pad, cy, cw, hudH, 'rgba(16,12,14,0.98)', 'rgba(80,18,24,0.63)');

  // Sky/ground split
  const horizonShift = telem.pitch * 2;
  const midY = cy + hudH / 2 + horizonShift;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + pad, cy, cw, hudH);
  ctx.clip();

  // Rotate for roll
  ctx.translate(x + pad + cw / 2, cy + hudH / 2);
  ctx.rotate(-telem.roll * Math.PI / 180);
  ctx.translate(-(x + pad + cw / 2), -(cy + hudH / 2));

  ctx.fillStyle = 'rgb(90,18,25)';
  ctx.fillRect(x + pad - 50, cy - 50, cw + 100, hudH / 2 + horizonShift + 50);
  ctx.fillStyle = 'rgb(20,7,10)';
  ctx.fillRect(x + pad - 50, midY, cw + 100, hudH + 100);

  // Horizon line
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + pad - 50, midY);
  ctx.lineTo(x + pad + cw + 50, midY);
  ctx.stroke();

  // Pitch ladder
  ctx.font = 'bold 7px Consolas, monospace';
  ctx.fillStyle = 'rgba(245,240,242,0.6)';
  ctx.textAlign = 'center';
  for (let deg = -20; deg <= 20; deg += 5) {
    if (deg === 0) continue;
    const lineY = midY - deg * 2;
    ctx.beginPath();
    ctx.moveTo(x + pad + cw / 2 - 20, lineY);
    ctx.lineTo(x + pad + cw / 2 + 20, lineY);
    ctx.stroke();
    ctx.fillText(`${deg}`, x + pad + cw / 2 + 30, lineY + 3);
  }

  ctx.restore();

  // Center reticle
  const rcx = x + pad + cw / 2;
  const rcy = cy + hudH / 2;
  ctx.strokeStyle = 'rgb(255,35,50)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rcx - 25, rcy); ctx.lineTo(rcx - 8, rcy);
  ctx.moveTo(rcx + 8, rcy); ctx.lineTo(rcx + 25, rcy);
  ctx.moveTo(rcx, rcy - 8); ctx.lineTo(rcx, rcy + 8);
  ctx.stroke();

  // Heading tape
  ctx.font = 'bold 7px Orbitron, sans-serif';
  ctx.fillStyle = 'rgba(245,240,242,0.8)';
  ctx.textAlign = 'center';
  ctx.fillText(`HDG ${Math.round(telem.heading)}° ${getCardinalDir(telem.heading)}`, rcx, cy + hudH - 6);

  cy += hudH + 10;

  // Telemetry rows
  const rows = [
    ['ALTITUDE', `${telem.alt.toFixed(1)} m AGL`],
    ['SPEED', `${telem.speed.toFixed(1)} m/s`],
    ['V-SPEED', `${telem.vspeed.toFixed(1)} m/s`],
    ['PITCH', `${telem.pitch.toFixed(1)}°`],
    ['ROLL', `${telem.roll.toFixed(1)}°`],
    ['HEADING', `${Math.round(telem.heading)}° ${getCardinalDir(telem.heading)}`],
    ['LAT', `${telem.lat.toFixed(6)}`],
    ['LON', `${telem.lon.toFixed(6)}`],
    ['GPS FIX', telem.gps_fix],
    ['SATS', `${telem.satellites}`],
    ['BATTERY', `${telem.battery_pct}% (${telem.volts.toFixed(1)}V)`],
    ['CURRENT', `${telem.amps.toFixed(1)} A`],
    ['THROTTLE', `${telem.throttle}%`],
  ];

  ctx.font = 'bold 8px Consolas, monospace';
  for (const [label, value] of rows) {
    if (cy + 16 > y + h) break;
    ctx.fillStyle = 'rgb(170,120,128)';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + pad, cy + 10);
    ctx.fillStyle = 'rgb(245,240,242)';
    ctx.textAlign = 'right';
    ctx.fillText(value, x + w - pad, cy + 10);
    cy += 16;
  }
}

function drawDroneViewport(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, telem: TelemetryData, t: number): void {
  drawBorderedRect(ctx, x, y, w, h, 'rgba(4,4,6,1)', 'rgba(80,18,24,0.63)');

  const cx = x + w / 2;
  const cy = y + h / 2;
  const scale = 3.5 * Math.min(w, h) * 0.15;

  // Draw wireframe drone
  const droneYaw = t * 22; // Spin
  const hover = Math.sin(t * 2.5) * 0.06;

  // Extract edges and draw wireframe
  for (const mesh of droneModel) {
    for (const face of mesh.faces) {
      const indices = face.indices;
      const projectedPoints: { x: number; y: number; z: number }[] = [];

      for (const idx of indices) {
        let v = mesh.vertices[idx];
        // Apply drone yaw rotation
        v = rotateY(v, droneYaw);
        // Apply hover
        v = { x: v.x, y: v.y + hover, z: v.z };
        // Apply telemetry pitch/roll
        v = rotateX(v, telem.pitch);
        v = { x: v.x * Math.cos(telem.roll * Math.PI / 180) - v.y * Math.sin(telem.roll * Math.PI / 180),
              y: v.x * Math.sin(telem.roll * Math.PI / 180) + v.y * Math.cos(telem.roll * Math.PI / 180),
              z: v.z };
        projectedPoints.push(project3D(v, cx, cy, scale, cameraYaw, cameraPitch));
      }

      // Draw edges
      ctx.strokeStyle = 'rgba(0,245,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < projectedPoints.length; i++) {
        const p1 = projectedPoints[i];
        const p2 = projectedPoints[(i + 1) % projectedPoints.length];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();
    }
  }

  // Labels
  ctx.font = 'bold 8px Orbitron, sans-serif';
  ctx.fillStyle = 'rgba(0,245,255,0.8)';
  ctx.textAlign = 'center';
  ctx.fillText('3D TACTICAL VIEWPORT', cx, y + 18);
  ctx.fillStyle = 'rgba(170,120,128,0.8)';
  ctx.font = 'bold 7px Consolas, monospace';
  ctx.fillText('WIREFRAME • AUTO-ORBIT', cx, y + h - 8);
}

function drawRFPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, telem: TelemetryData, t: number): void {
  drawBorderedRect(ctx, x, y, w, h, 'rgba(10,8,10,0.94)', 'rgba(80,18,24,0.63)');

  const pad = 8;
  let cy = y + pad;
  const cw = w - pad * 2;

  // Header
  ctx.font = 'bold 9px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.fillText('RF DIAGNOSTICS', x + pad, cy + 12);
  cy += 24;

  // RF Spectrum
  const specH = Math.min(80, h * 0.15);
  drawBorderedRect(ctx, x + pad, cy, cw, specH, 'rgba(16,12,14,0.98)', 'rgba(80,18,24,0.63)');

  // Update RF points
  rfPoints.shift();
  const baseWave = Math.sin(t * 5) * 10 + Math.cos(t * 9) * 6;
  const noise = (Math.random() - 0.5) * 6;
  rfPoints.push(Math.max(4, Math.min(50, 25 + baseWave + noise)));

  // Draw spectrum
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,35,50,0.8)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < rfPoints.length; i++) {
    const px = x + pad + (i / rfPoints.length) * cw;
    const py = cy + specH - (rfPoints[i] / 50) * specH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Fill under
  ctx.lineTo(x + pad + cw, cy + specH);
  ctx.lineTo(x + pad, cy + specH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,35,50,0.08)';
  ctx.fill();

  cy += specH + 10;

  // RF Stats
  const rfRows = [
    ['RSSI', `${telem.rssi} dBm`],
    ['SNR', `${telem.snr.toFixed(1)} dB`],
    ['LATENCY', `${telem.latency} ms`],
    ['PKT LOSS', `${(telem.loss * 100).toFixed(1)}%`],
    ['LINK', telem.link_source],
  ];

  ctx.font = 'bold 8px Consolas, monospace';
  for (const [label, value] of rfRows) {
    if (cy + 16 > y + h * 0.5) break;
    ctx.fillStyle = 'rgb(170,120,128)';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + pad, cy + 10);
    ctx.fillStyle = 'rgb(245,240,242)';
    ctx.textAlign = 'right';
    ctx.fillText(value, x + w - pad, cy + 10);
    cy += 16;
  }

  cy += 10;

  // Parts Health grid
  ctx.font = 'bold 9px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.textAlign = 'left';
  ctx.fillText('COMPONENT HEALTH', x + pad, cy + 10);
  cy += 18;

  const parts = [
    ['M1 (FR)', true], ['M2 (FL)', true], ['M3 (RR)', true], ['M4 (RL)', true],
    ['ESC 1', true], ['ESC 2', true], ['ESC 3', true], ['ESC 4', true],
    ['CAMERA', true], ['GIMBAL', true], ['VTX ANT', true], ['FC', true],
  ] as const;

  ctx.font = 'bold 7px Consolas, monospace';
  const colW = cw / 2;
  for (let i = 0; i < parts.length; i++) {
    if (cy + 14 > y + h - pad) break;
    const col = i % 2;
    const px = x + pad + col * colW;
    const py = cy;

    // Status dot
    const healthy = parts[i][1];
    ctx.fillStyle = healthy ? 'rgb(0,255,157)' : 'rgb(255,46,77)';
    ctx.beginPath();
    ctx.arc(px + 5, py + 5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgb(245,240,242)';
    ctx.textAlign = 'left';
    ctx.fillText(parts[i][0], px + 12, py + 8);

    if (col === 1) cy += 14;
  }

  cy += 20;

  // Event log
  if (cy + 60 < y + h) {
    ctx.font = 'bold 9px Orbitron, sans-serif';
    ctx.fillStyle = 'rgb(255,35,50)';
    ctx.textAlign = 'left';
    ctx.fillText('EVENT LOG', x + pad, cy + 10);
    cy += 18;

    ctx.font = '7px Consolas, monospace';
    ctx.fillStyle = 'rgb(170,120,128)';
    const logs = [
      '[00:01:04] F450 Telemetry linked.',
      '[00:01:05] RF lock 5.8GHz.',
      '[00:01:08] All 12 modules nominal.',
    ];
    for (const log of logs) {
      if (cy + 12 > y + h - pad) break;
      ctx.fillText(log, x + pad, cy + 8);
      cy += 12;
    }
  }
}

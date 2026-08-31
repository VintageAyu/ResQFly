// =============================================================================
// RESQFLY CONSOLE — AUTONOMOUS COMMAND & CONTROL DECK (TypeScript Port)
// =============================================================================
// Renders the full REMOTE tab: Autonomous SAR Mission Sequencer, live minimap,
// tactical flight operations (Arm, Takeoff, Modes, E-Stop), failsafe status,
// and subsystem telemetry matrix.
// =============================================================================

import type { TelemetryData } from './types';

interface RemoteState {
  isArmed: boolean;
  flightMode: string;
  takeoffAlt: number;
  cruiseSpeed: number;
  geofenceRadius: number;
  sarStage: number; // 0..5
  sarActive: boolean;
  estopActive: boolean;
  clickRegions: { x: number; y: number; w: number; h: number; action: () => void }[];
}

const remoteState: RemoteState = {
  isArmed: false,
  flightMode: 'STABILIZE',
  takeoffAlt: 25,
  cruiseSpeed: 12,
  geofenceRadius: 1200,
  sarStage: 0,
  sarActive: false,
  estopActive: false,
  clickRegions: [],
};

// Listen for canvas clicks on the remote canvas
let canvasAttached = false;

function attachClickListener(canvas: HTMLCanvasElement): void {
  if (canvasAttached) return;
  canvasAttached = true;

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (const region of remoteState.clickRegions) {
      if (
        clickX >= region.x &&
        clickX <= region.x + region.w &&
        clickY >= region.y &&
        clickY <= region.y + region.h
      ) {
        region.action();
        break;
      }
    }
  });
}

export function drawRemoteWidget(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  telem: TelemetryData
): void {
  const canvas = ctx.canvas;
  attachClickListener(canvas);

  const t = performance.now() / 1000;
  remoteState.clickRegions = [];

  // Deep obsidian background
  ctx.fillStyle = 'rgb(4, 4, 6)';
  ctx.fillRect(0, 0, w, h);

  const margin = 8;
  const gap = 8;
  const topH = Math.max(160, h * 0.42);
  const botH = h - topH - margin * 2 - gap - 34;

  // =================================================================
  // TOP ROW: Mission Sequencer (Left 60%) + Minimap (Right 40%)
  // =================================================================
  const topW = w - margin * 2;
  const missionW = topW * 0.6;
  const mapW = topW - missionW - gap;

  // PANEL A: AUTONOMOUS SAR MISSION SEQUENCER
  drawMissionCard(ctx, margin, margin, missionW, topH, t, telem);

  // PANEL B: TACTICAL MINIMAP
  drawMinimapCard(ctx, margin + missionW + gap, margin, mapW, topH, t, telem);

  // =================================================================
  // BOTTOM ROW: Flight Operations (35%) + Failsafe (35%) + Telemetry (30%)
  // =================================================================
  const botY = margin + topH + gap;
  const col1W = (topW - gap * 2) * 0.35;
  const col2W = (topW - gap * 2) * 0.35;
  const col3W = topW - col1W - col2W - gap * 2;

  // PANEL C: FLIGHT OPERATIONS
  drawFlightOpsCard(ctx, margin, botY, col1W, botH, t, telem);

  // PANEL D: FAILSAFE & EMERGENCY
  drawFailsafeCard(ctx, margin + col1W + gap, botY, col2W, botH, t, telem);

  // PANEL E: SUBSYSTEM TELEMETRY MATRIX
  drawHealthCard(ctx, margin + col1W + col2W + gap * 2, botY, col3W, botH, t, telem);

  // =================================================================
  // BOTTOM LIVE BANNER
  // =================================================================
  drawLiveBanner(ctx, margin, h - 30 - margin, topW, 28, telem);
}

// -----------------------------------------------------------------------------
// PANEL A: MISSION SEQUENCER
// -----------------------------------------------------------------------------
function drawMissionCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  telem: TelemetryData
): void {
  drawCardFrame(ctx, x, y, w, h, 'AUTONOMOUS SAR MISSION SEQUENCER');

  const pad = 10;
  const cx = x + pad;
  let cy = y + 26;
  const cw = w - pad * 2;

  // Master Launch Button
  const btnH = 34;
  const grad = ctx.createLinearGradient(cx, cy, cx + cw, cy);
  grad.addColorStop(0, remoteState.sarActive ? '#005c38' : '#003822');
  grad.addColorStop(1, remoteState.sarActive ? '#ffffff' : '#00ff9d');

  ctx.fillStyle = grad;
  ctx.fillRect(cx, cy, cw, btnH);
  ctx.strokeStyle = '#00ff9d';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cx, cy, cw, btnH);

  ctx.font = 'bold 8.5px Orbitron, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText(
    remoteState.sarActive
      ? '⚡ SAR SWEEP IN PROGRESS [ MISSION ACTIVE ]'
      : '⚡ EXECUTE AUTONOMOUS SAR MISSION [ PRE-ARM → TAKEOFF → GRID SWEEP ]',
    cx + cw / 2,
    cy + 21
  );

  remoteState.clickRegions.push({
    x: cx,
    y: cy,
    w: cw,
    h: btnH,
    action: () => {
      remoteState.sarActive = !remoteState.sarActive;
      if (remoteState.sarActive) {
        remoteState.isArmed = true;
        remoteState.flightMode = 'AUTO';
        telem.armed = true;
        telem.mode = 'AUTO';
      }
    },
  });

  cy += btnH + 8;

  // Stage Pipeline Indicator (6 boxes)
  const stages = ['01: PRE-CHECK', '02: ARM', '03: CLIMB', '04: GRID SWEEP', '05: IDENTIFY', '06: RTL'];
  const stageW = (cw - (stages.length - 1) * 4) / stages.length;
  const stageH = 22;

  for (let i = 0; i < stages.length; i++) {
    const sx = cx + i * (stageW + 4);
    const active = remoteState.sarActive && remoteState.sarStage === i;
    const completed = remoteState.sarActive && remoteState.sarStage > i;

    ctx.fillStyle = completed
      ? 'rgba(0, 255, 157, 0.2)'
      : active
      ? 'rgba(0, 240, 255, 0.3)'
      : 'rgba(12, 18, 26, 0.86)';
    ctx.fillRect(sx, cy, stageW, stageH);
    ctx.strokeStyle = completed ? '#00ff9d' : active ? '#00f0ff' : '#1c2833';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, cy, stageW, stageH);

    ctx.font = 'bold 6.5px Orbitron, sans-serif';
    ctx.fillStyle = completed ? '#00ff9d' : active ? '#ffffff' : '#546e7a';
    ctx.textAlign = 'center';
    ctx.fillText(stages[i], sx + stageW / 2, cy + 14);
  }

  cy += stageH + 10;

  // SAR Radius & Lane controls
  const halfW = (cw - 8) / 2;

  // Radius Slider Info
  ctx.font = 'bold 7px Consolas, monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.textAlign = 'left';
  ctx.fillText(`SAR RADIUS: ${remoteState.takeoffAlt * 24}m`, cx, cy + 8);
  drawSlider(ctx, cx, cy + 12, halfW, 0.4, '#00f0ff');

  // Lane Width Info
  ctx.fillStyle = '#00ff9d';
  ctx.fillText('LANE WIDTH: 80m', cx + halfW + 8, cy + 8);
  drawSlider(ctx, cx + halfW + 8, cy + 12, halfW, 0.5, '#00ff9d');

  cy += 28;

  // Action Buttons
  const btnW = (cw - 9) / 4;
  const btns = [
    { label: '⚡ GENERATE GRID', col: '#00ff9d', act: () => {} },
    { label: '⬆ UPLOAD SAR', col: '#00f0ff', act: () => {} },
    { label: '✕ CLEAR GRID', col: '#ff2e4d', act: () => { remoteState.sarActive = false; } },
    { label: '⬇ FETCH & VERIFY', col: '#00f0ff', act: () => {} },
  ];

  for (let i = 0; i < btns.length; i++) {
    const bx = cx + i * (btnW + 3);
    drawCyberButton(ctx, bx, cy, btnW, 24, btns[i].label, btns[i].col);
    remoteState.clickRegions.push({
      x: bx,
      y: cy,
      w: btnW,
      h: 24,
      action: btns[i].act,
    });
  }

  cy += 30;
  ctx.font = 'bold 7px Consolas, monospace';
  ctx.fillStyle = '#78909c';
  ctx.textAlign = 'left';
  ctx.fillText('16 WAYPOINTS CONFIGURED | 2 SOS BEACONS DETECTED', cx, cy + 6);
}

// -----------------------------------------------------------------------------
// PANEL B: MINIMAP
// -----------------------------------------------------------------------------
function drawMinimapCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  telem: TelemetryData
): void {
  drawCardFrame(ctx, x, y, w, h, 'LIVE TACTICAL MINIMAP');

  const pad = 6;
  const mx = x + pad;
  const my = y + 22;
  const mw = w - pad * 2;
  const mh = h - pad * 2 - 20;

  // Background grid
  ctx.fillStyle = 'rgb(8, 12, 20)';
  ctx.fillRect(mx, my, mw, mh);

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  for (let gx = mx; gx < mx + mw; gx += 25) {
    ctx.beginPath(); ctx.moveTo(gx, my); ctx.lineTo(gx, my + mh); ctx.stroke();
  }
  for (let gy = my; gy < my + mh; gy += 25) {
    ctx.beginPath(); ctx.moveTo(mx, gy); ctx.lineTo(mx + mw, gy); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Geofence circle
  const mcx = mx + mw / 2;
  const mcy = my + mh / 2;
  const gr = Math.min(mw, mh) * 0.38;
  ctx.strokeStyle = 'rgba(0, 255, 157, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(mcx, mcy, gr, 0, Math.PI * 2);
  ctx.stroke();

  // SAR grid lines on minimap
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(mcx - gr * 0.7, mcy - gr * 0.5);
  ctx.lineTo(mcx + gr * 0.7, mcy - gr * 0.5);
  ctx.lineTo(mcx + gr * 0.7, mcy);
  ctx.lineTo(mcx - gr * 0.7, mcy);
  ctx.lineTo(mcx - gr * 0.7, mcy + gr * 0.5);
  ctx.lineTo(mcx + gr * 0.7, mcy + gr * 0.5);
  ctx.stroke();
  ctx.setLineDash([]);

  // Survivor beacons
  const beaconR = 5 + Math.sin(t * 3) * 2;
  ctx.strokeStyle = 'rgba(255, 46, 77, 0.8)';
  ctx.fillStyle = 'rgba(255, 46, 77, 0.2)';
  ctx.beginPath();
  ctx.arc(mcx + 30, mcy - 20, beaconR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Drone marker in center
  ctx.save();
  ctx.translate(mcx, mcy);
  ctx.rotate((telem.heading * Math.PI) / 180);

  // Radar ping
  const pingR = 12 + Math.sin(t * 2) * 4;
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(0, 0, pingR, 0, Math.PI * 2);
  ctx.stroke();

  // Drone cross
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
  ctx.moveTo(-6, 6); ctx.lineTo(6, -6);
  ctx.stroke();

  // Nose triangle
  ctx.fillStyle = '#ff2e4d';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-3, -4);
  ctx.lineTo(3, -4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Minimap overlay text
  ctx.font = 'bold 6.5px Orbitron, sans-serif';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
  ctx.textAlign = 'left';
  ctx.fillText(`DRONE: ${telem.lat.toFixed(5)}°N, ${telem.lon.toFixed(5)}°E`, mx + 6, my + 12);
  ctx.fillText(`ALT: ${telem.alt.toFixed(1)}m | HDG: ${Math.round(telem.heading)}°`, mx + 6, my + 22);

  const armedCol = telem.armed ? '#00ff9d' : '#ff2e4d';
  ctx.fillStyle = armedCol;
  ctx.fillText(`● ${telem.armed ? 'ARMED' : 'DISARMED'}`, mx + 6, my + mh - 6);
}

// -----------------------------------------------------------------------------
// PANEL C: FLIGHT OPERATIONS
// -----------------------------------------------------------------------------
function drawFlightOpsCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  telem: TelemetryData
): void {
  drawCardFrame(ctx, x, y, w, h, 'TACTICAL FLIGHT OPERATIONS');

  const pad = 8;
  const cx = x + pad;
  let cy = y + 24;
  const cw = w - pad * 2;

  // ARM / DISARM
  const halfBtnW = (cw - 4) / 2;
  drawCyberButton(ctx, cx, cy, halfBtnW, 26, 'ARM PROPULSION', '#00ff9d');
  remoteState.clickRegions.push({
    x: cx,
    y: cy,
    w: halfBtnW,
    h: 26,
    action: () => {
      remoteState.isArmed = true;
      telem.armed = true;
    },
  });

  drawCyberButton(ctx, cx + halfBtnW + 4, cy, halfBtnW, 26, 'DISARM MOTORS', '#ff2e4d');
  remoteState.clickRegions.push({
    x: cx + halfBtnW + 4,
    y: cy,
    w: halfBtnW,
    h: 26,
    action: () => {
      remoteState.isArmed = false;
      telem.armed = false;
    },
  });

  cy += 32;

  // Takeoff altitude slider
  ctx.font = 'bold 7px Consolas, monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.textAlign = 'left';
  ctx.fillText(`TAKEOFF ALT: ${remoteState.takeoffAlt}m`, cx, cy + 6);
  drawSlider(ctx, cx, cy + 10, cw, remoteState.takeoffAlt / 100, '#00f0ff');
  cy += 20;

  // Guided takeoff button
  drawCyberButton(ctx, cx, cy, cw, 24, '▲ LAUNCH GUIDED TAKEOFF', '#00f0ff');
  remoteState.clickRegions.push({
    x: cx,
    y: cy,
    w: cw,
    h: 24,
    action: () => {
      remoteState.isArmed = true;
      remoteState.flightMode = 'GUIDED';
      telem.armed = true;
      telem.mode = 'GUIDED';
      telem.alt = remoteState.takeoffAlt;
    },
  });

  cy += 28;

  // Flight Modes Grid (2 columns x 4 rows)
  const modeW = (cw - 4) / 2;
  const modes = [
    { label: 'HOLD [LOITER]', mode: 'LOITER', col: '#ffb900' },
    { label: 'RESUME [AUTO]', mode: 'AUTO', col: '#00ff9d' },
    { label: 'RTL [HOME]', mode: 'RTL', col: '#ffb900' },
    { label: '▼ LAND', mode: 'LAND', col: '#00f0ff' },
    { label: 'GUIDED', mode: 'GUIDED', col: '#00f0ff' },
    { label: 'STABILIZE', mode: 'STABILIZE', col: '#00f0ff' },
  ];

  for (let i = 0; i < modes.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = cx + col * (modeW + 4);
    const by = cy + row * 24;

    const isActive = telem.mode === modes[i].mode;
    drawCyberButton(
      ctx,
      bx,
      by,
      modeW,
      20,
      modes[i].label,
      isActive ? '#ffffff' : modes[i].col,
      isActive
    );

    remoteState.clickRegions.push({
      x: bx,
      y: by,
      w: modeW,
      h: 20,
      action: () => {
        remoteState.flightMode = modes[i].mode;
        telem.mode = modes[i].mode;
      },
    });
  }

  cy += Math.ceil(modes.length / 2) * 24 + 4;

  // Cruise Speed slider
  ctx.font = 'bold 7px Consolas, monospace';
  ctx.fillStyle = '#ffb900';
  ctx.textAlign = 'left';
  ctx.fillText(`CRUISE SPEED: ${remoteState.cruiseSpeed} m/s`, cx, cy + 6);
  drawSlider(ctx, cx, cy + 10, cw, remoteState.cruiseSpeed / 30, '#ffb900');
}

// -----------------------------------------------------------------------------
// PANEL D: FAILSAFE & EMERGENCY
// -----------------------------------------------------------------------------
function drawFailsafeCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  telem: TelemetryData
): void {
  drawCardFrame(ctx, x, y, w, h, 'FAILSAFE INTERLOCK STATUS');

  const pad = 8;
  const cx = x + pad;
  let cy = y + 24;
  const cw = w - pad * 2;

  // E-STOP Button
  const eGrad = ctx.createLinearGradient(cx, cy, cx + cw, cy);
  eGrad.addColorStop(0, 'rgba(255, 46, 77, 0.4)');
  eGrad.addColorStop(1, 'rgba(255, 46, 77, 0.1)');

  ctx.fillStyle = eGrad;
  ctx.fillRect(cx, cy, cw, 28);
  ctx.strokeStyle = '#ff2e4d';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx, cy, cw, 28);

  ctx.font = 'bold 7.5px Orbitron, sans-serif';
  ctx.fillStyle = '#ff2e4d';
  ctx.textAlign = 'center';
  ctx.fillText('🚨 EMERGENCY MOTOR SHUTDOWN [E-STOP]', cx + cw / 2, cy + 18);

  remoteState.clickRegions.push({
    x: cx,
    y: cy,
    w: cw,
    h: 28,
    action: () => {
      remoteState.estopActive = true;
      remoteState.isArmed = false;
      telem.armed = false;
      telem.mode = 'FAILSAFE';
    },
  });

  cy += 34;

  // Failsafe status rows
  const fsItems = [
    ['LOW BATTERY (<14.0V)', 'AUTO RTL & DESCEND'],
    ['TELEMETRY LINK (>3.0s)', 'AUTO RETURN HOME'],
    ['GNSS INTEGRITY', 'ALTHOLD / LAND'],
    ['GEOFENCE PERIMETER', 'AUTO TURNAROUND'],
    ['WIND & VELOCITY', 'CRUISE THROTTLE'],
    ['EKF SENSOR FUSION', 'IMU REDUNDANCY'],
  ];

  ctx.font = 'bold 7px Consolas, monospace';
  for (const [title, action] of fsItems) {
    // LED
    ctx.fillStyle = '#00ff9d';
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#cfd8dc';
    ctx.textAlign = 'left';
    ctx.fillText(title, cx + 12, cy + 9);

    // Action badge
    ctx.fillStyle = '#78909c';
    ctx.textAlign = 'right';
    ctx.fillText(action, cx + cw, cy + 9);

    cy += 16;
  }

  cy += 6;

  // Geofence slider
  ctx.font = 'bold 7px Consolas, monospace';
  ctx.fillStyle = '#00ff9d';
  ctx.textAlign = 'left';
  ctx.fillText(`GEOFENCE: ${remoteState.geofenceRadius}m`, cx, cy + 6);
  drawSlider(ctx, cx, cy + 10, cw, remoteState.geofenceRadius / 5000, '#00ff9d');
  cy += 22;

  // Reboot Autopilot
  drawCyberButton(ctx, cx, cy, cw, 22, '⟲ REBOOT AUTOPILOT', '#ffb900');
}

// -----------------------------------------------------------------------------
// PANEL E: SUBSYSTEM TELEMETRY MATRIX
// -----------------------------------------------------------------------------
function drawHealthCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  telem: TelemetryData
): void {
  drawCardFrame(ctx, x, y, w, h, 'SUBSYSTEM TELEMETRY MATRIX');

  const pad = 8;
  const cx = x + pad;
  let cy = y + 24;
  const cw = w - pad * 2;

  const rows = [
    { title: 'FLIGHT CTRL', val: 'PIXHAWK [ARDUPILOT 4.5]', col: '#00f0ff' },
    { title: 'POWER SYS', val: `${telem.volts.toFixed(1)}V [${telem.amps.toFixed(1)}A | ${telem.mah_drawn} mAh]`, col: '#00ff9d' },
    { title: 'GNSS NAV', val: `3D FIX [${telem.satellites} SATS | HDOP 0.8]`, col: '#00f0ff' },
    { title: 'RF LINK', val: `${telem.rssi} dBm [${telem.latency}ms LATENCY]`, col: '#00ff9d' },
    { title: 'PROPULSION', val: telem.armed ? 'MOTORS 1-4 [ACTIVE]' : 'MOTORS 1-4 [STANDBY]', col: '#00f0ff' },
    { title: 'IMU / EKF3', val: 'EKF3 FUSION [HEALTHY]', col: '#00ff9d' },
  ];

  for (const r of rows) {
    ctx.font = 'bold 6.5px Orbitron, sans-serif';
    ctx.fillStyle = '#607d8b';
    ctx.textAlign = 'left';
    ctx.fillText(r.title, cx, cy + 6);

    ctx.fillStyle = 'rgba(4, 12, 20, 0.7)';
    ctx.fillRect(cx, cy + 9, cw, 16);
    ctx.fillStyle = r.col;
    ctx.fillRect(cx, cy + 9, 2, 16);

    ctx.font = 'bold 7px Consolas, monospace';
    ctx.fillText(r.val, cx + 6, cy + 20);

    cy += 28;
  }

  // Battery ProgressBar
  const barH = 14;
  ctx.fillStyle = '#09121c';
  ctx.fillRect(cx, cy + 4, cw, barH);
  ctx.strokeStyle = 'rgba(0, 255, 157, 0.4)';
  ctx.strokeRect(cx, cy + 4, cw, barH);

  const fillW = cw * (telem.battery_pct / 100);
  ctx.fillStyle = '#00ff9d';
  ctx.fillRect(cx, cy + 4, fillW, barH);

  ctx.font = 'bold 7px Consolas, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`BATTERY: ${telem.battery_pct}%`, cx + cw / 2, cy + 14);
}

// -----------------------------------------------------------------------------
// BOTTOM LIVE BANNER
// -----------------------------------------------------------------------------
function drawLiveBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  telem: TelemetryData
): void {
  const tags = [
    { label: `MODE: ${telem.mode}`, col: '#00f0ff', bg: 'rgba(4, 14, 24, 0.86)' },
    { label: telem.armed ? 'ARM: ARMED' : 'ARM: DISARMED', col: telem.armed ? '#00ff9d' : '#ff2e4d', bg: 'rgba(24, 4, 8, 0.86)' },
    { label: `ALT: ${telem.alt.toFixed(1)}m AGL`, col: '#00ff9d', bg: 'rgba(4, 20, 12, 0.86)' },
    { label: `SPD: ${telem.speed.toFixed(1)} m/s`, col: '#00f0ff', bg: 'rgba(4, 14, 24, 0.86)' },
    { label: `SATS: ${telem.satellites}`, col: '#00ff9d', bg: 'rgba(4, 20, 12, 0.86)' },
  ];

  const tagW = (w - (tags.length - 1) * 6) / tags.length;

  for (let i = 0; i < tags.length; i++) {
    const tx = x + i * (tagW + 6);
    ctx.fillStyle = tags[i].bg;
    ctx.fillRect(tx, y, tagW, h);
    ctx.strokeStyle = tags[i].col;
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, y, tagW, h);

    ctx.font = 'bold 7.5px Orbitron, sans-serif';
    ctx.fillStyle = tags[i].col;
    ctx.textAlign = 'center';
    ctx.fillText(tags[i].label, tx + tagW / 2, y + 17);
  }
}

// -----------------------------------------------------------------------------
// HELPER DRAW FUNCTIONS
// -----------------------------------------------------------------------------
function drawCardFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
): void {
  ctx.fillStyle = 'rgba(6, 10, 16, 0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.24)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Top title tab
  ctx.font = 'bold 7.5px Orbitron, sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + 8, y + 14);
}

function drawCyberButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  col: string,
  solid: boolean = false
): void {
  if (solid) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
    ctx.font = 'bold 7.5px Orbitron, sans-serif';
    ctx.fillStyle = '#000000';
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.font = 'bold 7.5px Orbitron, sans-serif';
    ctx.fillStyle = col;
  }
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 3);
}

function drawSlider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  val: number,
  col: string
): void {
  ctx.fillStyle = '#121e2b';
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w * Math.min(1, Math.max(0, val)), 3);

  // Handle
  const hx = x + w * Math.min(1, Math.max(0, val));
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx, y + 1.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.stroke();
}

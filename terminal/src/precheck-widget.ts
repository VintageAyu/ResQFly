// =============================================================================
// RESQFLY CONSOLE — PRE-FLIGHT DIAGNOSTICS WIDGET (TypeScript Port)
// =============================================================================

const CHECKLIST_ITEMS = [
  { id: 'battery', name: 'Battery Voltage & Capacity', code: 'SYS.01 // PWR', icon: '⚡', detail: '22.8V 6S (98% Charge) — Nominal', metrics: { Voltage: '22.84 V', Cells: '6S Balance', Current: '0.38 A', Health: '99.2%' } },
  { id: 'motors', name: 'Motors & ESC Diagnostics', code: 'SYS.02 // PROPULSION', icon: '⚙️', detail: 'M1-M4 Temp Avg 32°C — ESC Link Active', metrics: { 'M1-M4 RPM': '0 (Armed Ready)', 'Avg Temp': '32.1 °C', 'ESC Sync': 'DShot600', 'CAN Bus': '100% OK' } },
  { id: 'imu', name: 'IMU & Dual Gyroscope', code: 'SYS.03 // NAV-ATT', icon: '🧭', detail: 'Primary & Secondary Gyros Calibrated', metrics: { 'Gyro Drift': '0.002 °/s', 'Accel Calib': 'PASSED', 'Redundancy': 'Dual MPU6000', 'Temp': '36.4 °C' } },
  { id: 'gps', name: 'GPS & Navigation System', code: 'SYS.04 // GNSS', icon: '🛰️', detail: '3D Fix Acquired (18 Satellites)', metrics: { '3D Fix': 'LOCKED', 'Satellites': '18 GPS/GLO', 'HDOP': '0.74', 'RTK': '±1.2 cm' } },
  { id: 'compass', name: 'Magnetometer & Compass', code: 'SYS.05 // MAG', icon: '🧭', detail: 'Field Interference Normal (< 2%)', metrics: { 'Field Norm': '482 mG', 'Interference': '1.4%', 'Heading': '042° NE', 'Offset': '0.04°' } },
  { id: 'link', name: 'Control Data Telemetry Link', code: 'SYS.06 // TELEM', icon: '📡', detail: '900MHz Crossfire Link — 99.4% RSSI', metrics: { Protocol: 'CRSF 900MHz', RSSI: '99.4%', 'LQ': '100 (300Hz)', Latency: '4.2 ms' } },
  { id: 'props', name: 'Propeller Lock & Actuators', code: 'SYS.07 // MECH', icon: '🔄', detail: 'Sensors Check Secure / Servo Neutral', metrics: { 'CW Rotors': 'LOCKED', 'CCW Rotors': 'LOCKED', Vibration: '0.01 g', 'Servo Trim': '0.00 mm' } },
  { id: 'gimbal', name: 'Gimbal & Optical Payload', code: 'SYS.08 // PAYLOAD', icon: '📷', detail: '3-Axis Pitch/Roll/Yaw Locked', metrics: { Stabilization: '3-Axis Active', 'Pitch/Roll': '0.0° / 0.0°', 'Camera Link': '4K HDR 60fps', 'IR Sensor': 'READY' } },
  { id: 'airspace', name: 'Geofence & Airspace Database', code: 'SYS.09 // AIRSPACE', icon: '🛡️', detail: 'Alt 0.0m AGL — Local Flyzone Clear', metrics: { 'NFZ Status': 'CLEAR (Class G)', Flyzone: 'LOCAL', 'Max Alt': '120m AGL', NOTAMs: '0 Active' } },
];

type CheckStatus = 'standby' | 'checking' | 'go' | 'nogo';

// Running check state
let checkIndex = -1;
let checkPhase: 'idle' | 'running' | 'done' = 'idle';
let checkTimers: Map<string, { status: CheckStatus; progress: number }> = new Map();
let lastCheckTime = 0;
let autoStarted = false;

function getStatusColor(status: CheckStatus): string {
  switch (status) {
    case 'standby': return 'rgb(245,158,11)';
    case 'checking': return 'rgb(255,45,60)';
    case 'go': return 'rgb(0,255,157)';
    case 'nogo': return 'rgb(255,46,77)';
  }
}

function getStatusLabel(status: CheckStatus): string {
  switch (status) {
    case 'standby': return 'STANDBY';
    case 'checking': return 'CHECKING...';
    case 'go': return '✓ GO';
    case 'nogo': return '✗ NO-GO';
  }
}

export function drawPrecheckWidget(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const t = performance.now() / 1000;

  // Initialize check states
  if (checkTimers.size === 0) {
    for (const item of CHECKLIST_ITEMS) {
      checkTimers.set(item.id, { status: 'standby', progress: 0 });
    }
  }

  // Auto-start check sequence
  if (!autoStarted) {
    autoStarted = true;
    checkPhase = 'running';
    checkIndex = 0;
    lastCheckTime = t;
  }

  // Progress the check sequence
  if (checkPhase === 'running' && checkIndex >= 0 && checkIndex < CHECKLIST_ITEMS.length) {
    const item = CHECKLIST_ITEMS[checkIndex];
    const state = checkTimers.get(item.id)!;

    if (state.status === 'standby') {
      state.status = 'checking';
      state.progress = 0;
      lastCheckTime = t;
    }

    if (state.status === 'checking') {
      state.progress = Math.min(1, (t - lastCheckTime) / 1.2);
      if (state.progress >= 1) {
        state.status = 'go';
        checkIndex++;
        lastCheckTime = t;
        if (checkIndex >= CHECKLIST_ITEMS.length) {
          checkPhase = 'done';
        }
      }
    }
  }

  // Background
  ctx.fillStyle = 'rgb(4,4,6)';
  ctx.fillRect(0, 0, w, h);

  const margin = 10;
  const leftW = Math.min(450, w * 0.55);
  const rightW = w - leftW - margin * 3;
  const rightX = leftW + margin * 2;

  // LEFT: Checklist cards
  ctx.font = 'bold 11px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.textAlign = 'left';
  ctx.fillText('PRE-FLIGHT SYSTEM DIAGNOSTICS', margin, margin + 14);

  let cy = margin + 30;
  const cardH = Math.min(44, (h - 80) / CHECKLIST_ITEMS.length);

  for (const item of CHECKLIST_ITEMS) {
    if (cy + cardH > h - margin) break;
    const state = checkTimers.get(item.id)!;
    const statusColor = getStatusColor(state.status);

    // Card bg
    ctx.fillStyle = state.status === 'checking' ? 'rgba(24,14,18,0.98)' : 'rgba(14,10,12,0.94)';
    ctx.fillRect(margin, cy, leftW - margin, cardH - 2);
    ctx.strokeStyle = state.status === 'checking' ? 'rgba(255,45,60,0.8)' : 'rgba(80,18,24,0.63)';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, cy, leftW - margin, cardH - 2);

    // Status LED
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(margin + 14, cy + cardH / 2 - 1, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pulse for checking
    if (state.status === 'checking') {
      const pulseR = 5 + Math.sin(t * 8) * 3;
      ctx.strokeStyle = `rgba(255,45,60,${0.3 + Math.sin(t * 8) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(margin + 14, cy + cardH / 2 - 1, pulseR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Icon + Name
    ctx.font = 'bold 9px Orbitron, sans-serif';
    ctx.fillStyle = 'rgb(245,240,242)';
    ctx.textAlign = 'left';
    ctx.fillText(`${item.icon} ${item.name}`, margin + 26, cy + 14);

    // Code
    ctx.font = '7px Consolas, monospace';
    ctx.fillStyle = 'rgb(170,120,128)';
    ctx.fillText(item.code, margin + 26, cy + 26);

    // Status badge
    ctx.font = 'bold 7px Orbitron, sans-serif';
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'right';
    ctx.fillText(getStatusLabel(state.status), leftW - 4, cy + 14);

    // Progress bar for checking
    if (state.status === 'checking') {
      const barW = 80;
      const barX = leftW - barW - 4;
      const barY = cy + 22;
      ctx.fillStyle = 'rgba(80,18,24,0.5)';
      ctx.fillRect(barX, barY, barW, 4);
      ctx.fillStyle = 'rgb(255,45,60)';
      ctx.fillRect(barX, barY, barW * state.progress, 4);
    }

    // Detail text for go items
    if (state.status === 'go') {
      ctx.font = '7px Consolas, monospace';
      ctx.fillStyle = 'rgb(0,255,157)';
      ctx.textAlign = 'right';
      ctx.fillText(item.detail, leftW - 4, cy + 26);
    }

    cy += cardH;
  }

  // RIGHT: Drone Schematic
  drawDroneSchematic(ctx, rightX, margin, rightW, h * 0.55, t);

  // RIGHT BOTTOM: Waveform
  drawVoiceWaveform(ctx, rightX, margin + h * 0.58, rightW, 44, t, checkPhase === 'running');

  // Master banner
  const allGo = Array.from(checkTimers.values()).every(s => s.status === 'go');
  const bannerH = 36;
  const bannerY = h - bannerH - margin;
  ctx.fillStyle = allGo ? 'rgba(0,40,20,0.9)' : 'rgba(40,10,10,0.9)';
  ctx.fillRect(margin, bannerY, w - margin * 2, bannerH);
  ctx.strokeStyle = allGo ? 'rgb(0,255,157)' : 'rgb(255,35,50)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin, bannerY, w - margin * 2, bannerH);

  ctx.font = 'bold 12px Orbitron, sans-serif';
  ctx.fillStyle = allGo ? 'rgb(0,255,157)' : 'rgb(255,35,50)';
  ctx.textAlign = 'center';
  ctx.fillText(
    allGo ? '✓ ALL SYSTEMS GO — MISSION READY' : '⏳ PRE-FLIGHT CHECK IN PROGRESS...',
    w / 2, bannerY + 22
  );
}

function drawDroneSchematic(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number): void {
  ctx.fillStyle = 'rgba(10,8,10,0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(80,18,24,0.63)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  ctx.font = 'bold 8px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.textAlign = 'center';
  ctx.fillText('UAV SUBSYSTEM LOCATOR', x + w / 2, y + 14);

  const cx = x + w / 2;
  const cy = y + h / 2 + 10;
  const scale = Math.min(w, h) * 0.3;

  // Draw drone body
  ctx.strokeStyle = 'rgba(0,245,255,0.6)';
  ctx.lineWidth = 1.5;

  // Central body
  ctx.beginPath();
  ctx.rect(cx - scale * 0.25, cy - scale * 0.25, scale * 0.5, scale * 0.5);
  ctx.stroke();

  // Arms and motors
  const motorPositions = [
    { x: cx + scale * 0.5, y: cy - scale * 0.5, label: 'M1', color: 'rgb(220,38,38)' },
    { x: cx - scale * 0.5, y: cy - scale * 0.5, label: 'M2', color: 'rgb(220,38,38)' },
    { x: cx + scale * 0.5, y: cy + scale * 0.5, label: 'M3', color: 'rgb(240,245,252)' },
    { x: cx - scale * 0.5, y: cy + scale * 0.5, label: 'M4', color: 'rgb(240,245,252)' },
  ];

  for (const motor of motorPositions) {
    // Arm
    ctx.strokeStyle = motor.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(motor.x, motor.y);
    ctx.stroke();

    // Motor pod
    ctx.fillStyle = 'rgba(51,65,85,0.8)';
    ctx.beginPath();
    ctx.arc(motor.x, motor.y, scale * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Prop disc (rotating)
    const propAngle = t * 4;
    ctx.strokeStyle = 'rgba(0,210,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(motor.x, motor.y, scale * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating line
    ctx.beginPath();
    ctx.moveTo(motor.x + scale * 0.18 * Math.cos(propAngle), motor.y + scale * 0.18 * Math.sin(propAngle));
    ctx.lineTo(motor.x - scale * 0.18 * Math.cos(propAngle), motor.y - scale * 0.18 * Math.sin(propAngle));
    ctx.stroke();

    // Label
    ctx.font = 'bold 7px Orbitron, sans-serif';
    ctx.fillStyle = 'rgb(245,240,242)';
    ctx.textAlign = 'center';
    ctx.fillText(motor.label, motor.x, motor.y + scale * 0.28);
  }

  // Forward indicator
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - scale * 0.3);
  ctx.lineTo(cx - 6, cy - scale * 0.22);
  ctx.lineTo(cx + 6, cy - scale * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 7px Orbitron, sans-serif';
  ctx.fillText('FWD', cx, cy - scale * 0.35);
}

function drawVoiceWaveform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, active: boolean): void {
  ctx.fillStyle = 'rgba(8,5,7,0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,35,50,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  const cy = y + h / 2;
  ctx.strokeStyle = 'rgba(255,35,50,0.24)';
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + w, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  const bars = 36;
  const barW = (w - bars * 2) / Math.max(1, bars);

  for (let i = 0; i < bars; i++) {
    const bx = x + i * (barW + 2) + 2;
    const normX = i / bars;

    let barH: number;
    let col: string;

    if (active) {
      const envelope = Math.sin(normX * Math.PI);
      const wave1 = Math.sin(t * 4 + normX * 9);
      const wave2 = Math.cos(t * 6 + normX * 14) * 0.5;
      const wave3 = Math.sin(t * 2.8 - normX * 6) * 0.3;
      const amp = (wave1 + wave2 + wave3) / 1.8;
      barH = Math.max(3, Math.abs(amp) * envelope * h * 0.82);
      col = `rgba(255,45,60,${0.67 + envelope * 0.33})`;
    } else {
      const amp = Math.sin(t * 0.6 + normX * 4) * 0.25 + 0.35;
      barH = Math.max(2, amp * 4);
      col = 'rgba(170,25,35,0.27)';
    }

    const by = cy - barH / 2;
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, barW, barH);
  }
}

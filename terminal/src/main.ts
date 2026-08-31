// =============================================================================
// RESQFLY CONSOLE — MAIN APPLICATION ENTRY POINT (TypeScript Port)
// =============================================================================
// Orchestrates the entire application: login flow, intro animation sequence,
// hex background expansion, sand simulation, glitch intro, tab switching,
// settings bindings, terminal commands, and the 60fps paint loop.
// =============================================================================

import './styles.css';
import { createDefaultState, type AppState } from './types';
import { paintFrame, drawGlitchIntro, getSandSim } from './painting';
import { drawBioHoloWidget } from './bio-holo-widget';
import { drawStatusWidget } from './status-widget';
import { drawPrecheckWidget } from './precheck-widget';
import { drawSarMapWidget } from './sar-map-widget';
import { drawRemoteWidget } from './remote-widget';
import { drawOpticsWidget } from './sar-optics-widget';
import { TelemetryService } from './telemetry-service';

// --- GLOBAL STATE ---
const state: AppState = createDefaultState();
const telemetry = new TelemetryService();

// --- DOM ELEMENTS ---
const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const mainCtx = mainCanvas.getContext('2d')!;
const loginOverlay = document.getElementById('login-overlay') as HTMLDivElement;
const loginCanvas = document.getElementById('login-canvas') as HTMLCanvasElement;
const loginCtx = loginCanvas.getContext('2d')!;
const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
const loginUser = document.getElementById('login-user') as HTMLInputElement;
const loginPass = document.getElementById('login-pass') as HTMLInputElement;
const loginMsg = document.getElementById('login-msg') as HTMLDivElement;
const loginHeader = document.getElementById('login-header') as HTMLDivElement;
const contentDiv = document.getElementById('content') as HTMLDivElement;
const termOutput = document.getElementById('terminal-output') as HTMLDivElement;
const termInput = document.getElementById('terminal-input') as HTMLInputElement;
const tabBar = document.getElementById('tab-bar') as HTMLDivElement;

// Canvas elements for each tab
let bioCanvas: HTMLCanvasElement | null = null;
let bioCtx: CanvasRenderingContext2D | null = null;
let statusCanvas: HTMLCanvasElement | null = null;
let statusCtx: CanvasRenderingContext2D | null = null;
let precCanvas: HTMLCanvasElement | null = null;
let precCtx: CanvasRenderingContext2D | null = null;
let mapCanvas: HTMLCanvasElement | null = null;
let mapCtx: CanvasRenderingContext2D | null = null;
let remoteCanvas: HTMLCanvasElement | null = null;
let remoteCtx: CanvasRenderingContext2D | null = null;
let opticsCanvas: HTMLCanvasElement | null = null;
let opticsCtx: CanvasRenderingContext2D | null = null;

// --- RESIZE HANDLER ---
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  mainCanvas.width = window.innerWidth * dpr;
  mainCanvas.height = window.innerHeight * dpr;
  mainCanvas.style.width = window.innerWidth + 'px';
  mainCanvas.style.height = window.innerHeight + 'px';
  mainCtx.scale(dpr, dpr);

  state.hexMaxRadius = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) / 2 + 100;

  // Dynamic Content Padding inside Cyberpunk Inner Frame
  const sx = window.innerWidth / 1000;
  const sy = window.innerHeight / 640;
  const padLeft = Math.max(28, Math.round(75 * sx));
  const padRight = Math.max(28, Math.round(75 * sx));
  const padTop = Math.max(55, Math.round(112 * sy));
  const padBottom = Math.max(50, Math.round(115 * sy));
  contentDiv.style.padding = `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`;

  // Login canvas
  loginCanvas.width = loginOverlay.offsetWidth * dpr;
  loginCanvas.height = loginOverlay.offsetHeight * dpr;
  loginCanvas.style.width = loginOverlay.offsetWidth + 'px';
  loginCanvas.style.height = loginOverlay.offsetHeight + 'px';
  loginCtx.scale(dpr, dpr);

  // Tab canvases
  resizeTabCanvas('bio-canvas');
  resizeTabCanvas('status-canvas');
  resizeTabCanvas('prec-canvas');
  resizeTabCanvas('map-canvas');
  resizeTabCanvas('remote-canvas');
  resizeTabCanvas('optics-canvas');
}

function resizeTabCanvas(id: string): void {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = parent.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
}

// --- FULLSCREEN CONTROLS ---
function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    enterFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
}

function enterFullscreen(): void {
  if (!document.fullscreenElement) {
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen().catch(() => {});
    }
  }
}

// --- LOGIN LOGIC ---
loginBtn.addEventListener('click', attemptLogin);
loginUser.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginPass.focus(); });
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });

function attemptLogin(): void {
  const user = loginUser.value.trim();
  const pass = loginPass.value.trim();

  if (!user || !pass) {
    loginMsg.textContent = '⚠ IDENTITY & PASSPHRASE REQUIRED';
    return;
  }

  // Request fullscreen on login launch
  enterFullscreen();

  // Accept any credentials (same as Python version)
  loginMsg.textContent = '';
  state.authenticated = true;
  loginOverlay.classList.add('hidden');

  // Start intro sequence (sand simulation)
  state.introSequenceActive = true;
  state.introTick = 0;
  state.startupPhase = 0;
  state.startupTick = 0;
}

// --- LOGIN FRAME PAINTING ---
let loginPhase = 0;
let loginTick = 0;

function drawLoginFrame(): void {
  if (state.authenticated) return;

  const w = loginOverlay.offsetWidth;
  const h = loginOverlay.offsetHeight;
  const t = performance.now() / 1000;

  loginCtx.clearRect(0, 0, w, h);

  // Border frame
  const sx = w / 760;
  const sy = h / 440;

  // Outer octagonal frame
  loginCtx.beginPath();
  loginCtx.moveTo(8 * sx, 35 * sy);
  loginCtx.lineTo(35 * sx, 8 * sy);
  loginCtx.lineTo(725 * sx, 8 * sy);
  loginCtx.lineTo(752 * sx, 35 * sy);
  loginCtx.lineTo(752 * sx, 405 * sy);
  loginCtx.lineTo(725 * sx, 432 * sy);
  loginCtx.lineTo(35 * sx, 432 * sy);
  loginCtx.lineTo(8 * sx, 405 * sy);
  loginCtx.closePath();
  loginCtx.fillStyle = 'rgba(8,10,14,0.88)';
  loginCtx.fill();
  loginCtx.strokeStyle = `rgba(255,42,42,${0.6 + 0.3 * Math.sin(t * 4)})`;
  loginCtx.lineWidth = 2;
  loginCtx.stroke();

  // Scanning line
  const scanY = (loginTick % 200) / 200 * h;
  loginCtx.fillStyle = 'rgba(255,35,50,0.06)';
  loginCtx.fillRect(0, scanY - 2, w, 4);

  // Corner tech accents
  const cornerSize = 12;
  loginCtx.strokeStyle = 'rgba(255,42,42,0.9)';
  loginCtx.lineWidth = 2;
  // TL
  loginCtx.beginPath(); loginCtx.moveTo(8 * sx, 60 * sy); loginCtx.lineTo(8 * sx, 35 * sy); loginCtx.lineTo(35 * sx, 8 * sy); loginCtx.lineTo(60 * sx, 8 * sy); loginCtx.stroke();
  // TR
  loginCtx.beginPath(); loginCtx.moveTo(700 * sx, 8 * sy); loginCtx.lineTo(725 * sx, 8 * sy); loginCtx.lineTo(752 * sx, 35 * sy); loginCtx.lineTo(752 * sx, 60 * sy); loginCtx.stroke();
  // BL
  loginCtx.beginPath(); loginCtx.moveTo(8 * sx, 380 * sy); loginCtx.lineTo(8 * sx, 405 * sy); loginCtx.lineTo(35 * sx, 432 * sy); loginCtx.lineTo(60 * sx, 432 * sy); loginCtx.stroke();
  // BR
  loginCtx.beginPath(); loginCtx.moveTo(700 * sx, 432 * sy); loginCtx.lineTo(725 * sx, 432 * sy); loginCtx.lineTo(752 * sx, 405 * sy); loginCtx.lineTo(752 * sx, 380 * sy); loginCtx.stroke();

  // Glitch bars
  if (Math.random() > 0.93) {
    const barY = Math.random() * h;
    const barH = 1 + Math.random() * 3;
    loginCtx.fillStyle = `rgba(255,42,42,${0.1 + Math.random() * 0.15})`;
    loginCtx.fillRect(0, barY, w, barH);
  }

  // Show header and inputs after frame draws
  if (!loginHeader.style.display || loginHeader.style.display === 'none') {
    loginHeader.style.display = 'block';
  }

  loginTick++;
}

// --- TAB SWITCHING ---
const tabTitleMap: Record<string, string> = {
  terminal: 'TERMINAL',
  bio: 'BIO MONITOR',
  status: 'SYSTEM STATUS',
  prec: 'PRE-CHECK MATRIX',
  map: 'SAR TACTICAL MAP',
  optics: 'EO/IR OPTICS',
  remote: 'REMOTE C2',
  settings: 'SETTINGS',
};

const appTitleEl = document.getElementById('app-title');

tabBar.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('tab')) return;

  const tabId = target.dataset.tab!;
  state.activeTab = tabId;

  // Update header title
  if (appTitleEl) {
    appTitleEl.textContent = tabTitleMap[tabId] || tabId.toUpperCase();
  }

  // Update tab button states
  tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  target.classList.add('active');

  // Show only the selected tab panel
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`panel-${tabId}`);
  if (panel) panel.classList.add('active');

  // Resize canvas for the active tab
  setTimeout(() => {
    resizeTabCanvas('bio-canvas');
    resizeTabCanvas('status-canvas');
    resizeTabCanvas('prec-canvas');
    resizeTabCanvas('map-canvas');
    resizeTabCanvas('remote-canvas');
    resizeTabCanvas('optics-canvas');
  }, 10);

  // Log to terminal
  addTerminalLog(`WORKSPACE ACTIVE: Switched to [${tabId.toUpperCase()}] Tab`, 'TAB');
});
// --- SAR & CLI STATE ---
let sarMissionActive = false;
let sarCurrentWp = 1;
let sarTotalWps = 16;
const cmdHistory: string[] = [];
let historyIndex = -1;

function updateTerminalTelemetryBar(): void {
  const t = state.telemetry;
  const tbLink = document.getElementById('tb-link');
  const tbGnss = document.getElementById('tb-gnss');
  const tbBatt = document.getElementById('tb-batt');
  const tbMode = document.getElementById('tb-mode');
  const tbArm = document.getElementById('tb-arm');
  const tbSar = document.getElementById('tb-sar');

  if (tbLink) {
    const valEl = tbLink.querySelector('.val');
    if (valEl) valEl.textContent = `915MHz RFD900X (${t.rssi} dBm / ${(100 - t.loss * 100).toFixed(1)}%)`;
  }
  if (tbGnss) {
    const valEl = tbGnss.querySelector('.val');
    if (valEl) valEl.textContent = `${t.gps_fix} (${t.satellites} SATS / ±1.2cm RTK)`;
  }
  if (tbBatt) {
    const valEl = tbBatt.querySelector('.val');
    if (valEl) valEl.textContent = `${t.volts.toFixed(1)}V (${t.battery_pct}% / ${t.amps.toFixed(1)}A)`;
  }
  if (tbMode) {
    const valEl = tbMode.querySelector('.val');
    if (valEl) valEl.textContent = t.mode;
  }
  if (tbArm) {
    const valEl = tbArm.querySelector('.val');
    const dotEl = tbArm.querySelector('.chip-dot');
    if (valEl) valEl.textContent = t.armed ? 'ARMED (PROPULSION ENGAGED)' : 'DISARMED (SAFE)';
    if (dotEl) dotEl.className = t.armed ? 'chip-dot red' : 'chip-dot yellow';
  }
  if (tbSar) {
    const valEl = tbSar.querySelector('.val');
    const dotEl = tbSar.querySelector('.chip-dot');
    if (sarMissionActive) {
      if (valEl) valEl.textContent = `SWEEP ACTIVE (WP ${sarCurrentWp}/${sarTotalWps})`;
      if (dotEl) dotEl.className = 'chip-dot green';
    } else {
      if (valEl) valEl.textContent = 'GRID STANDBY';
      if (dotEl) dotEl.className = 'chip-dot magenta';
    }
  }
}

// --- TERMINAL COMMANDS ---
termInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const cmd = termInput.value.trim();
    termInput.value = '';
    if (!cmd) return;
    cmdHistory.push(cmd);
    historyIndex = -1;
    executeTerminalCommand(cmd);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (cmdHistory.length > 0) {
      if (historyIndex === -1) historyIndex = cmdHistory.length - 1;
      else if (historyIndex > 0) historyIndex--;
      termInput.value = cmdHistory[historyIndex] || '';
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex !== -1) {
      if (historyIndex < cmdHistory.length - 1) {
        historyIndex++;
        termInput.value = cmdHistory[historyIndex] || '';
      } else {
        historyIndex = -1;
        termInput.value = '';
      }
    }
  }
});

// Quick Action Chips Event Bindings
function bindQuickChips(): void {
  document.querySelectorAll<HTMLButtonElement>('.term-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      if (cmd) {
        cmdHistory.push(cmd);
        historyIndex = -1;
        executeTerminalCommand(cmd);
        termInput.focus();
      }
    });
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function executeTerminalCommand(cmd: string): void {
  const clean = cmd.trim();
  if (!clean) return;

  // Echo command
  addTerminalLog(clean, 'CMD');

  const lower = clean.toLowerCase();
  const parts = lower.split(/\s+/);
  const root = parts[0];

  if (['help', 'flight-help', 'sar-help', 'drone-help', '?'].includes(root)) {
    const helpBox = `
<div class="term-box">
  <div class="term-box-title">RESQFLY AUTONOMOUS TACTICAL GCS — CLI COMMAND SUITE</div>
  <div style="color:#00ff9d;margin-bottom:6px;font-weight:bold;">[1] FLIGHT & PROPULSION CONTROL</div>
  <div>  arm               : Engage propulsion motor ESCs (Armed Ready)</div>
  <div>  disarm            : Emergency motor disarm & safety cutoff</div>
  <div>  takeoff &lt;alt&gt;     : Autonomous guided climb to target altitude (default: 20m)</div>
  <div>  land              : Precision vertical descent & auto touchdown</div>
  <div>  rtl               : Return-To-Launch emergency failsafe override</div>
  <div>  mode &lt;name&gt;       : Set mode (GUIDED, AUTO, LOITER, RTL, LAND, POSHOLD)</div>
  
  <div style="color:#ff8800;margin:8px 0 6px 0;font-weight:bold;">[2] AUTONOMOUS SEARCH & RESCUE (SAR)</div>
  <div>  sar-start         : 1-Click Launch Autonomous Lawnmower Search Sweep</div>
  <div>  sar-grid          : View active search grid geometry & waypoint coordinates</div>
  <div>  sar-upload        : Synchronize search grid waypoints to Pixhawk memory</div>
  <div>  sar-fetch         : Download mission waypoints from Pixhawk memory</div>
  <div>  scan              : Trigger 360° EO/IR thermal multi-spectrum area sweep</div>
  <div>  targets           : List detected survivor heat signatures & GPS coordinates</div>

  <div style="color:#00e5ff;margin:8px 0 6px 0;font-weight:bold;">[3] TELEMETRY & SYSTEM DIAGNOSTICS</div>
  <div>  status            : Tactical subsystem summary, power state & flight metrics</div>
  <div>  telemetry / telem : Live MAVLink v2.0 high-frequency telemetry stream</div>
  <div>  diag              : Run full diagnostic test on all 12 flight modules</div>
  <div>  clear / cls       : Clear console output and restore GCS banner</div>
  <div>  color &lt;hex/rgb&gt;   : Set custom cyberpunk HUD accent color</div>
  <div>  glitch            : Toggle cyber optical glitch distortion</div>

  <div style="color:#d066ff;margin:8px 0 6px 0;font-weight:bold;">[4] WORKSPACE TAB NAVIGATION</div>
  <div>  tab &lt;name&gt;        : Switch tab (terminal, bio, status, prec, map, optics, remote, settings)</div>
</div>`;
    termOutput.innerHTML += helpBox;
  } else if (root === 'clear' || root === 'cls') {
    termOutput.innerHTML = '';
    renderTerminalBanner();
  } else if (root === 'arm') {
    state.telemetry.armed = true;
    addTerminalLog('RUNNING PRE-ARM SAFETY VERIFICATION MATRIX...', 'UAV');
    setTimeout(() => {
      addTerminalLog('✓ IMU Dual Gyros Calibrated | Compass Normal | GNSS 3D Lock', 'OK');
      addTerminalLog('PROPULSION ARMED: 4x DShot600 ESCs ENGAGED (MOTORS READY)', 'WARN');
      updateTerminalTelemetryBar();
    }, 200);
  } else if (root === 'disarm') {
    state.telemetry.armed = false;
    addTerminalLog('PROPULSION DISARMED: Safe mode engaged. ESC signals zeroed.', 'OK');
    updateTerminalTelemetryBar();
  } else if (root === 'takeoff') {
    const alt = parts[1] ? parseFloat(parts[1]) || 20 : 20;
    if (!state.telemetry.armed) {
      state.telemetry.armed = true;
      addTerminalLog('Auto-Arming motors prior to guided climb...', 'UAV');
    }
    state.telemetry.mode = 'GUIDED';
    addTerminalLog(`INITIATING GUIDED TAKEOFF TO ${alt.toFixed(1)}m AGL...`, 'UAV');
    setTimeout(() => {
      state.telemetry.alt = alt;
      state.telemetry.alt_msl = alt;
      addTerminalLog(`TARGET ALTITUDE ${alt.toFixed(1)}m REACHED. Loitering at position.`, 'OK');
      updateTerminalTelemetryBar();
    }, 600);
  } else if (root === 'land') {
    state.telemetry.mode = 'LAND';
    addTerminalLog('ENGAGING CONTROLLED VERTICAL LANDING SEQUENCE...', 'UAV');
    setTimeout(() => {
      state.telemetry.alt = 0.0;
      state.telemetry.armed = false;
      addTerminalLog('TOUCHDOWN CONFIRMED: Motors disarmed. Flight logged.', 'OK');
      updateTerminalTelemetryBar();
    }, 800);
  } else if (root === 'rtl') {
    state.telemetry.mode = 'RTL';
    addTerminalLog('ENGAGING RETURN TO LAUNCH (RTL) PROTOCOL...', 'WARN');
    addTerminalLog(`CLIMBING TO SAFE TRANSIT ALTITUDE (45.0m) -> RETURNING HOME: [${state.telemetry.lat.toFixed(6)}, ${state.telemetry.lon.toFixed(6)}]`, 'UAV');
  } else if (root === 'mode') {
    if (parts.length > 1) {
      const modeName = parts[1].toUpperCase();
      state.telemetry.mode = modeName;
      addTerminalLog(`FLIGHT CONTROLLER MODE SWITCHED TO [${modeName}]`, 'UAV');
      updateTerminalTelemetryBar();
    } else {
      addTerminalLog(`Current Mode: ${state.telemetry.mode}. Valid modes: GUIDED, AUTO, LOITER, RTL, LAND, POSHOLD`, 'WARN');
    }
  } else if (root === 'sar-start') {
    sarMissionActive = true;
    state.telemetry.armed = true;
    state.telemetry.mode = 'AUTO_SAR';
    addTerminalLog('LAUNCHING 1-CLICK AUTONOMOUS SAR SWEEP GRID...', 'SAR');
    addTerminalLog('16 Waypoints generated (80m lane spacing, 600m search radius)', 'SAR');
    addTerminalLog('FLIR Thermal Optical Sensor AI Tracking: ENGAGED', 'AI');
    addTerminalLog('MISSION STATUS: SWEEPING QUADRANT ALPHA-1 (WP 1/16)', 'OK');
    updateTerminalTelemetryBar();
  } else if (root === 'sar-grid') {
    const gridBox = `
<div class="term-box">
  <div class="term-box-title">TACTICAL SEARCH & RESCUE GRID SPECIFICATIONS</div>
  <div>Center Datum      : ${state.telemetry.lat.toFixed(6)}° N, ${Math.abs(state.telemetry.lon).toFixed(6)}° W</div>
  <div>Search Radius     : 600 meters (Coverage: 1.13 km²)</div>
  <div>Pattern Type      : Parallel Lawnmower Sweep</div>
  <div>Lane Width        : 80 meters (Camera FOV Overlap: 32%)</div>
  <div>Total Waypoints   : 16 Waypoints (WGS84 3D coordinates)</div>
  <div>Cruise Velocity   : 12.0 m/s (Estimated Sweep Time: 18.5 min)</div>
  <div>Altitude Profile  : Constant 45.0m AGL (Obstacle Clearance: OK)</div>
</div>`;
    termOutput.innerHTML += gridBox;
  } else if (root === 'sar-upload') {
    addTerminalLog('TRANSMITTING 16 SAR MISSION WAYPOINTS VIA MAVLINK TO PIXHAWK...', 'SAR');
    setTimeout(() => {
      addTerminalLog('MISSION_ACK: Waypoint upload verified by Flight Controller (CRC OK)', 'OK');
    }, 300);
  } else if (root === 'sar-fetch') {
    addTerminalLog('QUERYING WAYPOINT STORAGE FROM PIXHAWK FLASH MEMORY...', 'SAR');
    setTimeout(() => {
      addTerminalLog('MISSION_COUNT: 16 Waypoints retrieved successfully. Ready to execute.', 'OK');
    }, 250);
  } else if (root === 'scan') {
    addTerminalLog('INITIATING 360° EO/IR MULTI-SPECTRUM OPTICAL THERMAL SWEEP...', 'AI');
    setTimeout(() => {
      addTerminalLog('✓ Thermal scan complete: 3 heat signatures detected in Quadrant 2', 'OK');
      addTerminalLog('Type "targets" to view localized GPS coordinates & triage data.', 'SAR');
    }, 400);
  } else if (root === 'targets') {
    const targetsBox = `
<div class="term-box">
  <div class="term-box-title">AI THERMAL DETECTION MATRIX — ACTIVE SURVIVOR SIGNATURES</div>
  <div style="color:#00ff9d;">[TARGET #1] POS: 37.775412° N, -122.418930° W | CONF: 96.4% | TYPE: HUMAN (HEAT 37.1°C) | STATUS: LOCATED</div>
  <div style="color:#ffd600;">[TARGET #2] POS: 37.776104° N, -122.420115° W | CONF: 88.2% | TYPE: HUMAN (HEAT 36.8°C) | STATUS: VERIFYING</div>
  <div style="color:#38bdf8;">[TARGET #3] POS: 37.774320° N, -122.417850° W | CONF: 92.0% | TYPE: VEHICLE SIGNATURE    | STATUS: IMMOBILIZED</div>
</div>`;
    termOutput.innerHTML += targetsBox;
  } else if (root === 'status') {
    const t = state.telemetry;
    const statusBox = `
<div class="term-box">
  <div class="term-box-title">TACTICAL DRONE & SUBSYSTEM STATUS SNAPSHOT</div>
  <div>┌───────────────┬─────────────────────────────────┬──────────────────────┐</div>
  <div>│ SUBSYSTEM     │ METRICS & STATE                 │ STATUS               │</div>
  <div>├───────────────┼─────────────────────────────────┼──────────────────────┤</div>
  <div>│ FLIGHT CTRL   │ Pixhawk 6X / ArduPilot v4.5.2   │ <span style="color:#00ff9d;">[ONLINE // NOMINAL]</span>  │</div>
  <div>│ FLIGHT MODE   │ ${t.mode.padEnd(31)} │ <span style="color:#00e5ff;">[ACTIVE]</span>             │</div>
  <div>│ PROPULSION    │ 4x 920KV Motors / DShot600      │ ${t.armed ? '<span style="color:#ff3344;">[ARMED // LIVE]</span>    ' : '<span style="color:#ffd600;">[DISARMED // SAFE]</span> '}│</div>
  <div>│ POWER BUS     │ ${t.volts.toFixed(1)}V / ${t.battery_pct}% (${t.amps.toFixed(1)}A Draw)`.padEnd(50) + `│ <span style="color:#00ff9d;">[NOMINAL 6S]</span>        │</div>
  <div>│ GNSS / RTK    │ ${t.gps_fix} (${t.satellites} Sats / HDOP 0.74)`.padEnd(50) + `│ <span style="color:#00ff9d;">[RTK LOCKED ±1.2cm]</span> │</div>
  <div>│ TELEM LINK    │ 915MHz RFD900X (${t.rssi} dBm / LQ 100%)`.padEnd(50) + `│ <span style="color:#00ff9d;">[LINK QUALITY 99%]</span>  │</div>
  <div>│ PAYLOAD GIMBAL│ FLIR Boson 640 + 4K EO (Active) │ <span style="color:#00ff9d;">[TRACKING NOMINAL]</span>  │</div>
  <div>│ AI SAR ENGINE │ Neural Grid Detector v3.1       │ <span style="color:#d066ff;">[INFERENCE 60 FPS]</span>  │</div>
  <div>└───────────────┴─────────────────────────────────┴──────────────────────┘</div>
</div>`;
    termOutput.innerHTML += statusBox;
  } else if (root === 'telemetry' || root === 'telem') {
    const t = state.telemetry;
    addTerminalLog(`ALT: ${t.alt.toFixed(1)}m | SPD: ${t.speed.toFixed(1)}m/s | V-SPD: ${t.vspeed.toFixed(1)}m/s | HDG: ${Math.round(t.heading)}° | PITCH: ${t.pitch.toFixed(1)}° | ROLL: ${t.roll.toFixed(1)}°`, 'TELEM');
    addTerminalLog(`GPS: [${t.lat.toFixed(6)}, ${t.lon.toFixed(6)}] | SATS: ${t.satellites} (${t.gps_fix}) | BAT: ${t.battery_pct}% (${t.volts.toFixed(1)}V, ${t.amps.toFixed(1)}A)`, 'TELEM');
  } else if (root === 'diag') {
    addTerminalLog('RUNNING FULL HARDWARE DIAGNOSTICS ON ALL 12 MODULES...', 'SYS');
    const modules = [
      'IMU Primary (MPU6000) [PASS]',
      'IMU Secondary (ICM20602) [PASS]',
      'Magnetometer Dual Compass [PASS]',
      'Barometer (MS5611) [PASS]',
      'Septentrio RTK GNSS Receiver [PASS]',
      'DShot600 ESC Telemetry Bus [PASS]',
      'Power Distribution Module & Current Shunt [PASS]',
      '915MHz Telemetry Transceiver [PASS]',
      '4K Optical Sensor & Gimbal Encoders [PASS]',
      'FLIR Thermal Radiometric Core [PASS]',
      'AI Neural Vision Coprocessor [PASS]',
      'Failsafe Geo-fence & Parachute Ejection [PASS]',
    ];
    modules.forEach((mod, idx) => {
      setTimeout(() => {
        addTerminalLog(`[MODULE ${String(idx + 1).padStart(2, '0')}] ${mod}`, 'OK');
      }, (idx + 1) * 80);
    });
  } else if (root === 'tab' && parts.length > 1) {
    switchTabDirect(parts[1]);
  } else if (['bio', 'status', 'prec', 'map', 'optics', 'remote', 'settings'].includes(root)) {
    switchTabDirect(root);
  } else if (clean.startsWith('color ')) {
    try {
      const col = clean.split(' ')[1];
      const temp = document.createElement('div');
      temp.style.color = col;
      document.body.appendChild(temp);
      const computed = getComputedStyle(temp).color;
      document.body.removeChild(temp);
      const match = computed.match(/(\d+)/g);
      if (match && match.length >= 3) {
        state.customColor = { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
        updateColorSliders();
        addTerminalLog(`HUD Accent Color updated to rgb(${state.customColor.r}, ${state.customColor.g}, ${state.customColor.b})`, 'OK');
      }
    } catch {
      addTerminalLog('Invalid color format. Example: "color #00ffff" or "color red"', 'ERROR', true);
    }
  } else if (root === 'glitch') {
    state.heavyGlitchEnabled = !state.heavyGlitchEnabled;
    const chk = document.getElementById('chk-glitch') as HTMLInputElement | null;
    if (chk) chk.checked = state.heavyGlitchEnabled;
    addTerminalLog(`Heavy Cyber Glitch: ${state.heavyGlitchEnabled ? 'ACTIVATED' : 'DEACTIVATED'}`, 'SYS');
  } else if (root === 'hexsize' || root === 'hex') {
    if (parts.length > 1) {
      const sz = parseFloat(parts[1]);
      if (!isNaN(sz) && sz >= 4 && sz <= 60) {
        state.hexSize = sz;
        if (parts.length > 2) {
          const gp = parseFloat(parts[2]);
          if (!isNaN(gp) && gp >= 0 && gp <= 12) state.hexGap = gp;
        }
        const sSize = document.getElementById('slider-hex-size') as HTMLInputElement | null;
        const lSize = document.getElementById('lbl-hex-size');
        const sGap = document.getElementById('slider-hex-gap') as HTMLInputElement | null;
        const lGap = document.getElementById('lbl-hex-gap');
        if (sSize) sSize.value = String(state.hexSize);
        if (lSize) lSize.textContent = `${state.hexSize}px`;
        if (sGap) sGap.value = String(state.hexGap);
        if (lGap) lGap.textContent = `${state.hexGap}px`;
        addTerminalLog(`Honeycomb Matrix Size updated: ${state.hexSize}px (Gap: ${state.hexGap}px)`, 'OK');
      } else {
        addTerminalLog('Usage: hexsize <size> (e.g. "hexsize 14" or "hex 16 2")', 'WARN');
      }
    } else {
      addTerminalLog(`Current Honeycomb Size: ${state.hexSize}px (Gap: ${state.hexGap}px). Usage: hexsize <4-60>`, 'SYS');
    }
  } else {
    addTerminalLog(`Command not recognized: "${clean}". Type "flight-help" for available commands.`, 'WARN');
  }

  // Auto-scroll
  termOutput.scrollTop = termOutput.scrollHeight;
}

function switchTabDirect(tabId: string): void {
  const targetTab = tabBar.querySelector(`[data-tab="${tabId}"]`) as HTMLElement | null;
  if (targetTab) {
    targetTab.click();
  } else {
    addTerminalLog(`Unknown tab: "${tabId}". Available: terminal, bio, status, prec, map, optics, remote, settings`, 'WARN');
  }
}

function addTerminalLog(text: string, category: string = 'SYSTEM', isError: boolean = false, customHtml?: string): void {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  const line = document.createElement('div');
  line.className = 'term-line';

  let badgeClass = 'badge-sys';
  const catUpper = category.toUpperCase();
  if (isError || catUpper.includes('ERROR') || catUpper.includes('FAIL')) badgeClass = 'badge-error';
  else if (catUpper.includes('BOOT')) badgeClass = 'badge-boot';
  else if (catUpper.includes('OK') || catUpper.includes('PASS')) badgeClass = 'badge-ok';
  else if (catUpper.includes('WARN')) badgeClass = 'badge-warn';
  else if (catUpper.includes('SAR')) badgeClass = 'badge-sar';
  else if (catUpper.includes('AI') || catUpper.includes('VISION')) badgeClass = 'badge-ai';
  else if (catUpper.includes('UAV') || catUpper.includes('FLIGHT') || catUpper.includes('TELEM')) badgeClass = 'badge-uav';
  else if (catUpper.includes('CMD')) badgeClass = 'badge-cmd';

  line.innerHTML = `<span class="ts">[${ts}]</span><span class="badge ${badgeClass}">[${category}]</span><span class="msg">${customHtml || escapeHtml(text)}</span>`;
  termOutput.appendChild(line);
  termOutput.scrollTop = termOutput.scrollHeight;
}

function renderTerminalBanner(): void {
  const banner = `
<div class="term-boot-badge">
  <div class="term-boot-row">
    <span class="tb-name">RESQFLY AUTONOMOUS GCS</span>
    <span class="tb-tag">v2.4.8-PRO</span>
    <span class="tb-tag">MAVLink 2.0</span>
    <span class="tb-status">● SYSTEM NOMINAL</span>
  </div>
  <div class="tb-sub">Autopilot: Pixhawk 6X Linked | RTK Fix: ±1.2cm (18 Sats) | FLIR Radiometric Core: ONLINE</div>
</div>`;
  termOutput.innerHTML = banner;
}

// --- SETTINGS BINDINGS ---
function bindSettings(): void {
  const sliderR = document.getElementById('slider-r') as HTMLInputElement;
  const sliderG = document.getElementById('slider-g') as HTMLInputElement;
  const sliderB = document.getElementById('slider-b') as HTMLInputElement;
  const chkRgb = document.getElementById('chk-rgb') as HTMLInputElement;
  const chkBreathing = document.getElementById('chk-breathing') as HTMLInputElement;
  const chkGlitch = document.getElementById('chk-glitch') as HTMLInputElement;
  const sliderSpeed = document.getElementById('slider-speed') as HTMLInputElement;
  const sliderGlow = document.getElementById('slider-glow') as HTMLInputElement;
  const sliderFlowW = document.getElementById('slider-flow-w') as HTMLInputElement;
  const sliderSpectrum = document.getElementById('slider-spectrum') as HTMLInputElement;
  const btnFlowDir = document.getElementById('btn-flow-dir') as HTMLButtonElement;

  const updateColor = () => {
    state.customColor = { r: parseInt(sliderR.value), g: parseInt(sliderG.value), b: parseInt(sliderB.value) };
  };
  sliderR.addEventListener('input', updateColor);
  sliderG.addEventListener('input', updateColor);
  sliderB.addEventListener('input', updateColor);

  chkRgb.addEventListener('change', () => { state.isRgbFlow = chkRgb.checked; });
  chkBreathing.addEventListener('change', () => { state.rgbBreathingEnabled = chkBreathing.checked; });
  chkGlitch.addEventListener('change', () => { state.heavyGlitchEnabled = chkGlitch.checked; });

  sliderSpeed.addEventListener('input', () => { state.flowSpeed = parseFloat(sliderSpeed.value); });
  sliderGlow.addEventListener('input', () => { state.borderGlowSize = parseInt(sliderGlow.value); });
  sliderFlowW.addEventListener('input', () => { state.flowLineWidth = parseInt(sliderFlowW.value); });
  sliderSpectrum.addEventListener('input', () => { state.rainbowSpectrumCycles = parseInt(sliderSpectrum.value); });

  // Honeycomb Matrix Settings
  const sliderHexSize = document.getElementById('slider-hex-size') as HTMLInputElement | null;
  const sliderHexGap = document.getElementById('slider-hex-gap') as HTMLInputElement | null;
  const lblHexSize = document.getElementById('lbl-hex-size');
  const lblHexGap = document.getElementById('lbl-hex-gap');
  const btnReplayIntro = document.getElementById('btn-replay-intro') as HTMLButtonElement | null;

  if (sliderHexSize && lblHexSize) {
    sliderHexSize.value = String(state.hexSize);
    sliderHexSize.addEventListener('input', () => {
      state.hexSize = parseFloat(sliderHexSize.value);
      lblHexSize.textContent = `${state.hexSize}px`;
    });
  }

  if (sliderHexGap && lblHexGap) {
    sliderHexGap.value = String(state.hexGap);
    sliderHexGap.addEventListener('input', () => {
      state.hexGap = parseFloat(sliderHexGap.value);
      lblHexGap.textContent = `${state.hexGap}px`;
    });
  }

  if (btnReplayIntro) {
    btnReplayIntro.addEventListener('click', () => {
      // Re-trigger intro animation sequence
      state.introSequenceActive = true;
      state.introTick = 0;
      state.startupPhase = 0;
      state.startupTick = 0;
      state.hexDrawRadius = 0;
      state.hexClearRadius = 0;
      const sim = getSandSim();
      if (sim) {
        sim.phase = 'text';
        sim.phaseTime = 0;
        sim.finished = false;
        sim.hiddenAlpha = 0;
      }
      addTerminalLog(`Replaying Honeycomb Intro Animation (Hex Size: ${state.hexSize}px, Gap: ${state.hexGap}px)...`, 'SYS');
    });
  }

  btnFlowDir.addEventListener('click', () => {
    state.flowClockwise = !state.flowClockwise;
    btnFlowDir.textContent = `Flow: ${state.flowClockwise ? 'Clockwise' : 'Counter-CW'}`;
  });

  // Animation style radio
  document.querySelectorAll<HTMLInputElement>('input[name="anim-style"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'neon') state.animationStyle = 'Neon Flow';
      else if (radio.value === 'pulse') state.animationStyle = 'Cyber Pulse';
      else state.animationStyle = 'Static';
    });
  });
}

function updateColorSliders(): void {
  (document.getElementById('slider-r') as HTMLInputElement).value = String(state.customColor.r);
  (document.getElementById('slider-g') as HTMLInputElement).value = String(state.customColor.g);
  (document.getElementById('slider-b') as HTMLInputElement).value = String(state.customColor.b);
}

// --- ANIMATION STATE UPDATE ---
function updateState(dt: number): void {
  const timeSec = performance.now() / 1000;

  // Flow offset animation
  const dir = state.flowClockwise ? 1 : -1;
  state.flowOffset += state.flowSpeed * dir * dt * 60;
  state.flowOffset %= 360;

  if (state.introSequenceActive) {
    state.introTick++;

    // Hex background expansion
    if (state.hexDrawRadius < state.hexMaxRadius) {
      state.hexDrawRadius += state.hexAnimSpeed;
    }

    // 3-Pulse Honeycomb Matrix expansion finishes first (140 ticks * 3 = 420 ticks / 7.0s)
    const HONEYCOMB_FINISH_TICK = 420;

    // Sand simulation / ResQFly animation only starts AFTER the 3-cycle honeycomb animation finishes!
    const sim = getSandSim();
    if (sim) {
      if (state.introTick >= HONEYCOMB_FINISH_TICK) {
        sim.update(dt);
        if (sim.finished) {
          // Transition to glitch intro
          state.introSequenceActive = false;
          state.startupPhase = 0;
          state.startupTick = 0;

          // Start glitch intro phase
          startGlitchPhase();
        }
      }
    }
  }

  if (!state.introSequenceActive) {
    state.startupTick++;

    // Phase progression
    if (state.startupPhase === 0 && state.startupTick >= state.phase1Limit) {
      state.startupPhase = 1;
    }
    if (state.startupPhase === 1 && state.startupTick >= state.phase1Limit + 40) {
      state.startupPhase = 2;
    }
    if (state.startupPhase === 2 && state.startupTick >= state.phase1Limit + 90) {
      state.startupPhase = 3;
      // Show content
      contentDiv.classList.remove('hidden');
      contentDiv.classList.add('visible');

      // Hex clear radius animation
      startHexClear();
    }

    // Hex clear radius animation
    if (state.hexClearRadius < state.hexMaxRadius && state.startupPhase >= 3) {
      state.hexClearRadius += state.hexAnimSpeed * 1.5;
    }

    // Glitch text animation
    if (state.startupTick % 3 === 0) {
      updateGlitchSlices();
    }

    // Access granted animation
    if (state.showingAccessGranted) {
      state.accessGrantedTick++;
      if (state.accessGrantedTick > 80) {
        state.showingAccessGranted = false;
      }
    }
  }

  // Update telemetry
  telemetry.update();
  state.telemetry = telemetry.data;
  updateTerminalTelemetryBar();
}

let glitchPhaseActive = false;
let glitchPhaseStartTick = 0;

function startGlitchPhase(): void {
  glitchPhaseActive = false;
  state.showingAccessGranted = true;
  state.accessGrantedTick = 0;
}

function startHexClear(): void {
  // Render tactical GCS banner & boot diagnostic checklist
  termOutput.innerHTML = '';
  renderTerminalBanner();
  
  addTerminalLog('ResQFly Autonomous Tactical GCS v2.4.8-PRO // INITIALIZED', 'BOOT');
  addTerminalLog('Vector Renderer: Canvas2D Hardware Accelerated (60 FPS)', 'BOOT');
  addTerminalLog('MAVLink Protocol: v2.0 Micro Air Vehicle Telemetry Link Active', 'LINK');
  addTerminalLog('Autopilot: Pixhawk 6X Linked [ArduPilot Copter v4.5.2]', 'UAV');
  addTerminalLog('GNSS Receiver: Dual Septentrio AsteRx-m3 (18 Sats / RTK Fix ±1.2cm)', 'OK');
  addTerminalLog('Payload Gimbal: FLIR Boson 640 Thermal + 4K EO Sensor ONLINE', 'OK');
  addTerminalLog('AI Vision Engine: Neural SAR Survivor Detection Model ENGAGED', 'AI');
  addTerminalLog('Failsafes: Geofence Active (Radius 1200m) & Auto-RTL Protocol ENGAGED', 'OK');
  addTerminalLog('All systems nominal. Type "flight-help" or click quick action buttons below.', 'SYS');
}

function updateGlitchSlices(): void {
  const slices: AppState['glitchSlices'] = [];
  const numSlices = 3 + Math.floor(Math.random() * 5);
  for (let i = 0; i < numSlices; i++) {
    slices.push({
      y: Math.random() * 100 - 20,
      h: 2 + Math.random() * 8,
      offsetX: -15 + Math.random() * 30,
      colorMode: Math.floor(Math.random() * 3),
    });
  }
  state.glitchSlices = slices;
  state.glitchOffsetLeft = { x: -2 + Math.random() * 4, y: -1 + Math.random() * 2 };
  state.glitchOffsetRight = { x: -2 + Math.random() * 4, y: -1 + Math.random() * 2 };
}

// --- MAIN RENDER LOOP ---
let lastTime = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Update state
  if (state.authenticated) {
    updateState(dt);
  }

  // Clear and paint main canvas
  mainCtx.save();
  mainCtx.setTransform(1, 0, 0, 1, 0, 0);
  const dpr = window.devicePixelRatio || 1;
  mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  mainCtx.scale(dpr, dpr);
  mainCtx.restore();

  if (!state.authenticated) {
    drawLoginFrame();
  } else {
    paintFrame(mainCtx, w, h, state);

    // Draw active tab canvas
    drawActiveTabCanvas();
  }

  requestAnimationFrame(frame);
}

function drawActiveTabCanvas(): void {
  if (state.activeTab === 'bio') {
    if (!bioCanvas) {
      bioCanvas = document.getElementById('bio-canvas') as HTMLCanvasElement;
      if (bioCanvas) bioCtx = bioCanvas.getContext('2d');
    }
    if (bioCtx && bioCanvas) {
      const rect = bioCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        bioCtx.save();
        bioCtx.setTransform(1, 0, 0, 1, 0, 0);
        bioCtx.clearRect(0, 0, bioCanvas.width, bioCanvas.height);
        const dpr = window.devicePixelRatio || 1;
        bioCtx.scale(dpr, dpr);
        drawBioHoloWidget(bioCtx, rect.width, rect.height);
        bioCtx.restore();
      }
    }
  } else if (state.activeTab === 'status') {
    if (!statusCanvas) {
      statusCanvas = document.getElementById('status-canvas') as HTMLCanvasElement;
      if (statusCanvas) statusCtx = statusCanvas.getContext('2d');
    }
    if (statusCtx && statusCanvas) {
      const rect = statusCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        statusCtx.save();
        statusCtx.setTransform(1, 0, 0, 1, 0, 0);
        statusCtx.clearRect(0, 0, statusCanvas.width, statusCanvas.height);
        const dpr = window.devicePixelRatio || 1;
        statusCtx.scale(dpr, dpr);
        drawStatusWidget(statusCtx, rect.width, rect.height, state.telemetry);
        statusCtx.restore();
      }
    }
  } else if (state.activeTab === 'prec') {
    if (!precCanvas) {
      precCanvas = document.getElementById('prec-canvas') as HTMLCanvasElement;
      if (precCanvas) precCtx = precCanvas.getContext('2d');
    }
    if (precCtx && precCanvas) {
      const rect = precCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        precCtx.save();
        precCtx.setTransform(1, 0, 0, 1, 0, 0);
        precCtx.clearRect(0, 0, precCanvas.width, precCanvas.height);
        const dpr = window.devicePixelRatio || 1;
        precCtx.scale(dpr, dpr);
        drawPrecheckWidget(precCtx, rect.width, rect.height);
        precCtx.restore();
      }
    }
  } else if (state.activeTab === 'map') {
    if (!mapCanvas) {
      mapCanvas = document.getElementById('map-canvas') as HTMLCanvasElement;
      if (mapCanvas) mapCtx = mapCanvas.getContext('2d');
    }
    if (mapCtx && mapCanvas) {
      const rect = mapCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        mapCtx.save();
        mapCtx.setTransform(1, 0, 0, 1, 0, 0);
        mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        const dpr = window.devicePixelRatio || 1;
        mapCtx.scale(dpr, dpr);
        drawSarMapWidget(mapCtx, rect.width, rect.height, state.telemetry);
        mapCtx.restore();
      }
    }
  } else if (state.activeTab === 'remote') {
    if (!remoteCanvas) {
      remoteCanvas = document.getElementById('remote-canvas') as HTMLCanvasElement;
      if (remoteCanvas) remoteCtx = remoteCanvas.getContext('2d');
    }
    if (remoteCtx && remoteCanvas) {
      const rect = remoteCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        remoteCtx.save();
        remoteCtx.setTransform(1, 0, 0, 1, 0, 0);
        remoteCtx.clearRect(0, 0, remoteCanvas.width, remoteCanvas.height);
        const dpr = window.devicePixelRatio || 1;
        remoteCtx.scale(dpr, dpr);
        drawRemoteWidget(remoteCtx, rect.width, rect.height, state.telemetry);
        remoteCtx.restore();
      }
    }
  } else if (state.activeTab === 'optics') {
    if (!opticsCanvas) {
      opticsCanvas = document.getElementById('optics-canvas') as HTMLCanvasElement;
      if (opticsCanvas) opticsCtx = opticsCanvas.getContext('2d');
    }
    if (opticsCtx && opticsCanvas) {
      const rect = opticsCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        opticsCtx.save();
        opticsCtx.setTransform(1, 0, 0, 1, 0, 0);
        opticsCtx.clearRect(0, 0, opticsCanvas.width, opticsCanvas.height);
        const dpr = window.devicePixelRatio || 1;
        opticsCtx.scale(dpr, dpr);
        drawOpticsWidget(opticsCtx, rect.width, rect.height, state.telemetry);
        opticsCtx.restore();
      }
    }
  }
}

// --- INIT ---
function init(): void {
  resize();
  window.addEventListener('resize', resize);
  bindSettings();
  bindQuickChips();

  // Fullscreen button
  const btnFullscreen = document.getElementById('btn-fullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
  }

  // F11 or key shortcut
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  // Show login
  loginOverlay.classList.remove('hidden');
  loginUser.focus();

  // Start render loop
  requestAnimationFrame(frame);
}

init();

// =============================================================================
// RESQFLY CONSOLE — TYPE DEFINITIONS
// =============================================================================

export interface TelemetryData {
  alt: number;
  alt_msl: number;
  speed: number;
  vspeed: number;
  pitch: number;
  roll: number;
  yaw: number;
  heading: number;
  lat: number;
  lon: number;
  satellites: number;
  gps_fix: string;
  battery_pct: number;
  volts: number;
  amps: number;
  battery_temp: number;
  mah_drawn: number;
  mode: string;
  armed: boolean;
  rssi: number;
  snr: number;
  latency: number;
  loss: number;
  throttle: number;
  link_source: string;
  is_live: boolean;
}

export interface AppState {
  // Auth
  authenticated: boolean;
  showingAccessGranted: boolean;
  accessGrantedTick: number;
  introSequenceActive: boolean;
  introTick: number;

  // Startup animation
  startupPhase: number;
  startupTick: number;
  phase1Limit: number;

  // Hex background
  hexDrawRadius: number;
  hexClearRadius: number;
  hexMaxRadius: number;
  hexAnimSpeed: number;
  hexSize: number;
  hexGap: number;

  // Theme
  customColor: { r: number; g: number; b: number };
  isRgbFlow: boolean;
  flowSpeed: number;
  animationStyle: 'Neon Flow' | 'Cyber Pulse' | 'Static';
  borderGlowSize: number;
  flowLineWidth: number;
  flowClockwise: boolean;
  flowOffset: number;
  heavyGlitchEnabled: boolean;
  rgbBreathingEnabled: boolean;
  rainbowSpectrumCycles: number;
  redFlashEndTime: number;
  terminalLoggingEnabled: boolean;

  // Glitch
  glitchLastUpdateTick: number;
  glitchOffsetLeft: { x: number; y: number };
  glitchOffsetRight: { x: number; y: number };
  glitchSlices: { y: number; h: number; offsetX: number; colorMode: number }[];

  // Blast
  blastTriggered: boolean;
  blastParticles: BlastParticle[];

  // Active tab
  activeTab: string;

  // Telemetry
  telemetry: TelemetryData;
}

export interface BlastParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  alpha: number;
  isTextPiece: boolean;
  curveRate: number;
  // For text pieces: imageData
  imageData?: ImageData;
  imgW?: number;
  imgH?: number;
  // For generic particles: size, colorType
  size?: number;
  colorType?: number;
}

export interface GlitchSlice {
  y: number;
  h: number;
  offsetX: number;
  colorMode: number;
}

export interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  driftAccel: number;
  driftTarget: number;
  driftTimer: number;
}

export interface ReformParticle {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  delay: number;
  duration: number;
  wave: number;
  phase: number;
}

export function createDefaultTelemetry(): TelemetryData {
  return {
    alt: 142.8,
    alt_msl: 142.8,
    speed: 14.6,
    vspeed: 0.4,
    pitch: 0.0,
    roll: 0.0,
    yaw: 0.0,
    heading: 0.0,
    lat: 37.774921,
    lon: -122.419416,
    satellites: 0,
    gps_fix: 'NO FIX',
    battery_pct: 87,
    volts: 23.4,
    amps: 32.8,
    battery_temp: 34.0,
    mah_drawn: 1420,
    mode: 'MANUAL LOITER',
    armed: false,
    rssi: -64,
    snr: 29.4,
    latency: 14,
    loss: 0.02,
    throttle: 0,
    link_source: 'SIMULATION',
    is_live: false,
  };
}

export function createDefaultState(): AppState {
  return {
    authenticated: false,
    showingAccessGranted: false,
    accessGrantedTick: 0,
    introSequenceActive: false,
    introTick: 0,
    startupPhase: 0,
    startupTick: 0,
    phase1Limit: 200,
    hexDrawRadius: 0,
    hexClearRadius: 0,
    hexMaxRadius: 0,
    hexAnimSpeed: 10,
    hexSize: 12,
    hexGap: 1.5,
    customColor: { r: 255, g: 0, b: 0 },
    isRgbFlow: false,
    flowSpeed: 2,
    animationStyle: 'Neon Flow',
    borderGlowSize: 12,
    flowLineWidth: 5,
    flowClockwise: true,
    flowOffset: 0,
    heavyGlitchEnabled: false,
    rgbBreathingEnabled: false,
    rainbowSpectrumCycles: 5,
    redFlashEndTime: 0,
    terminalLoggingEnabled: true,
    glitchLastUpdateTick: 0,
    glitchOffsetLeft: { x: 0, y: 0 },
    glitchOffsetRight: { x: 0, y: 0 },
    glitchSlices: [],
    blastTriggered: false,
    blastParticles: [],
    activeTab: 'terminal',
    telemetry: createDefaultTelemetry(),
  };
}

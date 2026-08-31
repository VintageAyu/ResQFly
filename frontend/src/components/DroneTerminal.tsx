import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal as TerminalIcon,
  Play,
  Radio,
  BatteryCharging,
  Gauge,
  Compass,
  Wifi,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Maximize2,
  ExternalLink,
  Cable,
  Cpu,
  Activity
} from 'lucide-react';
import { PageTab } from './Navbar';

interface TerminalLog {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'cmd';
  text: string;
}

const INITIAL_LOGS: TerminalLog[] = [
  {
    id: '1',
    time: '10:04:12',
    type: 'info',
    text: '[SYSTEM] ResQFly Web Flight OS v4.2.0 initialized.',
  },
  {
    id: '2',
    time: '10:04:14',
    type: 'success',
    text: '[UPLINK] Connected to Drone Mesh Unit #RQ-8849 [Raven-X4].',
  },
  {
    id: '3',
    time: '10:04:15',
    type: 'info',
    text: '[TELEMETRY] GPS RTK Fixed: 18 Sats. Altitude: 48.2m. Speed: 34.2km/h.',
  },
  {
    id: '4',
    time: '10:04:18',
    type: 'warn',
    text: '[STATUS] Hardware Serial & Cloud Ready. Click "CONNECT PIXHAWK" for physical COM port telemetry.',
  },
];

const PRESET_COMMANDS = [
  { label: 'ARM_MOTORS', cmd: 'arm', desc: 'Initialize brushless propulsion' },
  { label: 'TAKEOFF 50M', cmd: 'takeoff 50', desc: 'Ascend to survey altitude' },
  { label: 'SCAN_THERMAL', cmd: 'scan thermal', desc: 'Activate FLIR thermal camera' },
  { label: 'DEPLOY_PAYLOAD', cmd: 'payload deploy', desc: 'Release emergency med kit' },
  { label: 'RETURN_TO_BASE', cmd: 'rtb', desc: 'Auto-pilot home coordinates' },
  { label: 'SWARM_SYNC', cmd: 'swarm sync', desc: 'Sync mesh fleet telemetry' },
];

// ArduPilot Copter Flight Modes Mapping
const ARDUPILOT_COPTER_MODES: Record<number, string> = {
  0: 'STABILIZE',
  1: 'ACRO',
  2: 'ALT_HOLD',
  3: 'AUTO',
  4: 'GUIDED',
  5: 'LOITER',
  6: 'RTL',
  7: 'CIRCLE',
  9: 'LAND',
  11: 'DRIFT',
  13: 'SPORT',
  14: 'FLIP',
  15: 'AUTOTUNE',
  16: 'POSHOLD',
  17: 'BRAKE',
  18: 'THROW',
  19: 'AVOID_ADSB',
  20: 'GUIDED_NOGPS',
  21: 'SMART_RTL',
  22: 'FLOWHOLD',
  23: 'FOLLOW',
  24: 'ZIGZAG',
  25: 'SYSTEMID',
  26: 'AUTOROTATE'
};

interface DroneTerminalProps {
  onNavigate?: (tab: PageTab) => void;
}

type TerminalViewMode = 'console' | 'dual' | 'cli';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://resqfly-backend.vercel.app';

export const DroneTerminal: React.FC<DroneTerminalProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<TerminalLog[]>(INITIAL_LOGS);
  const [inputVal, setInputVal] = useState('');
  const [altitude, setAltitude] = useState(48.2);
  const [speed, setSpeed] = useState(34.2);
  const [battery, setBattery] = useState(94);
  const [hardwareVoltage, setHardwareVoltage] = useState<number>(22.2);
  const [satsCount, setSatsCount] = useState<number>(18);
  const [flightMode, setFlightMode] = useState('AUTONOMOUS_CRUISE');
  const [isHardwareArmed, setIsHardwareArmed] = useState<boolean>(false);
  const [isLive, setIsLive] = useState(true);
  const [viewMode, setViewMode] = useState<TerminalViewMode>('console');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [serialConnected, setSerialConnected] = useState<boolean>(false);
  const [serialPortInfo, setSerialPortInfo] = useState<string>('COM17 (Pixhawk)');
  const [isConnectingSerial, setIsConnectingSerial] = useState<boolean>(false);
  
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'cmd' = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, time: timeStr, type, text },
    ]);
  };

  // Process raw MAVLink v1 / v2 byte payloads
  const processMavlinkPayload = (msgId: number, payload: Uint8Array) => {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    try {
      switch (msgId) {
        case 0: { // HEARTBEAT
          if (payload.length >= 9) {
            const customMode = view.getUint32(0, true);
            const baseMode = payload[6];
            const isArmed = (baseMode & 128) !== 0;
            setIsHardwareArmed(isArmed);
            const modeName = ARDUPILOT_COPTER_MODES[customMode] || `MODE_${customMode}`;
            setFlightMode(modeName);
          }
          break;
        }
        case 30: { // ATTITUDE
          // Pitch / Roll telemetry received
          break;
        }
        case 33: { // GLOBAL_POSITION_INT
          if (payload.length >= 28) {
            const alt = view.getInt32(12, true) / 1000;
            const relAlt = view.getInt32(16, true) / 1000;
            const displayAlt = relAlt > 0 ? relAlt : alt;
            if (displayAlt > -500 && displayAlt < 10000) {
              setAltitude(+displayAlt.toFixed(1));
            }
          }
          break;
        }
        case 74: { // VFR_HUD
          if (payload.length >= 20) {
            const groundspeed = view.getFloat32(4, true) * 3.6; // km/h
            const alt = view.getFloat32(8, true);
            if (groundspeed >= 0 && groundspeed < 300) setSpeed(+groundspeed.toFixed(1));
            if (alt > -500 && alt < 10000) setAltitude(+alt.toFixed(1));
          }
          break;
        }
        case 1: { // SYS_STATUS
          if (payload.length >= 31) {
            const voltage = view.getUint16(14, true) / 1000;
            const rem = payload[18];
            if (voltage > 0) setHardwareVoltage(+voltage.toFixed(2));
            if (rem >= 0 && rem <= 100) setBattery(rem);
          }
          break;
        }
        case 24: { // GPS_RAW_INT
          if (payload.length >= 30) {
            const sats = payload[7];
            if (sats >= 0 && sats <= 40) setSatsCount(sats);
          }
          break;
        }
        case 253: { // STATUSTEXT
          if (payload.length >= 51) {
            const textBytes = payload.slice(1, 51);
            const text = new TextDecoder().decode(textBytes).replace(/\0/g, '').trim();
            if (text) {
              addLog(`[PIXHAWK] ${text}`, 'info');
            }
          }
          break;
        }
      }
    } catch (e) {
      // ignore partial frame read error
    }
  };

  // Web Serial Stream Reader
  const readSerialStream = async (port: any) => {
    let rxBuffer = new Uint8Array(0);
    const reader = port.readable.getReader();
    serialReaderRef.current = reader;

    const concatBuffers = (a: Uint8Array, b: Uint8Array) => {
      const c = new Uint8Array(a.length + b.length);
      c.set(a, 0);
      c.set(b, a.length);
      return c;
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          rxBuffer = concatBuffers(rxBuffer, value);

          while (rxBuffer.length > 0) {
            const v2Idx = rxBuffer.indexOf(0xFD);
            const v1Idx = rxBuffer.indexOf(0xFE);
            let startIdx = -1;
            let isV2 = false;

            if (v2Idx !== -1 && (v1Idx === -1 || v2Idx < v1Idx)) {
              startIdx = v2Idx;
              isV2 = true;
            } else if (v1Idx !== -1) {
              startIdx = v1Idx;
              isV2 = false;
            }

            if (startIdx === -1) {
              rxBuffer = new Uint8Array(0);
              break;
            }

            if (startIdx > 0) {
              rxBuffer = rxBuffer.slice(startIdx);
            }

            if (isV2) {
              if (rxBuffer.length < 12) break;
              const payloadLen = rxBuffer[1];
              const incompat = rxBuffer[2];
              const hasSig = (incompat & 0x01) !== 0;
              const totalLen = 10 + payloadLen + 2 + (hasSig ? 13 : 0);
              if (rxBuffer.length < totalLen) break;

              const msgId = rxBuffer[7] | (rxBuffer[8] << 8) | (rxBuffer[9] << 16);
              const payload = rxBuffer.slice(10, 10 + payloadLen);
              processMavlinkPayload(msgId, payload);
              rxBuffer = rxBuffer.slice(totalLen);
            } else {
              if (rxBuffer.length < 8) break;
              const payloadLen = rxBuffer[1];
              const totalLen = 6 + payloadLen + 2;
              if (rxBuffer.length < totalLen) break;

              const msgId = rxBuffer[5];
              const payload = rxBuffer.slice(6, 6 + payloadLen);
              processMavlinkPayload(msgId, payload);
              rxBuffer = rxBuffer.slice(totalLen);
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'NetworkError') {
        console.warn('Serial reader error:', err);
      }
    } finally {
      reader.releaseLock();
    }
  };

  // Connect Physical Pixhawk via Web Serial
  const handleConnectPixhawk = async () => {
    if (!('serial' in navigator)) {
      addLog('[SERIAL_ERR] Web Serial API is supported in Chrome, Edge, Brave, and Opera browsers.', 'warn');
      return;
    }

    try {
      setIsConnectingSerial(true);
      addLog('[HARDWARE] Requesting physical Pixhawk USB Serial Port (COM17)...', 'info');

      // Request port with standard flight controller filters
      const port = await (navigator as any).serial.requestPort({
        filters: [
          { usbVendorId: 0x1209 }, // ArduPilot / PX4 / pid.codes
          { usbVendorId: 0x26ac }, // 3DR Pixhawk
          { usbVendorId: 0x1d50 }, // PX4 Open Hardware
          { usbVendorId: 0x0483 }, // STMicroelectronics Virtual COM
          { usbVendorId: 0x10c4 }, // CP210x Telemetry Radio
          { usbVendorId: 0x0403 }  // FTDI Telemetry Radio
        ]
      }).catch(async () => {
        return await (navigator as any).serial.requestPort();
      });

      if (!port) {
        setIsConnectingSerial(false);
        return;
      }

      await port.open({ baudRate: 115200 });
      serialPortRef.current = port;
      setSerialConnected(true);
      setSerialPortInfo('Pixhawk (COM17 @ 115200)');
      addLog('✅ [HARDWARE_LINK] Physical Pixhawk connected on COM17 @ 115200 baud!', 'success');
      addLog('📡 [MAVLINK] Streaming live HEARTBEAT, GPS_RAW, VFR_HUD, and BATTERY telemetry.', 'success');

      readSerialStream(port);
    } catch (err: any) {
      console.error('Serial connection error:', err);
      addLog(`[SERIAL_ERR] ${err?.message || 'Could not open serial port'}`, 'warn');
      setSerialConnected(false);
    } finally {
      setIsConnectingSerial(false);
    }
  };

  // Auto-detect previously granted serial ports on load
  useEffect(() => {
    if ('serial' in navigator) {
      (navigator as any).serial.getPorts().then(async (ports: any[]) => {
        if (ports && ports.length > 0 && !serialPortRef.current) {
          try {
            const p = ports[0];
            await p.open({ baudRate: 115200 });
            serialPortRef.current = p;
            setSerialConnected(true);
            setSerialPortInfo('Pixhawk (Auto-Linked)');
            addLog('⚡ [AUTO_DETECT] Automatically linked to Pixhawk USB Port!', 'success');
            readSerialStream(p);
          } catch (e) {
            // Port might be in use or waiting for user click
          }
        }
      });
    }
  }, []);

  // Live Backend Health & Telemetry Ping
  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch(`${BACKEND_URL}/api/drone/telemetry`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        const elapsed = Math.round(performance.now() - t0);
        if (res.ok && isMounted) {
          const json = await res.json();
          setBackendOnline(true);
          setLatencyMs(elapsed);
          if (!serialConnected && json?.data?.flightMode) {
            setFlightMode(json.data.flightMode);
          }
        } else if (isMounted) {
          setBackendOnline(false);
        }
      } catch (err) {
        if (isMounted) setBackendOnline(false);
      }
    };

    checkBackend();
    const timer = setInterval(checkBackend, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [serialConnected]);

  // Telemetry fluctuation simulator (only runs if physical hardware serial is not connected)
  useEffect(() => {
    if (!isLive || serialConnected) return;
    const interval = setInterval(() => {
      setAltitude((prev) => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setSpeed((prev) => +(prev + (Math.random() * 0.6 - 0.3)).toFixed(1));
      if (Math.random() > 0.85) {
        setBattery((prev) => Math.max(12, prev - 1));
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isLive, serialConnected]);

  const handleExecute = async (commandStr: string) => {
    const raw = commandStr.trim();
    if (!raw) return;

    addLog(`$ ${raw}`, 'cmd');
    setInputVal('');

    const cmd = raw.toLowerCase();

    // 1. Try sending command to Live Vercel Backend
    try {
      const res = await fetch(`${BACKEND_URL}/api/drone/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: raw, operator: 'Web Pilot (dronzer.me)' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          addLog(`[CLOUD_GCS] ${data.message}`, 'success');
        }
        if (data.state) {
          if (data.state.flightMode) setFlightMode(data.state.flightMode);
          if (data.state.altitude !== undefined) setAltitude(data.state.altitude);
          if (data.state.speed !== undefined) setSpeed(data.state.speed);
          if (data.state.battery !== undefined) setBattery(data.state.battery);
        }
        return;
      }
    } catch (err) {
      console.warn('Backend offline or unreachable, using local flight computer fallback:', err);
    }

    // 2. Fallback to Autonomous Flight Computer Simulator if backend is sleeping
    if (cmd === 'help') {
      addLog('Available commands: arm, takeoff <alt>, land, scan <mode>, payload deploy, rtb, swarm sync, status, ceo, clear', 'info');
    } else if (cmd.startsWith('arm')) {
      setFlightMode('MOTORS_ARMED');
      addLog('[FLIGHT_SYS] Propulsion system ARMED. ESC calibrated at 400Hz.', 'success');
    } else if (cmd.startsWith('takeoff')) {
      const parts = cmd.split(' ');
      const targetAlt = parts[1] ? parseFloat(parts[1]) : 50;
      setFlightMode('ASCENDING');
      setAltitude(targetAlt);
      addLog(`[AUTONOMOUS] Commencing auto-takeoff to ${targetAlt}m AGL. Obstacle LiDAR active.`, 'success');
    } else if (cmd.startsWith('scan')) {
      addLog('[OPTICS] FLIR Duo-Pro Thermal Sensor engaged. 640x512 Radiometric live stream active.', 'success');
    } else if (cmd.includes('payload')) {
      addLog('[WINCH] Emergency Payload Release confirmed at GPS (37.7749° N, 122.4194° W).', 'warn');
    } else if (cmd === 'rtb') {
      setFlightMode('RETURN_TO_BASE');
      addLog('[NAV] Aborting current waypoint. Engaging Return-To-Base (Home Pad Alpha).', 'warn');
    } else if (cmd.includes('swarm')) {
      addLog('[MESH] Synchronized 8 drone nodes on 5.8GHz encrypted COFDM network.', 'success');
    } else if (cmd === 'status') {
      addLog(`[STATUS] Mode: ${flightMode} | Alt: ${altitude}m | Speed: ${speed}km/h | Batt: ${battery}%`, 'info');
    } else if (cmd === 'ceo' || cmd === 'founder') {
      addLog('[LEADERSHIP] ResQFly is led by CEO Ayush Kumar. Mission: Autonomous aerial rescue & fleet cloud control.', 'success');
    } else if (cmd === 'clear') {
      setLogs([]);
    } else {
      addLog(`[SYNTAX_ERR] Unknown command: "${raw}". Type "help" for drone commands.`, 'warn');
    }
  };

  return (
    <section
      id="terminal"
      className={`relative pt-24 sm:pt-28 pb-24 bg-[#0A100B] text-neutral-100 min-h-screen overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-[100] pt-4 pb-4 overflow-y-auto bg-black' : ''
      }`}
    >
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[radial-gradient(#4D6D47_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Navigation Breadcrumb / Back button & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {onNavigate && !isFullscreen && (
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-emerald-300 transition-colors cursor-pointer bg-[#131E14] px-3.5 py-2 rounded-xl border border-[#253927]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mission Control</span>
            </button>
          )}

          {/* Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-[#131E14] p-1.5 rounded-2xl border border-[#253927]">
            <button
              type="button"
              onClick={() => setViewMode('console')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                viewMode === 'console'
                  ? 'bg-emerald-600 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Cyberpunk 3D Console
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                viewMode === 'dual'
                  ? 'bg-emerald-600 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Dual Mode
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cli')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                viewMode === 'cli'
                  ? 'bg-emerald-600 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Quick Flight CLI
            </button>
          </div>

          {/* Dedicated Window & Fullscreen Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Web Serial Connect Button */}
            <button
              type="button"
              onClick={handleConnectPixhawk}
              disabled={isConnectingSerial}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                serialConnected
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 animate-pulse'
              }`}
              title="Connect physical Pixhawk / ArduPilot via USB Serial (COM17)"
            >
              <Cable className="w-3.5 h-3.5" />
              <span>
                {isConnectingSerial
                  ? 'Connecting...'
                  : serialConnected
                  ? 'Pixhawk Linked (COM17)'
                  : '⚡ Connect Pixhawk USB'}
              </span>
            </button>

            <a
              href="/terminal/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#152316] hover:bg-[#1E3320] text-emerald-300 text-xs font-mono transition-all border border-[#253927]"
              title="Open full terminal in standalone tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Standalone Window</span>
            </a>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-400 text-xs font-mono transition-all border border-emerald-700/50 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>

        {/* Header Title */}
        {!isFullscreen && (
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2E1E] text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3 border border-emerald-900/50">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Live Ground Control Station &bull; Web & Hardware Edition</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-white">
                ResQFly Terminal Console
              </h1>
              <p className="text-neutral-400 mt-2 max-w-2xl text-sm sm:text-base">
                Autonomous drone orchestration, Pixhawk MAVLink v2 telemetry, 3D bio-holo tracking, FLIR radiometric optics, and sub-millisecond command execution.
              </p>
            </div>

            {/* Quick Connection Beacon */}
            <div className="flex flex-wrap items-center gap-3 bg-[#152316] border border-[#253927] rounded-2xl px-4 sm:px-5 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    serialConnected
                      ? 'bg-cyan-400 animate-ping'
                      : backendOnline
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`text-xs font-semibold tracking-wide ${
                    serialConnected
                      ? 'text-cyan-300'
                      : backendOnline
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }`}
                >
                  {serialConnected
                    ? 'PIXHAWK MAVLINK LINKED'
                    : backendOnline
                    ? 'CLOUD GCS LINKED'
                    : 'LOCAL SIMULATOR'}
                </span>
              </div>
              <div className="h-4 w-px bg-neutral-700" />
              <span className="text-xs text-neutral-400 font-mono">
                {serialConnected ? serialPortInfo : backendOnline ? `${latencyMs}ms Vercel` : 'Offline'}
              </span>
              <button
                type="button"
                onClick={() => setIsLive(!isLive)}
                className="text-xs text-neutral-300 hover:text-white underline underline-offset-2 ml-1 cursor-pointer"
              >
                {isLive ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
        )}

        {/* Real-time Telemetry Dashboard Gauges */}
        {!isFullscreen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Altitude
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">{altitude} m</span>
              <span className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-1">
                {serialConnected ? 'Pixhawk Baro/GPS' : 'AGL Laser Verified'}
              </span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Ground Speed
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">{speed} km/h</span>
              <span className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-1">
                {serialConnected ? 'VFR_HUD Sensor' : 'GPS Ground Speed'}
              </span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                LiPo Battery
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">{battery}%</span>
              <span className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-1">
                {serialConnected && hardwareVoltage > 0 ? `${hardwareVoltage}V Active` : '6S LiHV Pack'}
              </span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                GPS / Satellites
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">{satsCount} Sats</span>
              <span className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-1">
                {serialConnected ? 'MAVLink GPS Fix' : 'RTK Multi-Band Fix'}
              </span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Flight Mode
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-emerald-300 truncate">
                {flightMode}
              </span>
              <span className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-1">
                {serialConnected ? (isHardwareArmed ? '⚠️ MOTORS ARMED' : '🔒 SAFE DISARMED') : 'Autopilot Active'}
              </span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Hardware Link
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-cyan-300 truncate">
                {serialConnected ? 'COM17 ACTIVE' : 'WEB SERIAL'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 mt-1">
                {serialConnected ? '115200 MAVLink' : 'Click "Connect Pixhawk"'}
              </span>
            </div>
          </div>
        )}

        {/* PRIMARY VIEW AREA */}
        <div className="space-y-6">
          {/* Cyberpunk 3D Console View (Integrated terminal folder) */}
          {(viewMode === 'console' || viewMode === 'dual') && (
            <div className="bg-[#050A06] border border-[#253927] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]">
              {/* Window Header */}
              <div className="bg-[#131E14] border-b border-[#253927] px-4 sm:px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-mono text-neutral-300 flex items-center gap-2">
                    <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">ResQFly Cyberpunk Console</span>
                    <span className="hidden md:inline text-neutral-500">&bull; Three.js 3D Bio &bull; SAR Map &bull; Optics</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400/70 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    PORT 5173 /terminal
                  </span>
                </div>
              </div>

              {/* Embedded Frame */}
              <div
                className={`relative w-full bg-black ${
                  isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[620px] sm:h-[720px] lg:h-[780px]'
                }`}
              >
                <iframe
                  src="/terminal/index.html"
                  title="ResQFly Terminal Console"
                  className="w-full h-full border-0"
                  allow="fullscreen; accelerometer; gyroscope"
                />
              </div>
            </div>
          )}

          {/* Quick Flight CLI View */}
          {(viewMode === 'cli' || viewMode === 'dual') && (
            <div className="bg-[#0A0F0B] border border-[#253927] rounded-3xl overflow-hidden shadow-2xl">
              {/* Terminal Window Header Bar */}
              <div className="bg-[#131E14] border-b border-[#253927] px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-mono text-neutral-400 flex items-center gap-2">
                    <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                    resqfly-fleet-alpha@drone-node-rq8849: ~
                  </span>
                </div>
                <div className="text-xs font-mono text-neutral-500 hidden sm:block">
                  SSH-2.0 / WebRTC DataChannel
                </div>
              </div>

              {/* Terminal Log Output Area */}
              <div
                ref={logContainerRef}
                className="p-6 font-mono text-xs sm:text-sm h-64 sm:h-80 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-emerald-900"
              >
                {logs.map((log) => (
                  <div key={log.id} className="leading-relaxed flex items-start gap-2">
                    <span className="text-neutral-500 select-none">[{log.time}]</span>
                    <span
                      className={
                        log.type === 'success'
                          ? 'text-emerald-400'
                          : log.type === 'warn'
                          ? 'text-amber-400'
                          : log.type === 'cmd'
                          ? 'text-white font-semibold'
                          : 'text-neutral-300'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Interactive Command Input Line */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleExecute(inputVal);
                }}
                className="border-t border-[#253927] bg-[#111A12] px-5 py-4 flex items-center gap-3"
              >
                <span className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-1">
                  <span>resqfly&gt;</span>
                </span>
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Type drone command (e.g., 'takeoff 60', 'scan thermal', 'rtb', 'help')..."
                  className="flex-1 bg-transparent font-mono text-sm text-white placeholder-neutral-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-[#1C2E1E] hover:bg-emerald-900 text-emerald-300 px-4 py-2 rounded-xl text-xs font-medium font-mono cursor-pointer transition-colors border border-emerald-800/50"
                >
                  <span>Execute</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Quick Action Interactive Command Buttons */}
        {!isFullscreen && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-medium">
                Quick Autonomous Flight Actions
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PRESET_COMMANDS.map((item) => (
                <motion.button
                  key={item.label}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleExecute(item.cmd)}
                  className="bg-[#152316] hover:bg-[#1E3320] border border-[#253927] hover:border-emerald-700/50 rounded-2xl p-3.5 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                      {item.label}
                    </span>
                    <Play className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-1">{item.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

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
    text: '[STATUS] Autonomous mission active. Ready for operator web commands.',
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

interface DroneTerminalProps {
  onNavigate?: (tab: PageTab) => void;
}

type TerminalViewMode = 'console' | 'dual' | 'cli';

export const DroneTerminal: React.FC<DroneTerminalProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<TerminalLog[]>(INITIAL_LOGS);
  const [inputVal, setInputVal] = useState('');
  const [altitude, setAltitude] = useState(48.2);
  const [speed, setSpeed] = useState(34.2);
  const [battery, setBattery] = useState(94);
  const [flightMode, setFlightMode] = useState('AUTONOMOUS_CRUISE');
  const [isLive, setIsLive] = useState(true);
  const [viewMode, setViewMode] = useState<TerminalViewMode>('console');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Telemetry fluctuation simulator
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setAltitude((prev) => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setSpeed((prev) => +(prev + (Math.random() * 0.6 - 0.3)).toFixed(1));
      if (Math.random() > 0.85) {
        setBattery((prev) => Math.max(12, prev - 1));
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isLive]);

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'cmd' = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, time: timeStr, type, text },
    ]);
  };

  const handleExecute = (commandStr: string) => {
    const raw = commandStr.trim();
    if (!raw) return;

    addLog(`$ ${raw}`, 'cmd');
    const cmd = raw.toLowerCase();

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

    setInputVal('');
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
          <div className="flex items-center gap-2">
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
                <span>Live Ground Control Station &bull; Web Edition</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-white">
                ResQFly Terminal Console
              </h1>
              <p className="text-neutral-400 mt-2 max-w-2xl text-sm sm:text-base">
                Autonomous drone orchestration, 3D bio-holo telemetry, SAR map tracking, FLIR radiometric optics, and sub-millisecond command execution.
              </p>
            </div>

            {/* Quick Connection Beacon */}
            <div className="flex items-center gap-4 bg-[#152316] border border-[#253927] rounded-2xl px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-medium text-emerald-300">UPLINK ACTIVE</span>
              </div>
              <div className="h-4 w-px bg-neutral-700" />
              <span className="text-xs text-neutral-400 font-mono">14ms Latency</span>
              <button
                type="button"
                onClick={() => setIsLive(!isLive)}
                className="text-xs text-neutral-300 hover:text-white underline underline-offset-2 ml-2 cursor-pointer"
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
              <span className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-1">AGL Laser Verified</span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Ground Speed
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">{speed} km/h</span>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 mt-1">Heading: 142° SE</span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                LiPo Battery
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{battery}%</span>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 mt-1">22.2V 6S Solid-State</span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                Signal RSSI
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">-62 dBm</span>
              <span className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-1">Mesh 5.8GHz COFDM</span>
            </div>

            <div className="bg-[#152316]/90 border border-[#253927] rounded-2xl p-3.5 sm:p-4 flex flex-col col-span-2 sm:col-span-1 lg:col-span-2">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Flight State Mode
              </span>
              <span className="text-base sm:text-lg lg:text-xl font-bold font-mono text-emerald-300 truncate">
                {flightMode}
              </span>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 mt-1">Auto-pilot AI Active</span>
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

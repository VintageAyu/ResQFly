import React, { useState } from 'react';
import TerminalApp from './components/TerminalApp';

export default function App() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {isOpen ? (
        <TerminalApp onClose={() => setIsOpen(false)} />
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black font-mono">
          <div className="hero-container z-20">
            <h1 className="main-title glitch" data-text="DRONZER"><span>DRONZER</span></h1>
          </div>
          <p className="text-cyan-500/70 tracking-[0.3em] text-sm">TERMINAL_SESSION_SUSPENDED</p>
          <button
            onClick={() => setIsOpen(true)}
            className="px-8 py-3 border border-cyan-500 text-cyan-400 font-mono text-sm tracking-widest hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
          >
            INITIALIZE TERMINAL
          </button>
        </div>
      )}
    </div>
  );
}

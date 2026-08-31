import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useTypewriter } from '../hooks/useTypewriter';
import { PageTab } from './Navbar';

const MISSIONS = [
  'Search & Rescue',
  'Autonomous Fleet',
  'Thermal Scan',
  'Cargo Drops',
];

interface HeroContentProps {
  onNavigate?: (tab: PageTab) => void;
}

export const HeroContent: React.FC<HeroContentProps> = ({ onNavigate }) => {
  const { displayed, done } = useTypewriter("autonomous flight\nat your command!", 38, 600);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);

  const toggleMission = (mission: string) => {
    setSelectedMissions((prev) =>
      prev.includes(mission)
        ? prev.filter((item) => item !== mission)
        : [...prev, mission]
    );
  };

  const handleTerminalLaunch = () => {
    if (onNavigate) {
      onNavigate('terminal');
    }
    window.location.hash = 'terminal';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="home" className="relative z-10 flex flex-col order-first lg:order-none w-full bg-white lg:bg-transparent pb-8 lg:pb-0 lg:min-h-screen">
      <main
        id="spade-hero"
        className="w-full max-w-7xl mx-auto px-6 pt-28 pb-12 lg:py-16 flex-1 flex flex-col justify-center"
      >
        {/* Company Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAFBF9] border border-[#EAECE9] text-xs font-semibold text-[#1C2E1E] uppercase tracking-wider shadow-xs">
            <Zap className="w-3.5 h-3.5 text-[#4D6D47]" />
            <span>Next-Gen Web Drone OS</span>
            <span className="opacity-40">•</span>
            <span className="text-[#5A635A] font-normal lowercase">v4.2 telemetry live</span>
          </span>
        </motion.div>

        {/* Headline with Typewriter Hook */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl lg:text-[76px] font-normal tracking-tight text-black leading-[1.08] mb-8 select-none w-full whitespace-pre-wrap">
            {displayed}
            {!done && (
              <span className="inline-block w-[2px] h-[1.1em] bg-black align-middle ml-[2px] animate-blink" />
            )}
          </h1>
        </motion.div>

        {/* Secondary Description Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className="text-lg md:text-xl text-[#5A635A] leading-relaxed font-normal mb-12 max-w-2xl">
            ResQFly empowers operators and emergency response teams to control fleets of autonomous drones, execute mission-critical flight commands, and stream sub-millisecond AI telemetry directly from the web.
          </p>
        </motion.div>

        {/* Interactive Multi-Select Mission Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl"
        >
          <h2 className="text-2xl font-medium tracking-tight mb-2 text-black">
            What sort of mission?
          </h2>
          <p className="opacity-85 text-[#738273] mb-8 text-sm sm:text-base">
            Select all that apply
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            {MISSIONS.map((mission) => {
              const isSelected = selectedMissions.includes(mission);
              return (
                <motion.button
                  key={mission}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleMission(mission)}
                  className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-base sm:text-lg font-medium cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#1C2E1E] text-white shadow-md shadow-emerald-950/5 transform'
                      : 'bg-white text-[#1C2E1E] border border-[#F1F3F1] hover:bg-[#F1F3F1]/55'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="inline-flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-white stroke-[2.5]" />
                    </motion.span>
                  )}
                  <span>{mission}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Contingent Feedback Status Banner */}
          <div className="min-h-[56px]">
            <AnimatePresence mode="wait">
              {selectedMissions.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.5, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="italic text-xs text-neutral-600 pl-1 py-2 flex items-center gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#738273]" />
                  <span>Please click to select missions above to initialize telemetry.</span>
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[#FAFBF9] border border-[#EAECE9] rounded-2xl p-4 sm:p-5 flex flex-row items-center justify-between gap-4 shadow-xs">
                    <div className="text-sm sm:text-base text-[#1C2E1E]">
                      <span className="text-[#738273]">Ready to initiate: </span>
                      <span className="font-semibold text-black">
                        {selectedMissions.join(', ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTerminalLaunch}
                      className="inline-flex items-center gap-1.5 text-[#4D6D47] uppercase text-xs font-bold tracking-wider hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap group shrink-0"
                    >
                      <span>Execute in Terminal</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

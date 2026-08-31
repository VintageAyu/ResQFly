import React from 'react';
import { ArrowUp, ShieldCheck } from 'lucide-react';
import { PageTab } from './Navbar';

interface FooterProps {
  onNavigate?: (tab: PageTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNav = (tab: PageTab) => {
    if (onNavigate) {
      onNavigate(tab);
    }
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0F1710] text-neutral-400 py-16 border-t border-[#253927] text-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#253927]">
          {/* Column 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-1">
                <span>ResQFly</span>
                <span className="text-xs font-normal text-emerald-400">&reg;</span>
              </span>
              <span className="text-xl text-emerald-400 font-medium leading-none mb-1">
                &#10033;
              </span>
            </div>
            <p className="text-neutral-400 max-w-sm leading-relaxed text-sm font-normal">
              Autonomous drone fleet command & control from the web. Engineered for search-and-rescue, commercial surveillance, and instant aerial logistics.
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-emerald-300">
                14 Planetary Drone Hubs Operational
              </span>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-300 font-semibold block mb-4">
              Navigation
            </span>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('home')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('terminal')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Live Terminal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('pricing')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Pricing Plans ($0 / $10 / $50)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('about')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  About Us & Lore
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Tech & Fleet */}
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-300 font-semibold block mb-4">
              Autonomous Tech
            </span>
            <ul className="space-y-2.5 text-sm">
              <li
                onClick={() => handleNav('terminal')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                WebRTC Mesh Link
              </li>
              <li
                onClick={() => handleNav('terminal')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                FLIR Radiometric Cloud
              </li>
              <li
                onClick={() => handleNav('terminal')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Swarm AI Coordination
              </li>
              <li
                onClick={() => handleNav('terminal')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                RTK Precision GPS
              </li>
            </ul>
          </div>

          {/* Column 4: Executive Leadership */}
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-300 font-semibold block mb-4">
              Executive
            </span>
            <div className="space-y-2 text-sm">
              <p className="text-white font-medium">Ayush Kumar</p>
              <p className="text-xs text-emerald-400">Chief Executive Officer</p>
              <p className="text-xs text-neutral-500 pt-2">
                ResQFly Aerospace & Autonomous Robotics Inc.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>&copy; 2026 ResQFly Inc. Led by CEO Ayush Kumar. All rights reserved.</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>Back to Top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

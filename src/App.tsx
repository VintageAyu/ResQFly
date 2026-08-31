import React, { useState, useEffect } from 'react';
import { Navbar, PageTab } from './components/Navbar';
import { BackgroundVideo } from './components/BackgroundVideo';
import { HeroContent } from './components/HeroContent';
import { DroneTerminal } from './components/DroneTerminal';
import { AboutLore } from './components/AboutLore';
import { PricingSection } from './components/PricingSection';
import { Footer } from './components/Footer';
import { motion, AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  const getInitialTab = (): PageTab => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash === 'terminal' || hash === 'pricing' || hash === 'about') {
      return hash as PageTab;
    }
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<PageTab>(getInitialTab);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'terminal' || hash === 'pricing' || hash === 'about' || hash === 'home') {
        setActiveTab(hash as PageTab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (tab: PageTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative bg-white text-neutral-900 font-sans selection:bg-[#EAECE9] selection:text-[#1C2E1E] antialiased overflow-x-hidden min-h-screen flex flex-col justify-between">
      {/* Sticky Top Navigation with Tab Routing & No Commas */}
      <Navbar activeTab={activeTab} onNavigate={handleNavigate} />

      {/* Dynamic View Switcher with Smooth Motion Transition */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {/* Hero Section with 60+ FPS Mouse Scrubbable Human Body */}
              <div className="relative flex flex-col lg:block lg:min-h-screen">
                <HeroContent onNavigate={handleNavigate} />
                <BackgroundVideo />
              </div>

              {/* Home Page Lore & Highlights */}
              <AboutLore onNavigate={handleNavigate} />
            </motion.div>
          )}

          {activeTab === 'terminal' && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <DroneTerminal onNavigate={handleNavigate} />
            </motion.div>
          )}

          {activeTab === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <PricingSection onNavigate={handleNavigate} />
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <AboutLore onNavigate={handleNavigate} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Brand Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
};

export default App;

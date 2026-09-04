import React, { useState, useEffect } from 'react';

export type PageTab = 'home' | 'pricing' | 'terminal' | 'about';

interface NavItem {
  id: PageTab;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'about', label: 'About Us' },
];

interface NavbarProps {
  activeTab: PageTab;
  onNavigate: (tab: PageTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabClick = (tab: PageTab) => {
    onNavigate(tab);
    setIsMobileMenuOpen(false);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 px-5 sm:px-8 py-4 sm:py-5 flex flex-row justify-between items-center transition-all duration-300 ${
          scrolled
            ? 'bg-neutral-950/85 backdrop-blur-md border-b border-white/10 shadow-lg'
            : 'bg-gradient-to-b from-black/60 to-transparent'
        }`}
      >
        {/* Logo (Left side) */}
        <div className="flex flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => handleTabClick('home')}
            className="text-[21px] sm:text-[26px] tracking-tight text-white font-semibold select-none flex items-center gap-1.5 group cursor-pointer drop-shadow-sm"
          >
            <span>ResQFly</span>
            <span className="text-xs align-super font-normal text-emerald-400">&reg;</span>
          </button>
          <span className="text-[25px] sm:text-[30px] text-white select-none tracking-[-0.02em] font-medium leading-none mb-1 drop-shadow-sm">
            &#10033;
          </span>
        </div>

        {/* Desktop Nav Links (Center) - No commas, clean modern gap */}
        <nav
          className="hidden md:flex flex-row items-center gap-8 lg:gap-11 text-[20px] lg:text-[22px] text-white font-normal"
          aria-label="Main Navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`relative py-1 hover:text-white transition-all cursor-pointer ${
                  isActive
                    ? 'font-semibold text-white drop-shadow-sm'
                    : 'text-neutral-300 hover:text-white drop-shadow-xs font-normal'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop CTA (Right) */}
        <div className="hidden md:block">
          <button
            type="button"
            onClick={() => handleTabClick('terminal')}
            className="text-[20px] lg:text-[22px] text-white hover:text-emerald-300 underline underline-offset-4 hover:opacity-80 transition-all font-normal cursor-pointer drop-shadow-sm"
          >
            Launch Terminal
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 space-y-[5px] focus:outline-none z-20 cursor-pointer"
        >
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 origin-center ${
              isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 ${
              isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 origin-center ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </header>

      {/* Mobile Navigation Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-neutral-950/95 backdrop-blur-xl transition-all duration-300 md:hidden flex flex-col justify-center px-8 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="flex flex-col space-y-6 text-left">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              className={`text-3xl font-medium text-left transition-all cursor-pointer ${
                activeTab === item.id
                  ? 'text-emerald-400 font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={() => handleTabClick('terminal')}
              className="text-2xl font-medium text-emerald-400 underline underline-offset-4 hover:opacity-80 transition-opacity inline-block cursor-pointer text-left"
            >
              Launch Terminal
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

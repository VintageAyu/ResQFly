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
            ? 'bg-white/90 backdrop-blur-md border-b border-neutral-100 shadow-xs'
            : 'bg-transparent'
        }`}
      >
        {/* Logo (Left side) */}
        <div className="flex flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => handleTabClick('home')}
            className="text-[21px] sm:text-[26px] tracking-tight text-black font-semibold select-none flex items-center gap-1.5 group cursor-pointer"
          >
            <span>ResQFly</span>
            <span className="text-xs align-super font-normal text-[#4D6D47]">&reg;</span>
          </button>
          <span className="text-[25px] sm:text-[30px] text-black select-none tracking-[-0.02em] font-medium leading-none mb-1">
            &#10033;
          </span>
        </div>

        {/* Desktop Nav Links (Center) - No commas, clean modern gap */}
        <nav
          className="hidden md:flex flex-row items-center gap-8 lg:gap-11 text-[20px] lg:text-[22px] text-black font-normal"
          aria-label="Main Navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`relative py-1 hover:opacity-70 transition-all cursor-pointer ${
                  isActive
                    ? 'font-semibold text-black'
                    : 'text-neutral-700 font-normal'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1C2E1E] rounded-full" />
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
            className="text-[20px] lg:text-[22px] text-black underline underline-offset-4 hover:opacity-60 transition-opacity font-normal cursor-pointer"
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
            className={`w-6 h-[2px] bg-black transition-all duration-300 origin-center ${
              isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 ${
              isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 origin-center ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </header>

      {/* Mobile Navigation Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-white/95 backdrop-blur-md transition-all duration-300 md:hidden flex flex-col justify-center px-8 ${
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
              className={`text-3xl font-medium text-left transition-opacity cursor-pointer ${
                activeTab === item.id
                  ? 'text-[#1C2E1E] font-bold'
                  : 'text-neutral-800 hover:opacity-60'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-6 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => handleTabClick('terminal')}
              className="text-2xl font-medium text-[#1C2E1E] underline underline-offset-4 hover:opacity-60 transition-opacity inline-block cursor-pointer text-left"
            >
              Launch Terminal
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

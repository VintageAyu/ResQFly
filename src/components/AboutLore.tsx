import React from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Cpu,
  Layers,
  Shield,
  Award,
  Globe,
  Quote,
  ArrowRight,
} from 'lucide-react';
import { PageTab } from './Navbar';

const PILLARS = [
  {
    icon: Cpu,
    title: 'Autonomous Swarm AI',
    desc: 'Distributed edge neural networks calculate collision-free flight corridors in real time without human piloting intervention.',
  },
  {
    icon: Globe,
    title: 'Sub-20ms WebRTC Mesh',
    desc: 'Encrypted peer-to-peer cloud telemetry bridges standard web browsers to military-grade flight controllers across the globe.',
  },
  {
    icon: Shield,
    title: 'Fail-Safe Geofencing',
    desc: 'Triple-redundant GPS/RTK and barometric sensors guarantee immediate Return-to-Base (RTB) under critical battery or loss-of-link.',
  },
  {
    icon: Layers,
    title: 'Modular Payload Control',
    desc: 'From thermal FLIR radiometry to precision emergency medical winches, trigger hardware payloads with simple web APIs.',
  },
];

interface AboutLoreProps {
  onNavigate?: (tab: PageTab) => void;
}

export const AboutLore: React.FC<AboutLoreProps> = ({ onNavigate }) => {
  return (
    <section id="about" className="relative pt-28 pb-28 bg-[#FAFBF9] text-neutral-900 border-t border-neutral-200/80 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2E1E]/5 text-[#1C2E1E] text-xs font-semibold uppercase tracking-wider mb-4 border border-[#1C2E1E]/10">
            <Compass className="w-3.5 h-3.5 text-[#4D6D47]" />
            <span>The ResQFly Story & Vision</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-black leading-tight">
            From emergency response roots to the world's most accessible drone cloud.
          </h1>
        </div>

        {/* The Lore & What We Are Now Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 items-stretch">
          {/* Box 1: The Lore */}
          <div className="bg-white border border-[#EAECE9] rounded-3xl p-8 sm:p-10 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#738273] mb-3 block">
                01 // The Lore & Origin
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black mb-4">
                Born in high-stakes aerial rescue missions.
              </h2>
              <p className="text-base sm:text-lg text-[#5A635A] leading-relaxed mb-6 font-normal">
                ResQFly began with a critical mission: when natural disasters, flash floods, and remote mountainous terrain made ground search-and-rescue impossible, human first responders needed autonomous aerial eyes in the sky within seconds.
              </p>
              <p className="text-base sm:text-lg text-[#5A635A] leading-relaxed font-normal">
                Traditional drone stations required bulky ground stations and licensed pilots on site. ResQFly disrupted this paradigm by building hardware-agnostic flight software connected directly to cellular and satellite mesh networks.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C2E1E] uppercase tracking-wider">
                100% Autonomous • Zero Pilot Latency
              </span>
              <Award className="w-5 h-5 text-[#4D6D47]" />
            </div>
          </div>

          {/* Box 2: What We Are Now */}
          <div className="bg-[#1C2E1E] text-white rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400/80 mb-3 block">
                02 // What We Are Now
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white mb-4">
                The global web operating system for autonomous drones.
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed mb-6 font-normal">
                Today, ResQFly is an enterprise-grade cloud ecosystem where any user or organization can dispatch, route, and command autonomous drone fleets directly from their browser.
              </p>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                With a single tap or terminal command, our platform coordinates autonomous flight paths, thermal vision scans, automated emergency cargo drops, and continuous perimeter monitoring with zero local software installation.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-900/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                Global Fleet Telemetry Live
              </span>
              <span className="text-xs font-mono text-neutral-400">v4.2 Cloud OS</span>
            </div>
          </div>
        </div>

        {/* Leadership Spotlight: CEO Ayush Kumar */}
        <div className="bg-white border border-[#EAECE9] rounded-3xl p-8 sm:p-12 mb-20 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 flex flex-col items-start">
              <div className="w-20 h-20 rounded-2xl bg-[#1C2E1E] text-white flex items-center justify-center font-serif text-3xl font-bold shadow-md shadow-emerald-950/20 mb-4">
                AK
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-black">
                Ayush Kumar
              </h3>
              <p className="text-sm font-medium text-[#4D6D47] mt-0.5">
                Chief Executive Officer & Founder
              </p>
              <span className="text-xs text-[#738273] mt-2 bg-neutral-100 px-3 py-1 rounded-full">
                ResQFly Aerospace & Robotics
              </span>
            </div>

            <div className="lg:col-span-8 border-t lg:border-t-0 lg:border-l border-neutral-200/80 pt-6 lg:pt-0 lg:pl-10">
              <Quote className="w-8 h-8 text-[#4D6D47]/40 mb-3" />
              <blockquote className="text-lg sm:text-xl text-[#1C2E1E] leading-relaxed font-normal italic mb-4">
                "Our mission at ResQFly is simple: make autonomous aerial robotics universally accessible, programmable, and dependable from a single browser tab. Whether saving lives in rugged disaster zones or monitoring vital infrastructure, autonomous flight should be instantaneous, intelligent, and seamless."
              </blockquote>
              <p className="text-xs font-mono uppercase tracking-wider text-[#5A635A]">
                — Ayush Kumar, CEO ResQFly
              </p>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="mb-16">
          <h3 className="text-2xl font-medium tracking-tight text-black mb-8">
            Engineered for Mission-Critical Autonomy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  whileHover={{ y: -4 }}
                  className="bg-white border border-[#EAECE9] rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#FAFBF9] border border-[#EAECE9] flex items-center justify-center mb-4 text-[#1C2E1E]">
                      <Icon className="w-5 h-5 text-[#4D6D47]" />
                    </div>
                    <h4 className="text-lg font-semibold text-black mb-2">
                      {pillar.title}
                    </h4>
                    <p className="text-sm text-[#5A635A] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Quick CTA to Terminal */}
        {onNavigate && (
          <div className="bg-[#1C2E1E] text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div>
              <h3 className="text-2xl font-medium tracking-tight text-white mb-1">
                Ready to take command of autonomous drones?
              </h3>
              <p className="text-sm text-neutral-300">
                Launch the web terminal now and start sending autonomous flight commands.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onNavigate('terminal');
                window.location.hash = 'terminal';
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 bg-white text-[#1C2E1E] hover:bg-neutral-100 px-6 py-3.5 rounded-2xl text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Launch Live Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

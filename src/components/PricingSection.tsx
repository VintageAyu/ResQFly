import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';
import { PageTab } from './Navbar';

interface PricingTier {
  id: string;
  name: string;
  priceMonthly: number;
  badge?: string;
  description: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Cadet (Free)',
    priceMonthly: 0,
    description: 'Perfect for individual drone hobbyists and learning autonomous flight commands.',
    features: [
      '1 Active Autonomous Drone Slot',
      'Full Web Terminal Command Access',
      '5 Autonomous Flight Hours / mo',
      'Standard Telemetry Stream (1Hz)',
      'Community Drone Discord Support',
      'Simulation Test Sandbox Mode',
    ],
    cta: 'Start Free Command',
  },
  {
    id: 'pro',
    name: 'Pro Pilot',
    priceMonthly: 10,
    badge: 'Most Popular',
    highlight: true,
    description: 'Designed for aerial search & rescue operators, surveyors, and commercial pilots.',
    features: [
      '5 Autonomous Drone Mesh Slots',
      'Sub-50ms WebRTC Video & Telemetry',
      '50 Autonomous Flight Hours / mo',
      'AI Neural Obstacle Avoidance',
      'Automated Waypoint Route Generator',
      '24/7 Responder Priority Support',
      'Emergency Geo-Fence Protocol',
    ],
    cta: 'Deploy Pro Fleet ($10/mo)',
  },
  {
    id: 'fleet',
    name: 'Enterprise Fleet',
    priceMonthly: 50,
    badge: 'Unlimited Swarm',
    description: 'For emergency agencies, logistics firms, and industrial multi-drone swarm fleets.',
    features: [
      'Unlimited Autonomous Drone Fleet',
      'Multi-Drone Swarm AI Coordination',
      'Unlimited Autonomous Flight Hours',
      'Radiometric FLIR Thermal & LiDAR Mesh',
      'Custom Winch & Cargo Payload Web APIs',
      'Dedicated SLA (99.99% Uptime Guarantee)',
      'Direct Executive Advisory by CEO Ayush Kumar',
    ],
    cta: 'Command Fleet ($50/mo)',
  },
];

interface PricingSectionProps {
  onNavigate?: (tab: PageTab) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onNavigate }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>('pro');

  const handlePlanClick = () => {
    if (onNavigate) {
      onNavigate('terminal');
    }
    window.location.hash = 'terminal';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="pricing" className="relative pt-28 pb-28 bg-white text-neutral-900 border-t border-neutral-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2E1E]/5 text-[#1C2E1E] text-xs font-semibold uppercase tracking-wider mb-4 border border-[#1C2E1E]/10">
            <Zap className="w-3.5 h-3.5 text-[#4D6D47]" />
            <span>Transparent Drone Cloud Pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-black">
            Simple plans for single drones to global autonomous fleets.
          </h1>
          <p className="text-base sm:text-lg text-[#5A635A] mt-4 font-normal">
            Every plan includes instant browser terminal access, cloud telemetry, and fail-safe return-to-base protocols.
          </p>

          {/* Billing Cycle Switch */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-full bg-[#FAFBF9] border border-[#EAECE9]">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[#1C2E1E] text-white shadow-xs'
                  : 'text-[#5A635A] hover:text-black'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-[#1C2E1E] text-white shadow-xs'
                  : 'text-[#5A635A] hover:text-black'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {TIERS.map((tier) => {
            const isSelected = selectedPlan === tier.id;
            const price =
              billingCycle === 'annual'
                ? Math.round(tier.priceMonthly * 0.8)
                : tier.priceMonthly;

            return (
              <motion.div
                key={tier.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedPlan(tier.id)}
                className={`relative rounded-3xl p-8 sm:p-10 flex flex-col justify-between cursor-pointer transition-all ${
                  tier.highlight
                    ? 'bg-[#1C2E1E] text-white shadow-2xl shadow-emerald-950/20 ring-2 ring-[#4D6D47]'
                    : 'bg-[#FAFBF9] text-neutral-900 border border-[#EAECE9] hover:border-neutral-300'
                }`}
              >
                {/* Badge if present */}
                {tier.badge && (
                  <div className="absolute -top-3.5 right-8">
                    <span className="inline-flex items-center gap-1 bg-[#4D6D47] text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                      <Sparkles className="w-3 h-3" />
                      <span>{tier.badge}</span>
                    </span>
                  </div>
                )}

                <div>
                  <h3
                    className={`text-2xl font-semibold tracking-tight ${
                      tier.highlight ? 'text-white' : 'text-black'
                    }`}
                  >
                    {tier.name}
                  </h3>
                  <p
                    className={`text-sm mt-2 font-normal leading-relaxed ${
                      tier.highlight ? 'text-neutral-300' : 'text-[#5A635A]'
                    }`}
                  >
                    {tier.description}
                  </p>

                  {/* Price Block */}
                  <div className="mt-6 mb-8 flex items-baseline gap-1.5">
                    <span
                      className={`text-5xl font-bold tracking-tight ${
                        tier.highlight ? 'text-white' : 'text-black'
                      }`}
                    >
                      ${price}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        tier.highlight ? 'text-neutral-300' : 'text-[#738273]'
                      }`}
                    >
                      / month
                    </span>
                  </div>

                  {/* Features List */}
                  <div
                    className={`pt-6 border-t ${
                      tier.highlight ? 'border-neutral-700/60' : 'border-neutral-200'
                    }`}
                  >
                    <span
                      className={`text-xs font-mono uppercase tracking-wider block mb-4 ${
                        tier.highlight ? 'text-emerald-300' : 'text-[#1C2E1E]'
                      }`}
                    >
                      Included Capabilities:
                    </span>
                    <ul className="space-y-3">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-sm">
                          <span
                            className={`mt-0.5 p-0.5 rounded-full ${
                              tier.highlight
                                ? 'bg-emerald-400/20 text-emerald-300'
                                : 'bg-[#1C2E1E]/10 text-[#1C2E1E]'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </span>
                          <span
                            className={
                              tier.highlight ? 'text-neutral-200' : 'text-neutral-700'
                            }
                          >
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Plan Selection CTA Button */}
                <div className="mt-10">
                  <button
                    type="button"
                    onClick={handlePlanClick}
                    className={`w-full py-4 px-6 rounded-2xl font-medium text-sm text-center transition-all flex items-center justify-center gap-2 group cursor-pointer ${
                      tier.highlight
                        ? 'bg-white text-[#1C2E1E] hover:bg-neutral-100 shadow-md'
                        : isSelected
                        ? 'bg-[#1C2E1E] text-white hover:bg-black'
                        : 'bg-white border border-[#EAECE9] text-[#1C2E1E] hover:bg-neutral-100'
                    }`}
                  >
                    <span>{tier.cta}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Enterprise Callout Banner */}
        <div className="mt-16 bg-[#FAFBF9] border border-[#EAECE9] rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1C2E1E] text-white flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-black">
                Custom Hardware or Government Air-Corps Deployment?
              </h4>
              <p className="text-sm text-[#5A635A] mt-0.5">
                Our executive engineering team and CEO Ayush Kumar provide tailored onboard flight computer integration.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePlanClick}
            className="whitespace-nowrap px-6 py-3.5 rounded-2xl bg-[#1C2E1E] hover:bg-black text-white text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
          >
            Contact Engineering Team
          </button>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { X, Shield, Cpu, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className="bg-[#141A22] border border-[#2A3542] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-[#E6EDF3] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2A3542]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22D3A7]/20 border border-[#22D3A7]/40 flex items-center justify-center text-[#22D3A7]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="about-modal-title" className="text-lg font-bold text-[#E6EDF3]">
                RailGuard Architecture & Prototype Scope
              </h2>
              <p className="text-xs text-[#9BA8B7]">
                AI-Powered Automatic Block Planning for Indian Railways
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1C242E] text-[#9BA8B7] hover:text-[#E6EDF3] transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advisory Invariant Banner */}
        <div className="p-3.5 rounded-xl bg-[#22D3A7]/10 border border-[#22D3A7]/30 text-xs text-[#E6EDF3] space-y-1">
          <div className="font-bold text-[#22D3A7] flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Core Safety Principle: Advisory Only
          </div>
          <p className="text-[#9BA8B7] leading-relaxed">
            RailGuard operates strictly as a decision-support copilot. It does not communicate with loco pilots, does not actuate track points, and does not alter electronic interlocking. Every traffic mitigation sits in a <code>PENDING</code> state until a certified human traffic controller approves it.
          </p>
        </div>

        {/* Two-Agent System Overview */}
        <div className="space-y-2 text-xs">
          <h3 className="text-sm font-semibold text-[#E6EDF3] flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[#4F9CF9]" /> Two-Agent Decision Chain
          </h3>
          <ul className="space-y-1.5 text-[#9BA8B7] pl-4 list-disc">
            <li>
              <strong className="text-[#E6EDF3]">Agent 1 (Asset Health & Predictive Maintenance):</strong> Continuously monitors track geometry, wheel vibration, OHE contact voltage dip, and signal relay response times. Extrapolates failure trends via least-squares linear regression to alert on slope <em>before</em> raw metrics touch critical safety limits.
            </li>
            <li>
              <strong className="text-[#E6EDF3]">Agent 2 (Traffic Coordination):</strong> Instantly ingests Agent 1's risk signal and evaluates a deterministic 3-branch cascade: (A) Dijkstra alternate route detour, (B) Loop-line regulation siding hold, or (C) Smoothed velocity profile to preserve follower train kinetic energy.
            </li>
          </ul>
        </div>

        {/* Explicit Prototype Limitations */}
        <div className="space-y-2 pt-2 border-t border-[#2A3542]">
          <h3 className="text-sm font-semibold text-[#F2994A] flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Stated Prototype Limitations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-[#1C242E] border border-[#2A3542]">
              <div className="font-semibold text-[#E6EDF3] mb-1">1. Simulated Loop Occupancy</div>
              <p className="text-[#9BA8B7] text-[11px] leading-relaxed">
                Loop-line occupancy uses simulated in-memory state; production deployment requires integration with IR live axle-counter/track circuit feeds.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#1C242E] border border-[#2A3542]">
              <div className="font-semibold text-[#E6EDF3] mb-1">2. Local Section Scope</div>
              <p className="text-[#9BA8B7] text-[11px] leading-relaxed">
                Optimization is localized to the affected block and adjacent chord; network-wide timetable rescheduling is NP-hard and outside this prototype's boundary.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#1C242E] border border-[#2A3542]">
              <div className="font-semibold text-[#E6EDF3] mb-1">3. Synthetic Telemetry</div>
              <p className="text-[#9BA8B7] text-[11px] leading-relaxed">
                Telemetry streams are synthetically generated; interfacing legacy track-circuit and OHE hardware requires dedicated wayside data engineering.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#1C242E] border border-[#2A3542]">
              <div className="font-semibold text-[#E6EDF3] mb-1">4. Illustrative Energy Calculations</div>
              <p className="text-[#9BA8B7] text-[11px] leading-relaxed">
                Energy figures are physics-based kinetic momentum estimates (<span className="font-mono">0.5·m·v²</span>), not direct power-metered electrical measurements.
              </p>
            </div>
          </div>
        </div>

        {/* Footer close button */}
        <div className="pt-3 border-t border-[#2A3542] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-lg bg-[#22D3A7] hover:bg-[#1eb992] text-[#0B0F14] font-bold text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
};


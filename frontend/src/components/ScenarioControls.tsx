import React from 'react';
import {
  Play, RotateCcw, AlertTriangle, Disc, Zap, Warehouse,
  FastForward, Info
} from 'lucide-react';

interface ScenarioControlsProps {
  onRunDemo: () => void;
  onInjectTrack: () => void;
  onInjectWheel: () => void;
  onInjectOHE: () => void;
  onToggleLoop: () => void;
  onSetSpeed: (speed: number) => void;
  onReset: () => void;
  onOpenAbout: () => void;
  currentSpeed: number;
  isLoopOccupied: boolean;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  onRunDemo,
  onInjectTrack,
  onInjectWheel,
  onInjectOHE,
  onToggleLoop,
  onSetSpeed,
  onReset,
  onOpenAbout,
  currentSpeed,
  isLoopOccupied,
}) => {
  return (
    <header className="bg-[#141A22] border-b border-[#2A3542] px-4 py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
        {/* Brand & System Mode */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22D3A7]/30 to-[#4F9CF9]/20 border border-[#22D3A7]/40 flex items-center justify-center font-bold text-lg text-[#22D3A7] shadow-inner">
            RG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E6EDF3] tracking-tight">
                RailGuard
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22D3A7]/15 text-[#22D3A7] border border-[#22D3A7]/30">
                AI Block Planning Prototype
              </span>
              <span className="text-xs text-[#9BA8B7] hidden md:inline">
                Indian Railways
              </span>
            </div>
            <div className="text-xs text-[#9BA8B7] flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#22D3A7] animate-pulse" />
              <span>Two-Agent Autonomous Decision Support System</span>
              <button
                type="button"
                onClick={onOpenAbout}
                className="text-[#4F9CF9] hover:underline flex items-center gap-0.5 ml-1 text-[11px]"
                aria-label="View system architecture and limitations"
              >
                <Info className="w-3 h-3" /> Architecture & Limitations
              </button>
            </div>
          </div>
        </div>

        {/* Pinned Scenario Controls Bar (Always Visible, Big Buttons) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scripted Demo Button (Hero) */}
          <button
            type="button"
            onClick={onRunDemo}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#22D3A7] hover:bg-[#1eb992] text-[#0B0F14] font-bold text-xs flex items-center gap-2 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
            aria-label="Run Scripted Demo Scenario"
          >
            <Play className="w-4 h-4 fill-current" />
            ▶ Run Demo Scenario
          </button>

          {/* Fault 1: Track Geometry */}
          <button
            type="button"
            onClick={onInjectTrack}
            className="min-h-[44px] px-3 py-2 rounded-lg bg-[#1C242E] hover:bg-[#25303D] text-[#E6EDF3] border border-[#2A3542] font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
            aria-label="Inject Track Geometry Fault on Block B2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#F2994A]" />
            Track Fault (B2)
          </button>

          {/* Fault 2: Wheel Vibration */}
          <button
            type="button"
            onClick={onInjectWheel}
            className="min-h-[44px] px-3 py-2 rounded-lg bg-[#1C242E] hover:bg-[#25303D] text-[#E6EDF3] border border-[#2A3542] font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
            aria-label="Inject Wheel Vibration Fault on Train 12045"
          >
            <Disc className="w-3.5 h-3.5 text-[#4F9CF9]" />
            Wheel Fault
          </button>

          {/* Fault 3: OHE Fault (No Alternate Route) */}
          <button
            type="button"
            onClick={onInjectOHE}
            className="min-h-[44px] px-3 py-2 rounded-lg bg-[#1C242E] hover:bg-[#25303D] text-[#E6EDF3] border border-[#2A3542] font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
            aria-label="Inject OHE Fault with No Alternate Route to force loop branch"
          >
            <Zap className="w-3.5 h-3.5 text-[#EF4444]" />
            OHE Fault (No Alt Route)
          </button>

          {/* Siding Occupancy Toggle */}
          <button
            type="button"
            onClick={onToggleLoop}
            className={`min-h-[44px] px-3 py-2 rounded-lg border font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7] ${
              isLoopOccupied
                ? 'bg-[#F2994A]/15 text-[#F2994A] border-[#F2994A]/40'
                : 'bg-[#22D3A7]/15 text-[#22D3A7] border-[#22D3A7]/40'
            }`}
            aria-label={`Toggle LOOP-DHN Occupancy. Currently ${isLoopOccupied ? 'Occupied' : 'Free'}`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            LOOP-DHN: {isLoopOccupied ? 'OCCUPIED' : 'FREE'}
          </button>

          {/* Speed Multiplier Buttons */}
          <div className="flex items-center bg-[#1C242E] border border-[#2A3542] rounded-lg p-0.5 min-h-[44px]">
            {[1, 5, 20].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onSetSpeed(spd)}
                className={`min-h-[38px] px-2.5 rounded-md text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7] ${
                  currentSpeed === spd
                    ? 'bg-[#22D3A7] text-[#0B0F14]'
                    : 'text-[#9BA8B7] hover:text-[#E6EDF3]'
                }`}
                aria-label={`Set simulation speed to ${spd}x`}
              >
                {spd}×
              </button>
            ))}
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={onReset}
            className="min-h-[44px] px-3 py-2 rounded-lg bg-[#1C242E] hover:bg-[#25303D] text-[#9BA8B7] hover:text-[#E6EDF3] border border-[#2A3542] font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
            aria-label="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ⟲ Reset
          </button>
        </div>
      </div>
    </header>
  );
};


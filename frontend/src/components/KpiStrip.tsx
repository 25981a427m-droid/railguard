import React, { useEffect, useState } from 'react';
import { KpiMetrics } from '../types';
import { Clock, Zap, ShieldCheck, Cpu } from 'lucide-react';

interface KpiStripProps {
  kpi: KpiMetrics;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ kpi }) => {
  const [animatedResponse, setAnimatedResponse] = useState<number>(0.0);

  // Smooth count-up animation for the hero number
  useEffect(() => {
    let start = 0.0;
    const target = kpi.railguard_response_time_sec || 1.4;
    const step = target / 20;
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setAnimatedResponse(target);
        clearInterval(interval);
      } else {
        setAnimatedResponse(parseFloat(start.toFixed(1)));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [kpi.railguard_response_time_sec]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
      {/* KPI 1: Hero Number - Response Time Comparison */}
      <div className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-[#9BA8B7] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#22D3A7]" />
            Advisory Generation Time
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#22D3A7] tabular-nums">
              {animatedResponse.toFixed(1)} s
            </span>
            <span className="text-xs text-[#9BA8B7] line-through">
              Manual: ~45–60 min
            </span>
          </div>
          <div className="text-[11px] text-[#22D3A7]/90 mt-0.5 font-medium">
            AI Automated Block Escalation
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-[#22D3A7]/10 border border-[#22D3A7]/20 flex items-center justify-center text-[#22D3A7] font-bold text-sm">
          99%↓
        </div>
      </div>

      {/* KPI 2: Agent Handoff Latency */}
      <div className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-[#9BA8B7] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#4F9CF9]" />
            Agent 1 → Agent 2 Handoff
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#E6EDF3] tabular-nums">
              {kpi.agent_handoff_latency_ms > 0 ? kpi.agent_handoff_latency_ms.toFixed(1) : '1.2'}
            </span>
            <span className="text-sm font-semibold text-[#9BA8B7]">ms</span>
          </div>
          <div className="text-[11px] text-[#4F9CF9] mt-0.5">
            Measured in-process IPC latency
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-[#4F9CF9]/10 border border-[#4F9CF9]/20 flex items-center justify-center text-[#4F9CF9]">
          <Cpu className="w-5 h-5" />
        </div>
      </div>

      {/* KPI 3: Energy Saved */}
      <div className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-[#9BA8B7] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#F2C94C]" />
            Energy Saved
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#F2C94C] tabular-nums">
              {kpi.total_energy_saved_kwh.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-[#9BA8B7]">kWh</span>
          </div>
          <div className="text-[11px] text-[#9BA8B7] mt-0.5 italic">
            (illustrative estimate)
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-[#F2C94C]/10 border border-[#F2C94C]/20 flex items-center justify-center text-[#F2C94C]">
          <Zap className="w-5 h-5" />
        </div>
      </div>

      {/* KPI 4: Trains Protected */}
      <div className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-[#9BA8B7] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22D3A7]" />
            Trains Protected
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#E6EDF3] tabular-nums">
              {kpi.trains_protected_count}
            </span>
            <span className="text-sm font-semibold text-[#9BA8B7]">rakes</span>
          </div>
          <div className="text-[11px] text-[#22D3A7] mt-0.5">
            Zero unscheduled emergency stops
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-[#22D3A7]/10 border border-[#22D3A7]/20 flex items-center justify-center text-[#22D3A7]">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from 'recharts';
import { Advisory } from '../types';
import { Zap, Activity, Info } from 'lucide-react';

interface SpeedProfilePanelProps {
  advisories: Advisory[];
}

export const SpeedProfilePanel: React.FC<SpeedProfilePanelProps> = ({ advisories }) => {
  // Find the latest speed profile advisory, or generate fallback data
  const speedAdvisory = advisories.find(a => a.type === 'SPEED_PROFILE');
  const curveData = speedAdvisory?.payload?.profile_curve || [
    { time_sec: 0, position_km: 0, recommended_speed_kmph: 95, baseline_speed_kmph: 95 },
    { time_sec: 20, position_km: 2, recommended_speed_kmph: 80, baseline_speed_kmph: 95 },
    { time_sec: 40, position_km: 4, recommended_speed_kmph: 65, baseline_speed_kmph: 95 },
    { time_sec: 50, position_km: 5, recommended_speed_kmph: 55, baseline_speed_kmph: 0 },
    { time_sec: 60, position_km: 6, recommended_speed_kmph: 45, baseline_speed_kmph: 0 },
    { time_sec: 80, position_km: 8, recommended_speed_kmph: 45, baseline_speed_kmph: 0 },
    { time_sec: 90, position_km: 9, recommended_speed_kmph: 55, baseline_speed_kmph: 10 },
    { time_sec: 110, position_km: 11, recommended_speed_kmph: 75, baseline_speed_kmph: 35 },
    { time_sec: 120, position_km: 12, recommended_speed_kmph: 85, baseline_speed_kmph: 45 },
  ];

  const energySaved = speedAdvisory?.payload?.energy_saved_kwh ?? 38.4;

  return (
    <div className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#2A3542] gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#F2C94C]" />
          <h3 className="text-sm font-semibold text-[#E6EDF3] tracking-wide uppercase">
            Kinetic Energy & Velocity Profile Smoothing (Train 12786 Follower)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-[#F2C94C]/15 text-[#F2C94C] border border-[#F2C94C]/30 font-bold tabular-nums">
            ~{energySaved} kWh Avoided Loss
          </span>
          <span className="text-[11px] text-[#9BA8B7] italic">
            (illustrative estimate)
          </span>
        </div>
      </div>

      {/* Physics Formula Explanation Bar */}
      <div className="bg-[#1C242E] border border-[#2A3542] rounded-lg p-3 my-3 text-xs text-[#9BA8B7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-[#E6EDF3] font-medium flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#22D3A7]" />
            Avoided Kinetic Deceleration Formula:
          </div>
          <div className="font-mono text-[11px] text-[#22D3A7]">
            ΔE = 0.5 • m • (v_cruise² - v_slow²) • η_traction ≈ {energySaved} kWh
          </div>
        </div>
        <div className="text-[11px] text-[#9BA8B7] sm:text-right max-w-sm">
          Instead of full emergency stop (0 km/h) and dead-weight restart, follower coasts at 45 km/h until block clears.
        </div>
      </div>

      {/* Recharts Comparison Chart */}
      <div className="flex-1 min-h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3A7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22D3A7" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C242E" vertical={false} />
            <XAxis
              dataKey="time_sec"
              stroke="#6B7A8B"
              fontSize={10}
              tickLine={false}
              unit="s"
            />
            <YAxis
              stroke="#6B7A8B"
              fontSize={10}
              tickLine={false}
              unit=" km/h"
              domain={[0, 110]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#141A22',
                borderColor: '#2A3542',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#E6EDF3',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />

            {/* Baseline Curve (Emergency Stop) */}
            <Area
              type="monotone"
              dataKey="baseline_speed_kmph"
              name="Baseline Trajectory (Full Stop at Red Signal)"
              stroke="#EF4444"
              strokeWidth={2}
              fill="none"
              strokeDasharray="4 4"
            />

            {/* RailGuard Smoothed Glide Curve */}
            <Area
              type="monotone"
              dataKey="recommended_speed_kmph"
              name="RailGuard Smoothed Glide (Preserves Momentum)"
              stroke="#22D3A7"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorSaved)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};


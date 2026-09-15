import React, { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid, Legend
} from 'recharts';
import { TelemetryPoint, TrendAnalysis, HealthStatus } from '../types';
import { Activity, AlertTriangle, TrendingUp, Info } from 'lucide-react';

interface TelemetryPanelProps {
  telemetryHistory: Record<string, TelemetryPoint[]>;
  latestTelemetry: Record<string, TelemetryPoint | null>;
  trends: Record<string, TrendAnalysis | null>;
}

const ASSET_METADATA: Record<string, { label: string; warning: number; critical: number; unit: string; block: string }> = {
  'TRACK-B2-GEO': {
    label: 'Track Geometry Deviation (Block B2)',
    warning: 4.0,
    critical: 7.0,
    unit: 'mm',
    block: 'B2',
  },
  'WHEEL-12045': {
    label: 'Wheel Vibration RMS (Train 12045)',
    warning: 0.8,
    critical: 1.4,
    unit: 'g',
    block: 'B1',
  },
  'OHE-B2': {
    label: 'OHE Contact Voltage Dip (Block B2)',
    warning: 6.0,
    critical: 10.0,
    unit: '%',
    block: 'B2',
  },
  'SIG-DHN-A': {
    label: 'Signal Relay Response Time (Dhone Jn)',
    warning: 120.0,
    critical: 200.0,
    unit: 'ms',
    block: 'B3',
  },
};

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetryHistory,
  latestTelemetry,
  trends,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string>('TRACK-B2-GEO');

  const meta = ASSET_METADATA[selectedAsset] || ASSET_METADATA['TRACK-B2-GEO'];
  const history = telemetryHistory[selectedAsset] || [];
  const latest = latestTelemetry[selectedAsset];
  const trend = trends[selectedAsset];

  // Prepare chart data with extrapolated trend projection
  const chartData = history.map((pt, idx) => ({
    time: `-${history.length - 1 - idx}s`,
    raw: pt.value,
    projection: null as number | null,
    warning: meta.warning,
    critical: meta.critical,
  }));

  // Append 8 future projection points if positive slope exists
  if (history.length > 0 && trend && trend.slope > 0.001) {
    const lastVal = history[history.length - 1].value;
    for (let i = 1; i <= 8; i++) {
      const futureTimeSec = i * 5;
      const projVal = Math.min(meta.critical * 1.3, lastVal + trend.slope * futureTimeSec);
      chartData.push({
        time: `+${futureTimeSec}s`,
        raw: null as any,
        projection: parseFloat(projVal.toFixed(2)),
        warning: meta.warning,
        critical: meta.critical,
      });
    }
  }

  const getStatusBadge = (status?: HealthStatus) => {
    switch (status) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">CRITICAL BREACH</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#F2994A]/20 text-[#F2994A] border border-[#F2994A]/40">EARLY WARNING</span>;
      case 'WATCH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#F2C94C]/20 text-[#F2C94C] border border-[#F2C94C]/40">WATCHING TREND</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#22D3A7]/20 text-[#22D3A7] border border-[#22D3A7]/40">SAFE / NOMINAL</span>;
    }
  };

  return (
    <div className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex flex-col h-full">
      {/* Top Controls: Asset Tabs & Metric Cards */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2A3542]">
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(ASSET_METADATA).map(([assetId, cfg]) => {
            const isSelected = selectedAsset === assetId;
            const assetTrend = trends[assetId];
            return (
              <button
                key={assetId}
                type="button"
                onClick={() => setSelectedAsset(assetId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#22D3A7] ${
                  isSelected
                    ? 'bg-[#1C242E] text-[#22D3A7] border border-[#22D3A7]/50 shadow-sm'
                    : 'text-[#9BA8B7] hover:text-[#E6EDF3] hover:bg-[#1C242E]/50 border border-transparent'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    assetTrend?.status === 'CRITICAL' ? 'bg-[#EF4444]' :
                    assetTrend?.status === 'WARNING' ? 'bg-[#F2994A]' :
                    assetTrend?.status === 'WATCH' ? 'bg-[#F2C94C]' : 'bg-[#22D3A7]'
                  }`}
                />
                {assetId}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge(trend?.status || latest?.status)}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
        <div className="bg-[#1C242E] border border-[#2A3542] rounded-lg p-2.5">
          <div className="text-[11px] text-[#9BA8B7]">Live Telemetry Value</div>
          <div className="text-xl font-bold text-[#E6EDF3] tabular-nums mt-0.5">
            {latest?.value ?? '--'} <span className="text-xs font-normal text-[#9BA8B7]">{meta.unit}</span>
          </div>
        </div>

        <div className="bg-[#1C242E] border border-[#2A3542] rounded-lg p-2.5">
          <div className="text-[11px] text-[#9BA8B7]">Trend Slope (Rate)</div>
          <div className="text-xl font-bold text-[#4F9CF9] tabular-nums mt-0.5">
            {trend?.slope ? (trend.slope > 0 ? `+${trend.slope}` : trend.slope) : '0.0000'}
            <span className="text-xs font-normal text-[#9BA8B7]"> {meta.unit}/s</span>
          </div>
        </div>

        <div className="bg-[#1C242E] border border-[#2A3542] rounded-lg p-2.5">
          <div className="text-[11px] text-[#9BA8B7]">Extrapolated Time-to-Critical</div>
          <div className="text-xl font-bold text-[#F2994A] tabular-nums mt-0.5">
            {trend?.time_to_threshold_sec !== null && trend?.time_to_threshold_sec !== undefined
              ? `${Math.round(trend.time_to_threshold_sec)} s`
              : 'Safe (>180s)'}
          </div>
        </div>

        <div className="bg-[#1C242E] border border-[#2A3542] rounded-lg p-2.5">
          <div className="text-[11px] text-[#9BA8B7]">Synthesized Risk Score</div>
          <div className="text-xl font-bold text-[#22D3A7] tabular-nums mt-0.5">
            {trend?.risk_score ?? 0} <span className="text-xs font-normal text-[#9BA8B7]">/ 100</span>
          </div>
        </div>
      </div>

      {/* Chart Callout Banner */}
      <div className="bg-[#0B0F14] border border-[#2A3542] rounded-lg px-3 py-1.5 mb-2 flex items-center gap-2 text-xs text-[#9BA8B7]">
        <Info className="w-4 h-4 text-[#22D3A7] shrink-0" />
        <span>
          <strong className="text-[#E6EDF3]">Predictive Edge:</strong> Agent 1 triggers at the amber Warning line (~{meta.warning} {meta.unit}), extrapolating degradation ahead of time so Agent 2 coordinates traffic <strong className="text-[#22D3A7]">before</strong> the raw metric crosses Critical ({meta.critical} {meta.unit}).
        </span>
      </div>

      {/* Recharts Line Chart */}
      <div className="flex-1 min-h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C242E" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#6B7A8B"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              stroke="#6B7A8B"
              fontSize={10}
              tickLine={false}
              domain={[0, (dataMax: number) => Math.max(dataMax, meta.critical * 1.25)]}
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

            {/* Threshold Lines */}
            <ReferenceLine
              y={meta.warning}
              stroke="#F2994A"
              strokeDasharray="4 4"
              label={{ value: `WARNING (${meta.warning} ${meta.unit})`, fill: '#F2994A', fontSize: 10, position: 'right' }}
            />
            <ReferenceLine
              y={meta.critical}
              stroke="#EF4444"
              strokeDasharray="4 4"
              label={{ value: `CRITICAL (${meta.critical} ${meta.unit})`, fill: '#EF4444', fontSize: 10, position: 'right' }}
            />

            {/* Historical Raw Telemetry Line */}
            <Line
              type="monotone"
              dataKey="raw"
              name="Raw Telemetry"
              stroke="#22D3A7"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Extrapolated Trend Line (Dotted) */}
            <Line
              type="linear"
              dataKey="projection"
              name="Extrapolated Trend (Linear Fit)"
              stroke="#4F9CF9"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};


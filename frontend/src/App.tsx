import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { ScenarioControls } from './components/ScenarioControls';
import { KpiStrip } from './components/KpiStrip';
import { NetworkMap } from './components/NetworkMap';
import { AdvisoryQueue } from './components/AdvisoryQueue';
import { TelemetryPanel } from './components/TelemetryPanel';
import { SpeedProfilePanel } from './components/SpeedProfilePanel';
import { AgentLog } from './components/AgentLog';
import { FooterBanner } from './components/FooterBanner';
import { AboutModal } from './components/AboutModal';
import { Activity, Gauge, Terminal, Wifi, WifiOff } from 'lucide-react';

export function App() {
  const {
    state,
    connected,
    approveAdvisory,
    rejectAdvisory,
    injectFault,
    toggleLoop,
    setSpeed,
    reset,
    runDemoScenario,
  } = useSocket();

  const [bottomTab, setBottomTab] = useState<'telemetry' | 'speed' | 'logs'>('telemetry');
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);

  // Fallback defaults if waiting for first WebSocket tick
  const stations = state?.stations || {};
  const blocks = state?.blocks || {};
  const loopLines = state?.loop_lines || {};
  const trains = state?.trains || {};
  const advisories = state?.advisories || [];
  const tickets = state?.tickets || [];
  const logs = state?.logs || [];
  const kpi = state?.kpi || {
    manual_escalation_baseline_sec: 3300,
    railguard_response_time_sec: 1.4,
    agent_handoff_latency_ms: 1.2,
    total_energy_saved_kwh: 0,
    trains_protected_count: 0,
  };
  const simSpeed = state?.sim_speed || 1;
  const isLoopOccupied = loopLines['LOOP-DHN']?.occupied ?? true;

  // Check if reroute is approved on Train 12628 to animate alternate path
  const train12628 = trains['12628'];
  const isRerouteActive = train12628?.route?.includes('A1') || train12628?.status_text?.includes('Reroute');

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E6EDF3] flex flex-col font-sans">
      {/* Sticky Header & Scenario Controls */}
      <ScenarioControls
        onRunDemo={runDemoScenario}
        onInjectTrack={() => injectFault('track_geo')}
        onInjectWheel={() => injectFault('wheel_vib')}
        onInjectOHE={() => injectFault('ohe_no_alt')}
        onToggleLoop={() => toggleLoop('LOOP-DHN')}
        onSetSpeed={setSpeed}
        onReset={reset}
        onOpenAbout={() => setIsAboutOpen(true)}
        currentSpeed={simSpeed}
        isLoopOccupied={isLoopOccupied}
      />

      {/* Connection Indicator Bar */}
      <div className="bg-[#141A22] border-b border-[#2A3542] px-4 py-1 flex items-center justify-between text-[11px] text-[#9BA8B7]">
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="flex items-center gap-1 text-[#22D3A7]">
              <Wifi className="w-3 h-3" /> Live Telemetry Feed Connected (1000ms sim cycle)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#EF4444]">
              <WifiOff className="w-3 h-3 animate-pulse" /> Connecting to RailGuard backend...
            </span>
          )}
        </div>
        <div className="text-[11px] text-[#9BA8B7] hidden sm:block">
          Kurnool (KRN) ↔ Guntakal (GTL) ↔ Dhone (DHN) ↔ Tirupati (TPT)
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-[1720px] w-full mx-auto space-y-4">
        {/* Top KPI Strip */}
        <KpiStrip kpi={kpi} />

        {/* Central 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[460px]">
          {/* Left Column (60%): Network Map */}
          <div className="lg:col-span-7 xl:col-span-7 h-full">
            <NetworkMap
              stations={stations}
              blocks={blocks}
              loopLines={loopLines}
              trains={trains}
              isRerouteActive={Boolean(isRerouteActive)}
            />
          </div>

          {/* Right Column (40%): Advisory Queue */}
          <div className="lg:col-span-5 xl:col-span-5 h-full">
            <AdvisoryQueue
              advisories={advisories}
              onApprove={approveAdvisory}
              onReject={rejectAdvisory}
            />
          </div>
        </div>

        {/* Bottom Full-Width Tabbed Section */}
        <div className="bg-[#141A22] border border-[#2A3542] rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[380px]">
          {/* Bottom Tabs Navigation */}
          <div className="flex items-center gap-1 border-b border-[#2A3542] bg-[#0E131A] px-3 pt-2">
            <button
              type="button"
              onClick={() => setBottomTab('telemetry')}
              className={`min-h-[40px] px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-t-2 transition-all focus-visible:ring-2 focus-visible:ring-[#22D3A7] ${
                bottomTab === 'telemetry'
                  ? 'bg-[#141A22] text-[#22D3A7] border-t-[#22D3A7] border-x border-x-[#2A3542]'
                  : 'text-[#9BA8B7] hover:text-[#E6EDF3] border-t-transparent hover:bg-[#141A22]/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Agent 1: Asset Health & Predictive Telemetry
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('speed')}
              className={`min-h-[40px] px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-t-2 transition-all focus-visible:ring-2 focus-visible:ring-[#22D3A7] ${
                bottomTab === 'speed'
                  ? 'bg-[#141A22] text-[#22D3A7] border-t-[#22D3A7] border-x border-x-[#2A3542]'
                  : 'text-[#9BA8B7] hover:text-[#E6EDF3] border-t-transparent hover:bg-[#141A22]/50'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              Agent 2: Follower Speed Profile & Energy
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('logs')}
              className={`min-h-[40px] px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-t-2 transition-all focus-visible:ring-2 focus-visible:ring-[#22D3A7] ${
                bottomTab === 'logs'
                  ? 'bg-[#141A22] text-[#22D3A7] border-t-[#22D3A7] border-x border-x-[#2A3542]'
                  : 'text-[#9BA8B7] hover:text-[#E6EDF3] border-t-transparent hover:bg-[#141A22]/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Audit Stream & Maintenance Tickets
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 flex-1">
            {bottomTab === 'telemetry' && (
              <TelemetryPanel
                telemetryHistory={state?.telemetry?.history || {}}
                latestTelemetry={state?.telemetry?.latest || {}}
                trends={state?.telemetry?.trends || {}}
              />
            )}

            {bottomTab === 'speed' && (
              <SpeedProfilePanel advisories={advisories} />
            )}

            {bottomTab === 'logs' && (
              <AgentLog logs={logs} tickets={tickets} />
            )}
          </div>
        </div>
      </main>

      {/* Persistent Advisory-Only Footer */}
      <FooterBanner />

      {/* Architecture & Limitations Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}

export default App;


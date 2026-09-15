import React, { useState } from 'react';
import { LogEntry, MaintenanceTicket } from '../types';
import { Terminal, Wrench, ShieldAlert, Cpu, UserCheck } from 'lucide-react';

interface AgentLogProps {
  logs: LogEntry[];
  tickets: MaintenanceTicket[];
}

export const AgentLog: React.FC<AgentLogProps> = ({ logs, tickets }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'tickets'>('logs');

  const getSourceBadge = (source: string) => {
    if (source.includes('AGENT-1')) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#4F9CF9]/20 text-[#4F9CF9] border border-[#4F9CF9]/40">[AGENT-1]</span>;
    }
    if (source.includes('AGENT-2')) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#22D3A7]/20 text-[#22D3A7] border border-[#22D3A7]/40">[AGENT-2]</span>;
    }
    if (source.includes('CONTROLLER')) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F2C94C]/20 text-[#F2C94C] border border-[#F2C94C]/40">[CONTROLLER]</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#9BA8B7]/20 text-[#9BA8B7] border border-[#9BA8B7]/40">[SYSTEM]</span>;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-[#EF4444]';
      case 'WARNING':
        return 'text-[#F2994A]';
      case 'SUCCESS':
        return 'text-[#22D3A7]';
      default:
        return 'text-[#E6EDF3]';
    }
  };

  return (
    <div className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex flex-col h-full">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2A3542]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7] ${
              activeTab === 'logs'
                ? 'bg-[#1C242E] text-[#22D3A7] border border-[#22D3A7]/40'
                : 'text-[#9BA8B7] hover:text-[#E6EDF3]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Live Agent Event Log ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7] ${
              activeTab === 'tickets'
                ? 'bg-[#1C242E] text-[#22D3A7] border border-[#22D3A7]/40'
                : 'text-[#9BA8B7] hover:text-[#E6EDF3]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Maintenance Tickets ({tickets.length})
          </button>
        </div>

        <span className="text-[11px] text-[#9BA8B7]">
          Real-time Audit Trail
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 font-mono text-xs space-y-1.5">
        {activeTab === 'logs' ? (
          logs.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#9BA8B7] italic">
              Awaiting system events...
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-[#1C242E]/50 border border-[#2A3542]/50 flex items-start gap-2 leading-relaxed"
              >
                <span className="text-[10px] text-[#6B7A8B] shrink-0 pt-0.5 tabular-nums">
                  {new Date(log.timestamp * 1000).toLocaleTimeString()}
                </span>
                {getSourceBadge(log.source)}
                <span className={`flex-1 ${getLevelColor(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))
          )
        ) : (
          tickets.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#9BA8B7] italic">
              No open maintenance tickets. All assets nominal.
            </div>
          ) : (
            tickets.map((tkt) => (
              <div
                key={tkt.ticket_id}
                className="p-3 rounded-lg bg-[#1C242E] border border-[#2A3542] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#E6EDF3]">{tkt.ticket_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
                      {tkt.severity}
                    </span>
                    <span className="text-xs text-[#9BA8B7]">Asset: {tkt.asset_id} (Block {tkt.block_id})</span>
                  </div>
                  <span className="text-[10px] text-[#9BA8B7] tabular-nums">
                    {new Date(tkt.created_at * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-[#22D3A7] font-medium">
                  Recommended Action: {tkt.recommended_action}
                </div>
                <div className="text-[11px] text-[#9BA8B7]">
                  Predicted failure horizon: ~{Math.round(tkt.predicted_failure_window_sec)} seconds from alert trigger.
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Advisory, AdvisoryType, AdvisoryStatus } from '../types';
import {
  CheckCircle2, XCircle, AlertTriangle, GitBranch,
  CornerDownRight, Gauge, ChevronDown, ChevronUp, History, ShieldAlert
} from 'lucide-react';

interface AdvisoryQueueProps {
  advisories: Advisory[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const AdvisoryQueue: React.FC<AdvisoryQueueProps> = ({
  advisories,
  onApprove,
  onReject,
}) => {
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  const toggleReasoning = (id: string) => {
    setExpandedReasoning(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const pendingAdvisories = advisories.filter(a => a.status === 'PENDING');
  const decidedAdvisories = advisories.filter(a => a.status !== 'PENDING');

  const getTypeBadge = (type: AdvisoryType) => {
    switch (type) {
      case 'REROUTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#22D3A7]/15 text-[#22D3A7] border border-[#22D3A7]/30">
            <GitBranch className="w-3.5 h-3.5" />
            REROUTE ADVISORY
          </span>
        );
      case 'LOOP_HOLD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#4F9CF9]/15 text-[#4F9CF9] border border-[#4F9CF9]/30">
            <CornerDownRight className="w-3.5 h-3.5" />
            LOOP-LINE HOLD
          </span>
        );
      case 'SPEED_PROFILE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F2C94C]/15 text-[#F2C94C] border border-[#F2C94C]/30">
            <Gauge className="w-3.5 h-3.5" />
            SPEED PROFILE SMOOTHING
          </span>
        );
      case 'NO_OPTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            NO AUTO OPTION — MANUAL ESCALATION
          </span>
        );
    }
  };

  return (
    <div
      className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex flex-col h-full overflow-hidden"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2A3542]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22D3A7]" />
          <h2 className="text-sm font-semibold text-[#E6EDF3] tracking-wide uppercase">
            Advisory Queue
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#22D3A7]/20 text-[#22D3A7] border border-[#22D3A7]/30 tabular-nums">
            {pendingAdvisories.length} Pending
          </span>
        </div>
        <div className="text-[11px] text-[#9BA8B7]">
          Human Controller Authorization Required
        </div>
      </div>

      {/* Advisory Cards List */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-3">
        {pendingAdvisories.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed border-[#2A3542] text-[#9BA8B7]">
            <CheckCircle2 className="w-8 h-8 text-[#22D3A7] mb-2 opacity-70" />
            <p className="text-sm font-medium text-[#E6EDF3]">Corridor Running Nominally</p>
            <p className="text-xs text-[#9BA8B7] mt-1">
              No pending block planning interventions. Live asset trends normal.
            </p>
          </div>
        ) : (
          pendingAdvisories.map((advisory) => {
            const isExpanded = expandedReasoning[advisory.id] ?? true;

            return (
              <div
                key={advisory.id}
                className="bg-[#1C242E] border-2 border-[#2A3542] rounded-xl p-4 shadow-md hover:border-[#3B4858] transition-all"
              >
                {/* Card Top: Type Badge & Train Info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {getTypeBadge(advisory.type)}
                    <div className="mt-2 text-base font-bold text-[#E6EDF3]">
                      Train {advisory.train_id}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#9BA8B7] bg-[#141A22] px-2 py-1 rounded border border-[#2A3542]">
                    {advisory.id}
                  </span>
                </div>

                {/* Payload Highlights */}
                <div className="mt-3 p-2.5 rounded-lg bg-[#141A22] border border-[#2A3542] text-xs space-y-1.5">
                  {advisory.type === 'REROUTE' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#9BA8B7]">Detour Corridor:</span>
                        <span className="font-semibold text-[#22D3A7]">{advisory.payload.via_station}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA8B7]">Added Distance:</span>
                        <span className="font-medium text-[#E6EDF3]">+{advisory.payload.added_distance_km} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA8B7]">Estimated Added Delay:</span>
                        <span className="font-medium text-[#E6EDF3]">+{advisory.payload.added_eta_min} min</span>
                      </div>
                    </>
                  )}

                  {advisory.type === 'LOOP_HOLD' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#9BA8B7]">Assigned Siding:</span>
                        <span className="font-semibold text-[#4F9CF9]">{advisory.payload.loop_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA8B7]">Hold Duration:</span>
                        <span className="font-medium text-[#E6EDF3]">{advisory.payload.hold_duration_min} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA8B7]">Yielding To:</span>
                        <span className="font-medium text-[#9BA8B7]">{advisory.payload.yield_to}</span>
                      </div>
                    </>
                  )}

                  {advisory.type === 'SPEED_PROFILE' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#9BA8B7]">Smoothed Glide Speed:</span>
                        <span className="font-semibold text-[#22D3A7]">
                          {advisory.payload.current_speed_kmph} → {advisory.payload.recommended_glide_speed_kmph} km/h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA8B7]">Avoided Dead-Stop Energy:</span>
                        <span className="font-bold text-[#F2C94C]">
                          {advisory.payload.energy_saved_kwh} kWh <span className="font-normal text-[10px] text-[#9BA8B7]">(illustrative estimate)</span>
                        </span>
                      </div>
                    </>
                  )}

                  {advisory.type === 'NO_OPTION' && (
                    <div className="space-y-1">
                      <div className="text-[#EF4444] font-semibold">
                        ⚠️ Automatic Cascade Exhausted
                      </div>
                      <div className="text-[11px] text-[#9BA8B7]">
                        {advisory.payload.conflict_reason}
                      </div>
                      <div className="text-[11px] text-[#E6EDF3] font-medium pt-1">
                        👉 {advisory.payload.required_action}
                      </div>
                    </div>
                  )}
                </div>

                {/* Collapsible Reasoning Trace */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleReasoning(advisory.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-[#9BA8B7] hover:text-[#E6EDF3] py-1 border-t border-[#2A3542]"
                    aria-expanded={isExpanded}
                  >
                    <span>Decision Reasoning Trace ({advisory.reasoning.length} steps)</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <ol className="mt-2 space-y-1 text-[11px] text-[#9BA8B7] bg-[#141A22]/60 p-2 rounded border border-[#2A3542]/60 list-none">
                      {advisory.reasoning.map((step, idx) => (
                        <li key={idx} className="leading-relaxed flex items-start gap-1.5">
                          <span className="text-[#22D3A7] font-mono select-none">›</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Action Buttons: Large 44px+ hit targets */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onApprove(advisory.id)}
                    className="min-h-[44px] px-4 py-2.5 rounded-lg bg-[#22D3A7] hover:bg-[#1eb992] text-[#0B0F14] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
                    aria-label={`Approve advisory ${advisory.id} for Train ${advisory.train_id}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Advisory
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(advisory.id)}
                    className="min-h-[44px] px-4 py-2.5 rounded-lg bg-transparent hover:bg-[#2A3542] text-[#E6EDF3] border border-[#2A3542] font-semibold text-xs flex items-center justify-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#22D3A7]"
                    aria-label={`Reject advisory ${advisory.id} for Train ${advisory.train_id}`}
                  >
                    <XCircle className="w-4 h-4 text-[#EF4444]" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Decided History Section */}
        {decidedAdvisories.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#2A3542]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9BA8B7] uppercase tracking-wider mb-2">
              <History className="w-3.5 h-3.5" />
              Decided Advisories History
            </div>
            <div className="space-y-2">
              {decidedAdvisories.slice(0, 5).map((adv) => (
                <div
                  key={adv.id}
                  className="p-2.5 rounded-lg bg-[#141A22] border border-[#2A3542] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${
                          adv.status === 'APPROVED' ? 'text-[#22D3A7]' : 'text-[#EF4444]'
                        }`}
                      >
                        [{adv.status}]
                      </span>
                      <span className="font-semibold text-[#E6EDF3]">
                        Train {adv.train_id} • {adv.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9BA8B7] mt-0.5">
                      {adv.approved_by || 'Human Controller'}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#9BA8B7]">
                    {adv.decided_at ? new Date(adv.decided_at * 1000).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


import React from 'react';
import { Station, Block, LoopLine, Train, HealthStatus } from '../types';

interface NetworkMapProps {
  stations: Record<string, Station>;
  blocks: Record<string, Block>;
  loopLines: Record<string, LoopLine>;
  trains: Record<string, Train>;
  isRerouteActive?: boolean;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  stations,
  blocks,
  loopLines,
  trains,
  isRerouteActive = false,
}) => {
  // Helper to get coordinates of a station
  const getStationPos = (code: string) => {
    return stations[code] || { x: 100, y: 100 };
  };

  // Helper to compute train position along its current block line
  const getTrainCoordinates = (train: Train) => {
    if (train.current_block === 'LOOP-DHN') {
      const dhn = getStationPos('DHN');
      return { x: dhn.x + 20, y: dhn.y - 45 };
    }
    if (train.current_block === 'LOOP-GTL') {
      const gtl = getStationPos('GTL');
      return { x: gtl.x + 20, y: gtl.y - 45 };
    }

    const block = blocks[train.current_block];
    if (!block) return { x: 100, y: 100 };

    const from = getStationPos(block.from_station);
    const to = getStationPos(block.to_station);

    const progress = Math.min(1.0, Math.max(0.0, train.position_km / (block.length_km || 1.0)));
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;
    return { x, y };
  };

  // Block status color mapping
  const getBlockStroke = (block: Block) => {
    switch (block?.status) {
      case 'CRITICAL':
        return '#EF4444';
      case 'WARNING':
        return '#F2994A';
      case 'WATCH':
        return '#F2C94C';
      default:
        return block?.is_alternate ? '#3A4858' : '#22D3A7';
    }
  };

  const getBlockClassName = (block: Block) => {
    if (block?.status === 'CRITICAL') return 'animate-block-critical';
    if (block?.status === 'WARNING') return 'transition-all duration-300';
    return '';
  };

  return (
    <div className="bg-[#141A22] border border-[#2A3542] rounded-xl p-4 shadow-sm flex flex-col h-full">
      {/* Map Header & Legend */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#2A3542] gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22D3A7] animate-pulse" />
          <h2 className="text-sm font-semibold text-[#E6EDF3] tracking-wide uppercase">
            Live Railway Section Schematic (GTL Division)
          </h2>
          <span className="text-xs text-[#9BA8B7] hidden sm:inline">
            • Real-time Block Interlocking Map
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9BA8B7]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#22D3A7] rounded-full inline-block" />
            <span>Normal Main Line</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#3A4858] border-dashed border-t border-[#9BA8B7] inline-block" />
            <span>Alternate Chord</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F2994A] inline-block" />
            <span>Warning (TSR)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-ping inline-block" />
            <span>Critical Fault</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22D3A7] ring-2 ring-[#22D3A7]/40 inline-block" />
            <span>Active Train</span>
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div className="flex-1 relative mt-2 min-h-[360px] flex items-center justify-center overflow-x-auto">
        <svg
          viewBox="0 0 960 380"
          className="w-full h-full min-w-[720px] max-h-[440px] select-none"
          role="img"
          aria-label="Railway track section diagram with live train positions and health state"
        >
          {/* Subtle Grid Pattern Background */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1C242E" strokeWidth="0.8" />
            </pattern>
            {/* Glow filters */}
            <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22D3A7" floodOpacity="0.6" />
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#EF4444" floodOpacity="0.8" />
            </filter>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* ================= TRACKS & BLOCKS ================= */}

          {/* Main Line Tracks */}
          {/* B1: KRN -> GTL */}
          <g>
            <line
              x1={getStationPos('KRN').x}
              y1={getStationPos('KRN').y}
              x2={getStationPos('GTL').x}
              y2={getStationPos('GTL').y}
              stroke={getBlockStroke(blocks['B1'])}
              strokeWidth="4"
              strokeLinecap="round"
              className={getBlockClassName(blocks['B1'])}
            />
            <text
              x={(getStationPos('KRN').x + getStationPos('GTL').x) / 2}
              y={getStationPos('KRN').y - 12}
              fill="#9BA8B7"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
            >
              Block B1 (50 km • 110 km/h)
            </text>
          </g>

          {/* B2: GTL -> DHN */}
          <g>
            <line
              x1={getStationPos('GTL').x}
              y1={getStationPos('GTL').y}
              x2={getStationPos('DHN').x}
              y2={getStationPos('DHN').y}
              stroke={getBlockStroke(blocks['B2'])}
              strokeWidth={blocks['B2']?.status === 'CRITICAL' ? '6' : '4'}
              strokeLinecap="round"
              className={getBlockClassName(blocks['B2'])}
              filter={blocks['B2']?.status === 'CRITICAL' ? 'url(#glow-red)' : undefined}
            />
            <text
              x={(getStationPos('GTL').x + getStationPos('DHN').x) / 2}
              y={getStationPos('GTL').y - 12}
              fill={blocks['B2']?.status === 'CRITICAL' ? '#EF4444' : blocks['B2']?.status === 'WARNING' ? '#F2994A' : '#9BA8B7'}
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
            >
              Block B2 {blocks['B2']?.status === 'CRITICAL' ? '⚠️ [CRITICAL DEGRADATION]' : blocks['B2']?.status === 'WARNING' ? '⚠️ [TSR 45 km/h]' : '(45 km • 110 km/h)'}
            </text>
          </g>

          {/* B3: DHN -> TPT */}
          <g>
            <line
              x1={getStationPos('DHN').x}
              y1={getStationPos('DHN').y}
              x2={getStationPos('TPT').x}
              y2={getStationPos('TPT').y}
              stroke={getBlockStroke(blocks['B3'])}
              strokeWidth="4"
              strokeLinecap="round"
              className={getBlockClassName(blocks['B3'])}
            />
            <text
              x={(getStationPos('DHN').x + getStationPos('TPT').x) / 2}
              y={getStationPos('DHN').y - 12}
              fill="#9BA8B7"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
            >
              Block B3 Main Line (180 km • 120 km/h)
            </text>
          </g>

          {/* Alternate Route Tracks (DHN -> NDL -> RJP -> TPT) */}
          {/* A1: DHN -> NDL */}
          <line
            x1={getStationPos('DHN').x}
            y1={getStationPos('DHN').y}
            x2={getStationPos('NDL').x}
            y2={getStationPos('NDL').y}
            stroke={isRerouteActive ? '#22D3A7' : '#3B4858'}
            strokeWidth="3.5"
            strokeDasharray={isRerouteActive ? undefined : '5,5'}
            className={isRerouteActive ? 'animate-reroute-path' : ''}
            filter={isRerouteActive ? 'url(#glow-green)' : undefined}
          />
          <text
            x={(getStationPos('DHN').x + getStationPos('NDL').x) / 2 - 20}
            y={(getStationPos('DHN').y + getStationPos('NDL').y) / 2 + 14}
            fill={isRerouteActive ? '#22D3A7' : '#6B7A8B'}
            fontSize="9.5"
            fontWeight="500"
          >
            A1 Chord (75 km)
          </text>

          {/* A2: NDL -> RJP */}
          <line
            x1={getStationPos('NDL').x}
            y1={getStationPos('NDL').y}
            x2={getStationPos('RJP').x}
            y2={getStationPos('RJP').y}
            stroke={isRerouteActive ? '#22D3A7' : '#3B4858'}
            strokeWidth="3.5"
            strokeDasharray={isRerouteActive ? undefined : '5,5'}
            className={isRerouteActive ? 'animate-reroute-path' : ''}
            filter={isRerouteActive ? 'url(#glow-green)' : undefined}
          />
          <text
            x={(getStationPos('NDL').x + getStationPos('RJP').x) / 2}
            y={getStationPos('NDL').y + 18}
            fill={isRerouteActive ? '#22D3A7' : '#6B7A8B'}
            fontSize="9.5"
            fontWeight="500"
            textAnchor="middle"
          >
            A2 Alternate Corridor (110 km • 75 km/h)
          </text>

          {/* A3: RJP -> TPT */}
          <line
            x1={getStationPos('RJP').x}
            y1={getStationPos('RJP').y}
            x2={getStationPos('TPT').x}
            y2={getStationPos('TPT').y}
            stroke={isRerouteActive ? '#22D3A7' : '#3B4858'}
            strokeWidth="3.5"
            strokeDasharray={isRerouteActive ? undefined : '5,5'}
            className={isRerouteActive ? 'animate-reroute-path' : ''}
            filter={isRerouteActive ? 'url(#glow-green)' : undefined}
          />
          <text
            x={(getStationPos('RJP').x + getStationPos('TPT').x) / 2 + 15}
            y={(getStationPos('RJP').y + getStationPos('TPT').y) / 2 + 14}
            fill={isRerouteActive ? '#22D3A7' : '#6B7A8B'}
            fontSize="9.5"
            fontWeight="500"
          >
            A3 (45 km)
          </text>

          {/* ================= LOOP LINES (SIDINGS) ================= */}

          {/* LOOP-GTL at Guntakal */}
          <g>
            <path
              d={`M ${getStationPos('GTL').x - 30} ${getStationPos('GTL').y} 
                  L ${getStationPos('GTL').x - 15} ${getStationPos('GTL').y - 35} 
                  L ${getStationPos('GTL').x + 45} ${getStationPos('GTL').y - 35} 
                  L ${getStationPos('GTL').x + 60} ${getStationPos('GTL').y}`}
              fill="none"
              stroke="#4F9CF9"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <rect
              x={getStationPos('GTL').x - 10}
              y={getStationPos('GTL').y - 48}
              width="62"
              height="16"
              rx="4"
              fill="#1C242E"
              stroke="#4F9CF9"
              strokeWidth="1"
            />
            <text
              x={getStationPos('GTL').x + 21}
              y={getStationPos('GTL').y - 37}
              fill="#4F9CF9"
              fontSize="9"
              fontWeight="600"
              textAnchor="middle"
            >
              LOOP-GTL [FREE]
            </text>
          </g>

          {/* LOOP-DHN at Dhone */}
          <g>
            <path
              d={`M ${getStationPos('DHN').x - 30} ${getStationPos('DHN').y} 
                  L ${getStationPos('DHN').x - 15} ${getStationPos('DHN').y - 35} 
                  L ${getStationPos('DHN').x + 55} ${getStationPos('DHN').y - 35} 
                  L ${getStationPos('DHN').x + 70} ${getStationPos('DHN').y}`}
              fill="none"
              stroke={loopLines['LOOP-DHN']?.occupied ? '#F2994A' : '#22D3A7'}
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <rect
              x={getStationPos('DHN').x - 15}
              y={getStationPos('DHN').y - 50}
              width="86"
              height="18"
              rx="4"
              fill="#1C242E"
              stroke={loopLines['LOOP-DHN']?.occupied ? '#F2994A' : '#22D3A7'}
              strokeWidth="1.2"
            />
            <text
              x={getStationPos('DHN').x + 28}
              y={getStationPos('DHN').y - 37}
              fill={loopLines['LOOP-DHN']?.occupied ? '#F2994A' : '#22D3A7'}
              fontSize="9"
              fontWeight="600"
              textAnchor="middle"
            >
              {loopLines['LOOP-DHN']?.occupied ? 'LOOP-DHN [OCCUPIED]' : 'LOOP-DHN [FREE]'}
            </text>
          </g>

          {/* ================= STATIONS ================= */}
          {Object.values(stations).map((stn) => (
            <g key={stn.code} className="cursor-pointer">
              {/* Station Outer Ring */}
              <circle
                cx={stn.x}
                cy={stn.y}
                r="9"
                fill="#141A22"
                stroke="#E6EDF3"
                strokeWidth="2.5"
              />
              {/* Station Inner Core */}
              <circle
                cx={stn.x}
                cy={stn.y}
                r="4.5"
                fill="#22D3A7"
              />
              {/* Station Label Box */}
              <rect
                x={stn.x - 30}
                y={stn.y + 14}
                width="60"
                height="22"
                rx="4"
                fill="#1C242E"
                stroke="#2A3542"
                strokeWidth="1"
              />
              <text
                x={stn.x}
                y={stn.y + 26}
                fill="#E6EDF3"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                letterSpacing="0.5"
              >
                {stn.code}
              </text>
              <text
                x={stn.x}
                y={stn.y + 34}
                fill="#9BA8B7"
                fontSize="7.5"
                textAnchor="middle"
              >
                {stn.name.replace(' Junction', ' Jn').replace(' City', '')}
              </text>
            </g>
          ))}

          {/* ================= TRAINS ================= */}
          {Object.values(trains).map((train) => {
            const pos = getTrainCoordinates(train);
            const isFollower = train.id === '12786';
            const isFreight = train.type === 'FREIGHT';

            return (
              <g key={train.id} className="transition-transform duration-700 ease-out">
                {/* Train Ping Aura */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="14"
                  fill={train.color}
                  fillOpacity="0.2"
                  className={train.speed_kmph > 0 ? 'animate-ping' : ''}
                  style={{ animationDuration: '3s' }}
                />
                {/* Train Vehicle Marker */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="7.5"
                  fill="#0B0F14"
                  stroke={train.color}
                  strokeWidth="2.5"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="3.5"
                  fill={train.color}
                />

                {/* Train Info Badge */}
                <g transform={`translate(${pos.x - 45}, ${pos.y - 36})`}>
                  <rect
                    width="90"
                    height="20"
                    rx="4"
                    fill="#0B0F14"
                    fillOpacity="0.92"
                    stroke={train.color}
                    strokeWidth="1.2"
                  />
                  <text
                    x="45"
                    y="13"
                    fill="#E6EDF3"
                    fontSize="9"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    🚂 {train.id} • {Math.round(train.speed_kmph)} km/h
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};


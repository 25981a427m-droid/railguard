import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const FooterBanner: React.FC = () => {
  return (
    <footer className="bg-[#0B0F14] border-t border-[#2A3542] px-4 py-2.5 text-center text-xs text-[#9BA8B7] select-none flex items-center justify-center gap-2">
      <ShieldAlert className="w-4 h-4 text-[#F2C94C] shrink-0" />
      <span>
        <strong className="text-[#E6EDF3]">MANDATORY HUMAN-IN-THE-LOOP SAFETY POLICY:</strong> Decision-support only. All actions require human controller approval and are executed through existing railway signalling systems.
      </span>
    </footer>
  );
};


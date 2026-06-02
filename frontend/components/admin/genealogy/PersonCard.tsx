'use client';

import { Person } from '@/lib/genealogy/types';
import { ROLE_LABELS } from '@/lib/genealogy/requirements';
import { User, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonCardProps {
  person: Person;
  status: 'complete' | 'partial' | 'missing';
  onClick?: () => void;
  selected?: boolean;
}

export default function PersonCard({ person, status, onClick, selected }: PersonCardProps) {
  const isMale = person.gender === 'male';
  
  // Custom classes and styles based on state
  const statusStyles = {
    complete: {
      border: 'border-[#008751]/30 hover:border-[#008751]',
      text: 'text-[#008751]',
      bgGlow: 'bg-[#008751]/5',
      icon: CheckCircle2,
      dotColor: 'bg-[#008751]'
    },
    partial: {
      border: 'border-[#FCD116]/30 hover:border-[#FCD116]',
      text: 'text-[#FCD116]',
      bgGlow: 'bg-[#FCD116]/5',
      icon: AlertTriangle,
      dotColor: 'bg-[#FCD116]'
    },
    missing: {
      border: 'border-[#E8112D]/20 hover:border-[#E8112D]/60',
      text: 'text-[#E8112D]/80',
      bgGlow: 'bg-[#E8112D]/2',
      icon: AlertCircle,
      dotColor: 'bg-[#E8112D]'
    }
  }[status];

  const StatusIcon = statusStyles.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col justify-between p-4 w-[190px] min-h-[110px] rounded-2xl cursor-pointer transition-all duration-300",
        "bg-[#0a0f18]/80 backdrop-blur-md border border-white/5",
        statusStyles.border,
        selected ? "ring-2 ring-[#FCD116]/50 shadow-[0_0_20px_rgba(252,209,22,0.15)] bg-white/[0.04]" : "hover:bg-white/[0.02]"
      )}
    >
      {/* Background soft glow indicator */}
      <div className={cn("absolute inset-0 rounded-2xl pointer-events-none -z-10 transition-opacity opacity-50 group-hover:opacity-100", statusStyles.bgGlow)} />

      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black tracking-widest text-gray-500 uppercase">
            {person.relation_role ? (ROLE_LABELS[person.relation_role] || person.relation_role) : 'Individu'}
          </p>
          <h4 className="text-[13px] font-black text-white truncate mt-1">
            {person.first_name || 'Sans prénom'}
          </h4>
          <h4 className="text-[13px] font-black text-white truncate -mt-0.5">
            {person.last_name || 'Sans nom'}
          </h4>
        </div>
        
        {/* Status dot with ambient glow */}
        <div className="flex-shrink-0 flex items-center justify-center mt-1">
          <span className={cn("w-2.5 h-2.5 rounded-full relative flex", statusStyles.dotColor)}>
            {status !== 'missing' && (
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusStyles.dotColor)} />
            )}
          </span>
        </div>
      </div>

      {/* Bottom Info Row */}
      <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2">
        <span className="text-[10px] font-semibold text-gray-400 font-mono">
          {person.birth_date ? new Date(person.birth_date).getFullYear() : '—'}
          {person.death_date ? ` - ${new Date(person.death_date).getFullYear()}` : ''}
        </span>
        
        <div className="flex items-center gap-1">
          <StatusIcon size={12} className={statusStyles.text} />
        </div>
      </div>
    </div>
  );
}

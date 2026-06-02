'use client';

import { Person } from '@/lib/genealogy/types';
import { ROLE_LABELS } from '@/lib/genealogy/requirements';
import { CheckCircle2, AlertTriangle, AlertCircle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonCardProps {
  person: Person;
  status: 'complete' | 'partial' | 'missing';
  onClick?: () => void;
  selected?: boolean;
}

export default function PersonCard({ person, status, onClick, selected }: PersonCardProps) {
  const isSelf = person.is_self || person.relation_role === 'self';

  const statusConfig = {
    complete: {
      border: 'border-[#008751]/40',
      ring: 'ring-[#008751]/40',
      text: 'text-[#008751]',
      icon: CheckCircle2,
      dotColor: 'bg-[#008751]',
    },
    partial: {
      border: 'border-[#FCD116]/40',
      ring: 'ring-[#FCD116]/40',
      text: 'text-[#FCD116]',
      icon: AlertTriangle,
      dotColor: 'bg-[#FCD116]',
    },
    missing: {
      border: 'border-[#E8112D]/20',
      ring: 'ring-[#E8112D]/20',
      text: 'text-[#E8112D]/80',
      icon: AlertCircle,
      dotColor: 'bg-[#E8112D]',
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  const initials =
    [(person.first_name || '')[0], (person.last_name || '')[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || '?';

  const genderAccent =
    person.gender === 'male'
      ? 'from-blue-500/20 to-blue-900/5'
      : person.gender === 'female'
        ? 'from-pink-500/20 to-pink-900/5'
        : 'from-gray-500/15 to-gray-700/5';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center w-[160px] min-h-[100px] rounded-2xl cursor-pointer transition-all duration-300 p-3',
        'bg-[#0a0f18]/90 backdrop-blur-md border',
        statusConfig.border,
        selected
          ? `ring-2 ${statusConfig.ring} shadow-lg shadow-white/5 bg-white/[0.06] scale-105`
          : 'hover:bg-white/[0.03] hover:scale-[1.02]'
      )}
    >
      {/* Gradient backdrop */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl bg-gradient-to-b pointer-events-none -z-10 opacity-60 transition-opacity group-hover:opacity-100',
          genderAccent
        )}
      />

      {/* Self crown badge */}
      {isSelf && (
        <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-[#FCD116]/20 border border-[#FCD116]/40 flex items-center justify-center z-20 shadow-[0_0_12px_rgba(252,209,22,0.3)]">
          <Crown size={10} className="text-[#FCD116]" />
        </div>
      )}

      {/* Avatar */}
      <div
        className={cn(
          'w-11 h-11 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all mb-2',
          person.gender === 'male'
            ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
            : person.gender === 'female'
              ? 'bg-pink-500/10 border-pink-500/25 text-pink-400'
              : 'bg-gray-500/10 border-gray-500/25 text-gray-400'
        )}
      >
        {initials}
      </div>

      {/* Name */}
      <div className="text-center min-w-0 w-full">
        <p className="text-[11px] font-black text-white truncate leading-tight">
          {person.first_name || 'Sans prénom'}
        </p>
        <p className="text-[11px] font-bold text-gray-300 truncate leading-tight -mt-0.5">
          {person.last_name || 'Sans nom'}
        </p>
      </div>

      {/* Role label */}
      <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest mt-1.5">
        {person.relation_role
          ? ROLE_LABELS[person.relation_role] || person.relation_role
          : 'Individu'}
      </span>

      {/* Status bar */}
      <div className="flex items-center justify-between w-full border-t border-white/5 pt-1.5 mt-1.5">
        <span className="text-[9px] font-semibold text-gray-500 font-mono">
          {person.birth_date ? new Date(person.birth_date).getFullYear() : '—'}
          {person.death_date ? ` – ${new Date(person.death_date).getFullYear()}` : ''}
        </span>
        <div className="flex items-center gap-1">
          <StatusIcon size={10} className={statusConfig.text} />
          <span className={cn('w-1.5 h-1.5 rounded-full relative', statusConfig.dotColor)}>
            {status === 'complete' && (
              <span
                className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-50',
                  statusConfig.dotColor
                )}
              />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
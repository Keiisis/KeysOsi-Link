'use client';

import { Person } from '@/lib/genealogy/types';
import { ROLE_LABELS } from '@/lib/genealogy/requirements';
import { CheckCircle2, AlertTriangle, AlertCircle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme/ThemeContext';

interface PersonCardProps {
  person: Person;
  status: 'complete' | 'partial' | 'missing';
  onClick?: () => void;
  selected?: boolean;
}

export default function PersonCard({ person, status, onClick, selected }: PersonCardProps) {
  const isSelf = person.is_self || person.relation_role === 'self';
  const isDeceased = !!person.death_date;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const statusConfig = {
    complete: {
      border: 'border-[#008751]/40',
      ring: 'ring-[#008751]/50',
      text: 'text-[#008751]',
      glow: 'shadow-[0_0_32px_-8px_rgba(0,135,81,0.6)]',
      dotColor: 'bg-[#008751]',
      icon: CheckCircle2,
      label: 'Complet',
    },
    partial: {
      border: 'border-[#FCD116]/35',
      ring: 'ring-[#FCD116]/50',
      text: 'text-[#FCD116]',
      glow: 'shadow-[0_0_32px_-8px_rgba(252,209,22,0.5)]',
      dotColor: 'bg-[#FCD116]',
      icon: AlertTriangle,
      label: 'Partiel',
    },
    missing: {
      border: 'border-[#E8112D]/20',
      ring: 'ring-[#E8112D]/30',
      text: 'text-[#E8112D]/80',
      glow: 'shadow-[0_0_32px_-10px_rgba(232,17,45,0.4)]',
      dotColor: 'bg-[#E8112D]',
      icon: AlertCircle,
      label: 'Incomplet',
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  const initials =
    [(person.first_name || '')[0], (person.last_name || '')[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || '?';

  // Gender-based theming
  const genderTheme =
    person.gender === 'male'
      ? {
        backdrop: 'from-blue-500/[0.10] to-transparent',
        avatar: 'bg-blue-500/10 border-blue-400/30 text-blue-300',
        avatarGrad: 'from-blue-500/30 to-blue-700/20',
        ringHover: 'group-hover:shadow-[0_0_20px_-4px_rgba(59,130,246,0.35)]',
      }
      : person.gender === 'female'
        ? {
          backdrop: 'from-pink-500/[0.10] to-transparent',
          avatar: 'bg-pink-500/10 border-pink-400/30 text-pink-300',
          avatarGrad: 'from-pink-500/30 to-pink-700/20',
          ringHover: 'group-hover:shadow-[0_0_20px_-4px_rgba(236,72,153,0.35)]',
        }
        : {
          backdrop: 'from-violet-500/[0.08] to-transparent',
          avatar: 'bg-violet-500/10 border-violet-400/30 text-violet-300',
          avatarGrad: 'from-violet-500/30 to-violet-700/20',
          ringHover: 'group-hover:shadow-[0_0_20px_-4px_rgba(139,92,246,0.35)]',
        };

  const years = `${person.birth_date ? new Date(person.birth_date).getFullYear() : '—'}${person.death_date ? ` – ${new Date(person.death_date).getFullYear()}` : ''
    }`;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex h-full w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl transition-all duration-300',
        'border backdrop-blur-lg px-3 py-2.5',
        statusConfig.border,
        isDeceased && 'opacity-75',
        selected
          ? cn('ring-2 scale-[1.04]', statusConfig.ring, statusConfig.glow)
          : cn('hover:scale-[1.03]', genderTheme.ringHover),
        isSelf && 'ring-1 ring-[#FCD116]/20'
      )}
      style={{
        background: isDark ? 'rgba(10,15,24,0.95)' : 'rgba(255,255,255,0.95)',
      }}
    >
      {/* Background gradient based on gender */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100',
          genderTheme.backdrop
        )}
      />

      {/* Top accent bar (tricolore subtil) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-2xl opacity-40"
        style={{ background: 'linear-gradient(90deg, transparent, #008751, #FCD116, #E8112D, transparent)' }}
      />

      {/* "Vous" badge for self */}
      {isSelf && (
        <div className="absolute -right-0.5 -top-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-[#FCD116]/50 bg-[#FCD116]/25 shadow-[0_0_12px_rgba(252,209,22,0.5)]">
          <Crown size={9} className="text-[#FCD116]" />
        </div>
      )}

      {/* Avatar - Left side */}
      <div
        className={cn(
          'shrink-0 flex h-12 w-12 items-center justify-center rounded-xl border-2 text-sm font-black transition-all duration-300 group-hover:scale-105 overflow-hidden',
          genderTheme.avatar
        )}
      >
        {person.avatar_url ? (
          <img
            src={person.avatar_url}
            alt={`${person.first_name || ''} ${person.last_name || ''}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs">{initials}</span>
        )}
      </div>

      {/* Info - Right side */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Name */}
        <p className="truncate text-[11px] font-black leading-tight text-[var(--panel-text-heading)] dark:text-white">
          {person.first_name || 'Sans prénom'}
        </p>
        <p className="truncate text-[10px] font-bold leading-tight text-[var(--panel-text-muted)] dark:text-gray-400">
          {person.last_name || 'Sans nom'}
        </p>

        {/* Role label */}
        <span className="mt-1 inline-block truncate text-[7px] font-black uppercase tracking-[0.16em] text-gray-600">
          {person.relation_role
            ? ROLE_LABELS[person.relation_role] || person.relation_role
            : 'Individu'}
        </span>

        {/* Bottom row: years + status */}
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-[8px] font-semibold text-gray-600">{years}</span>
          <div className="flex items-center gap-1">
            <StatusIcon size={9} className={statusConfig.text} />
            <span className={cn('relative flex h-1.5 w-1.5 rounded-full', statusConfig.dotColor)}>
              {status === 'complete' && (
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full animate-ping rounded-full opacity-50',
                    statusConfig.dotColor
                  )}
                />
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
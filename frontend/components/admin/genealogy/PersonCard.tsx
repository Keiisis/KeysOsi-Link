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
      ring: 'ring-[#008751]/50',
      text: 'text-[#008751]',
      glow: 'shadow-[0_0_24px_-8px_#008751]',
      dotColor: 'bg-[#008751]',
      icon: CheckCircle2,
      label: 'Complet',
    },
    partial: {
      border: 'border-[#FCD116]/40',
      ring: 'ring-[#FCD116]/50',
      text: 'text-[#FCD116]',
      glow: 'shadow-[0_0_24px_-8px_#FCD116]',
      dotColor: 'bg-[#FCD116]',
      icon: AlertTriangle,
      label: 'Partiel',
    },
    missing: {
      border: 'border-[#E8112D]/25',
      ring: 'ring-[#E8112D]/30',
      text: 'text-[#E8112D]/80',
      glow: 'shadow-[0_0_24px_-10px_#E8112D]',
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

  // Accents selon le genre
  const genderTheme =
    person.gender === 'male'
      ? {
        backdrop: 'from-blue-500/[0.12] to-transparent',
        avatar: 'bg-blue-500/10 border-blue-400/30 text-blue-300',
        ringHover: 'group-hover:shadow-[0_0_18px_-4px_rgba(59,130,246,0.4)]',
      }
      : person.gender === 'female'
        ? {
          backdrop: 'from-pink-500/[0.12] to-transparent',
          avatar: 'bg-pink-500/10 border-pink-400/30 text-pink-300',
          ringHover: 'group-hover:shadow-[0_0_18px_-4px_rgba(236,72,153,0.4)]',
        }
        : {
          backdrop: 'from-violet-500/[0.10] to-transparent',
          avatar: 'bg-violet-500/10 border-violet-400/30 text-violet-300',
          ringHover: 'group-hover:shadow-[0_0_18px_-4px_rgba(139,92,246,0.4)]',
        };

  const years = `${person.birth_date ? new Date(person.birth_date).getFullYear() : '—'}${person.death_date ? ` – ${new Date(person.death_date).getFullYear()}` : ''
    }`;

  return (
    <div
      onClick={onClick}
      className={cn(
        // ⬇️ s'emboîte pixel-perfect dans la grille (slot 168×108)
        'group relative flex h-full w-full cursor-pointer flex-col items-center overflow-hidden rounded-2xl p-3 transition-all duration-300',
        'border bg-[#0a0f18]/90 backdrop-blur-md',
        statusConfig.border,
        selected
          ? cn('ring-2 scale-[1.04] bg-white/[0.06]', statusConfig.ring, statusConfig.glow)
          : cn('hover:scale-[1.03] hover:bg-white/[0.035]', genderTheme.ringHover)
      )}
    >
      {/* Backdrop dégradé selon genre */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b opacity-70 transition-opacity duration-300 group-hover:opacity-100',
          genderTheme.backdrop
        )}
      />

      {/* Liseré supérieur tricolore subtil */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-2xl opacity-50"
        style={{ background: 'linear-gradient(90deg, transparent, #008751, #FCD116, #E8112D, transparent)' }}
      />

      {/* Badge "Vous" (couronne) */}
      {isSelf && (
        <div className="absolute -right-1 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#FCD116]/40 bg-[#FCD116]/20 shadow-[0_0_12px_rgba(252,209,22,0.4)]">
          <Crown size={10} className="text-[#FCD116]" />
        </div>
      )}

      {/* Avatar */}
      <div
        className={cn(
          'mb-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition-all duration-300 group-hover:scale-105 overflow-hidden',
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
          initials
        )}
      </div>

      {/* Nom */}
      <div className="w-full min-w-0 text-center">
        <p className="truncate text-[11px] font-black leading-tight text-white">
          {person.first_name || 'Sans prénom'}
        </p>
        <p className="-mt-0.5 truncate text-[11px] font-bold leading-tight text-gray-300">
          {person.last_name || 'Sans nom'}
        </p>
      </div>

      {/* Rôle */}
      <span className="mt-1 truncate text-[8px] font-mono font-bold uppercase tracking-[0.18em] text-gray-500">
        {person.relation_role
          ? ROLE_LABELS[person.relation_role] || person.relation_role
          : 'Individu'}
      </span>

      {/* Barre de statut */}
      <div className="mt-auto flex w-full items-center justify-between border-t border-white/5 pt-1.5">
        <span className="font-mono text-[9px] font-semibold text-gray-500">{years}</span>
        <div className="flex items-center gap-1">
          <StatusIcon size={10} className={statusConfig.text} />
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
  );
}
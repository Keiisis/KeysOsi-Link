'use client';

import { Person, DocumentItem } from '@/lib/genealogy/types';
import PersonCard from './PersonCard';
import { Plus, GitFork } from 'lucide-react';
import { cn } from '@/lib/utils';

const GENERATIONS: { title: string; roles: string[] }[] = [
  { 
    title: 'Arrière-Grands-Parents', 
    roles: ['paternal_ggf_1', 'paternal_ggm_1', 'maternal_ggf_1', 'maternal_ggm_1'] 
  },
  { 
    title: 'Grands-Parents', 
    roles: ['paternal_grandfather', 'paternal_grandmother', 'maternal_grandfather', 'maternal_grandmother'] 
  },
  { 
    title: 'Parents', 
    roles: ['father', 'mother'] 
  },
  { 
    title: 'Vous', 
    roles: ['self'] 
  },
];

function statusOf(person: Person, documents: DocumentItem[]): 'complete' | 'partial' | 'missing' {
  const docs = documents.filter(d => d.person_id === person.id);
  if (docs.length === 0) return 'missing';
  if (docs.length >= 2) return 'complete';
  return 'partial';
}

interface FamilyTreeProps {
  persons: Person[];
  documents: DocumentItem[];
  selectedPerson: Person | null;
  onSelect: (p: Person) => void;
  onAddRelative?: (role: string) => void;
}

export default function FamilyTree({
  persons,
  documents,
  selectedPerson,
  onSelect,
  onAddRelative,
}: FamilyTreeProps) {
  return (
    <div className="space-y-8 relative">
      {/* Visual background lineage lines */}
      <div className="absolute top-12 bottom-12 left-1/2 -translate-x-1/2 w-[1px] bg-gradient-to-b from-emerald-500/10 via-white/5 to-transparent pointer-events-none hidden lg:block" />
      
      {GENERATIONS.map((gen, gIdx) => (
        <div key={gen.title} className="relative space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#008751]" />
            <h4 className="text-xs font-black tracking-[0.2em] text-[#008751] uppercase font-heading">
              {gen.title}
            </h4>
            <div className="flex-1 h-[1px] bg-white/5" />
          </div>

          <div className="flex flex-wrap items-center gap-4 justify-start">
            {gen.roles.map((role) => {
              const p = persons.find(x => x.relation_role === role || (role === 'self' && x.is_self));
              
              if (!p) {
                return (
                  <button
                    key={role}
                    onClick={() => onAddRelative?.(role)}
                    className={cn(
                      "flex flex-col items-center justify-center w-[190px] min-h-[110px] rounded-2xl transition-all duration-300",
                      "border-2 border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-emerald-500/30 group text-gray-600 hover:text-white"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#008751]/10 group-hover:text-[#008751] transition-all mb-2">
                      <Plus size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-300">
                      Ajouter
                    </span>
                  </button>
                );
              }

              return (
                <PersonCard
                  key={p.id}
                  person={p}
                  status={statusOf(p, documents)}
                  selected={selectedPerson?.id === p.id}
                  onClick={() => onSelect(p)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

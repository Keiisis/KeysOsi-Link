'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RelationRole, Gender, Person } from '@/lib/genealogy/types';
import { ROLE_LABELS } from '@/lib/genealogy/requirements';
import { UserPlus, Save, UserCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonFormProps {
  treeId: string;
  onSaved?: () => void;
  presetRole?: string | null;
  selectedPerson?: Person | null;
  onCancelEdit?: () => void;
}

const IC = 'w-full bg-white/[0.03] border border-white/5 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-gray-600 transition-all';
const LC = 'text-[10px] font-black text-gray-500 mb-1.5 block uppercase tracking-widest';

export default function PersonForm({
  treeId,
  onSaved,
  presetRole,
  selectedPerson,
  onCancelEdit,
}: PersonFormProps) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    gender: 'male' as Gender,
    birth_date: '',
    birth_place: '',
    death_date: '',
    death_place: '',
    relation_role: 'father' as RelationRole,
    notes: '',
  });

  const [saving, setSaving] = useState(false);

  // Prefill when presetRole changes
  useEffect(() => {
    if (presetRole) {
      setForm(f => ({ ...f, relation_role: presetRole as RelationRole }));
    }
  }, [presetRole]);

  // Load selected person data for editing
  useEffect(() => {
    if (selectedPerson) {
      setForm({
        first_name: selectedPerson.first_name || '',
        last_name: selectedPerson.last_name || '',
        gender: (selectedPerson.gender as Gender) || 'male',
        birth_date: selectedPerson.birth_date || '',
        birth_place: selectedPerson.birth_place || '',
        death_date: selectedPerson.death_date || '',
        death_place: selectedPerson.death_place || '',
        relation_role: (selectedPerson.relation_role as RelationRole) || 'other',
        notes: selectedPerson.notes || '',
      });
    } else {
      setForm({
        first_name: '',
        last_name: '',
        gender: 'male',
        birth_date: '',
        birth_place: '',
        death_date: '',
        death_place: '',
        relation_role: (presetRole as RelationRole) || 'father',
        notes: '',
      });
    }
  }, [selectedPerson, presetRole]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const isEdit = !!selectedPerson;
      const payload = {
        tree_id: treeId,
        user_id: user.id,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        gender: form.gender,
        birth_date: form.birth_date || null,
        birth_place: form.birth_place || null,
        death_date: form.death_date || null,
        death_place: form.death_place || null,
        relation_role: form.relation_role,
        is_self: form.relation_role === 'self',
        notes: form.notes || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('persons')
          .update(payload)
          .eq('id', selectedPerson.id);
        if (error) throw error;
        alert('Membre mis à jour avec succès ✅');
      } else {
        const { error } = await supabase
          .from('persons')
          .insert(payload);
        if (error) throw error;
        alert('Membre ajouté avec succès ✅');
      }

      onSaved?.();
      
      // Reset form if creating a new member
      if (!isEdit) {
        setForm({
          first_name: '',
          last_name: '',
          gender: 'male',
          birth_date: '',
          birth_place: '',
          death_date: '',
          death_place: '',
          relation_role: 'father',
          notes: '',
        });
      }
    } catch (err: any) {
      alert('Erreur lors de la sauvegarde : ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const isEditing = !!selectedPerson;

  return (
    <div className="bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        {isEditing ? (
          <UserCheck size={16} className="text-[#FCD116]" />
        ) : (
          <UserPlus size={16} className="text-[#008751]" />
        )}
        <h3 className="text-sm font-black text-white uppercase tracking-widest font-heading">
          {isEditing ? 'Modifier la Fiche' : 'Nouveau Parent'}
        </h3>
      </div>

      {/* Grid Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LC}>Prénom</label>
          <input 
            type="text" 
            className={IC} 
            placeholder="Prénom" 
            value={form.first_name} 
            onChange={e => set('first_name', e.target.value)} 
          />
        </div>
        
        <div>
          <label className={LC}>Nom de famille</label>
          <input 
            type="text" 
            className={IC} 
            placeholder="Nom" 
            value={form.last_name} 
            onChange={e => set('last_name', e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LC}>Genre / Sexe</label>
          <select 
            className="w-full bg-[#0a0f14] border border-white/5 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-500/50"
            value={form.gender} 
            onChange={e => set('gender', e.target.value as Gender)}
          >
            <option value="male">Homme</option>
            <option value="female">Femme</option>
            <option value="other">Autre</option>
          </select>
        </div>

        <div>
          <label className={LC}>Rôle Généalogique</label>
          <select 
            className="w-full bg-[#0a0f14] border border-white/5 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-500/50"
            value={form.relation_role} 
            onChange={e => set('relation_role', e.target.value as RelationRole)}
          >
            {Object.entries(ROLE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates & Places */}
      <div className="border-t border-white/5 pt-3 space-y-3">
        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Naissance</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LC}>Date de naissance</label>
            <input 
              type="date" 
              className={IC} 
              value={form.birth_date} 
              onChange={e => set('birth_date', e.target.value)} 
            />
          </div>
          <div>
            <label className={LC}>Lieu de naissance</label>
            <input 
              type="text" 
              className={IC} 
              placeholder="Ex: Cotonou, Paris..." 
              value={form.birth_place} 
              onChange={e => set('birth_place', e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-3 space-y-3">
        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Décès (si applicable)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LC}>Date de décès</label>
            <input 
              type="date" 
              className={IC} 
              value={form.death_date} 
              onChange={e => set('death_date', e.target.value)} 
            />
          </div>
          <div>
            <label className={LC}>Lieu de décès</label>
            <input 
              type="text" 
              className={IC} 
              placeholder="Lieu de décès" 
              value={form.death_place} 
              onChange={e => set('death_place', e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div>
        <label className={LC}>Notes Historiques / Anecdotes</label>
        <textarea
          rows={2}
          className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-500/50 resize-none placeholder:text-gray-600"
          placeholder="Habitations, professions, mentions d'affranchissement..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold text-xs py-2.5 rounded-xl transition-all border border-white/5"
          >
            ANNULER
          </button>
        )}
        
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 font-black text-xs py-2.5 rounded-xl transition-all shadow-lg text-white",
            isEditing 
              ? "bg-[#FCD116]/10 hover:bg-[#FCD116]/20 border border-[#FCD116]/20 text-[#FCD116]" 
              : "bg-[#008751] hover:bg-[#00a36b]"
          )}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isEditing ? (
            <Save size={14} />
          ) : (
            <UserPlus size={14} />
          )}
          {saving ? 'SAUVEGARDE…' : isEditing ? 'ENREGISTRER' : 'AJOUTER LE PARENT'}
        </button>
      </div>
    </div>
  );
}

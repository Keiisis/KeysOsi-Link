'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RelationRole, Gender, Person } from '@/lib/genealogy/types';
import { ROLE_LABELS } from '@/lib/genealogy/requirements';
import {
  UserPlus, Save, UserCheck, Loader2, X, Calendar,
  MapPin, ScrollText, Mars, Venus, CircleUser, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonFormProps {
  treeId: string;
  persons: Person[];
  onSaved?: () => void;
  presetRole?: string | null;
  selectedPerson?: Person | null;
  onCancelEdit?: () => void;
}

/* ---------------------------------- styles ---------------------------------- */

const IC =
  'peer w-full bg-white/[0.02] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-3 text-white text-[13px] ' +
  'focus:outline-none focus:border-emerald-400/60 focus:bg-emerald-500/[0.04] ' +
  'focus:ring-2 focus:ring-emerald-400/10 placeholder:text-gray-600 transition-all duration-300';

const LC =
  'text-[10px] font-black text-gray-500 mb-1.5 ml-0.5 block uppercase tracking-[0.18em]';

const SEL =
  'w-full appearance-none bg-[#080d14] border border-white/[0.06] rounded-xl py-2.5 pl-3 pr-9 ' +
  'text-white text-[13px] focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10 ' +
  'transition-all duration-300 cursor-pointer';

/* --------------------------------- component -------------------------------- */

export default function PersonForm({
  treeId,
  persons,
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
    avatar_url: '',
  });

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (presetRole) {
      setForm((f) => ({ ...f, relation_role: presetRole as RelationRole }));
    }
  }, [presetRole]);

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
        avatar_url: selectedPerson.avatar_url || '',
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
        avatar_url: '',
      });
    }
  }, [selectedPerson, presetRole]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  function flash(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${treeId}/avatar_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('genealogia-avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('genealogia-avatars')
        .getPublicUrl(fileName);

      set('avatar_url', publicUrl);
      flash('Photo téléchargée avec succès ! 📸', true);
    } catch (err: any) {
      flash('Erreur photo : ' + err.message, false);
    } finally {
      setUploadingAvatar(false);
    }
  };

  function resolveParents(role: RelationRole): { father_id: string | null; mother_id: string | null } {
    const findId = (r: RelationRole) => persons.find(p => p.relation_role === r || (r === 'self' && p.is_self))?.id || null;
    
    switch (role) {
      case 'self':
        return { father_id: findId('father'), mother_id: findId('mother') };
      case 'father':
        return { father_id: findId('paternal_grandfather'), mother_id: findId('paternal_grandmother') };
      case 'mother':
        return { father_id: findId('maternal_grandfather'), mother_id: findId('maternal_grandmother') };
      case 'brother':
      case 'sister':
      case 'sibling':
        return { father_id: findId('father'), mother_id: findId('mother') };
      case 'paternal_uncle':
      case 'paternal_aunt':
        return { father_id: findId('paternal_grandfather'), mother_id: findId('paternal_grandmother') };
      case 'maternal_uncle':
      case 'maternal_aunt':
        return { father_id: findId('maternal_grandfather'), mother_id: findId('maternal_grandmother') };
      case 'child':
        const self = persons.find(p => p.is_self || p.relation_role === 'self');
        if (!self) return { father_id: null, mother_id: null };
        return self.gender === 'female' 
          ? { father_id: null, mother_id: self.id } 
          : { father_id: self.id, mother_id: null };
      default:
        return { father_id: null, mother_id: null };
    }
  }

  async function save() {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const isEdit = !!selectedPerson;
      const { father_id, mother_id } = resolveParents(form.relation_role);
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
        avatar_url: form.avatar_url || null,
        father_id,
        mother_id,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('persons')
          .update(payload)
          .eq('id', selectedPerson.id);
        if (error) throw error;
        flash('Membre mis à jour avec succès', true);
      } else {
        const { error } = await supabase.from('persons').insert(payload);
        if (error) throw error;
        flash('Membre ajouté à votre arbre', true);
      }

      onSaved?.();

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
          avatar_url: '',
        });
      }
    } catch (err: any) {
      flash('Erreur : ' + err.message, false);
    } finally {
      setSaving(false);
    }
  }

  const isEditing = !!selectedPerson;
  const initials =
    (form.first_name?.[0] || '') + (form.last_name?.[0] || '') || '?';

  const accent = isEditing ? '#FCD116' : '#008751';

  const genders: { v: Gender; label: string; icon: any }[] = [
    { v: 'male', label: 'Homme', icon: Mars },
    { v: 'female', label: 'Femme', icon: Venus },
    { v: 'other', label: 'Autre', icon: CircleUser },
  ];

  return (
    <div className="relative group">
      {/* Aura lumineuse derrière la carte */}
      <div
        className="absolute -inset-[1px] rounded-[2rem] opacity-60 blur-md transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background: `conic-gradient(from 180deg, ${accent}22, transparent 25%, #E80000_50%, transparent 75%, ${accent}22)`,
        }}
      />

      <div className="relative bg-[#070b12]/90 backdrop-blur-2xl border border-white/[0.07] rounded-[2rem] overflow-hidden">
        {/* Halo de couleur en haut */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-[80px] opacity-30"
          style={{ background: accent }}
        />
        {/* Texture grain subtile */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative p-6 space-y-5">
          {/* ---------------------------------- Header --------------------------------- */}
          <div className="flex items-center gap-4">
            {/* Avatar initiales */}
            <div 
              className="relative shrink-0 cursor-pointer group/avatar" 
              onClick={() => document.getElementById('avatar-input')?.click()}
              title="Cliquer pour téléverser une photo"
            >
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
              {uploadingAvatar ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                  <Loader2 size={16} className="animate-spin text-[#008751]" />
                </div>
              ) : form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt="Avatar"
                  className="h-14 w-14 rounded-2xl object-cover border border-white/10 shadow-lg ring-1 ring-white/10 group-hover/avatar:opacity-80 transition-opacity"
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg ring-1 ring-white/10 group-hover/avatar:opacity-80 transition-opacity"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}55)`,
                  }}
                >
                  {initials.toUpperCase()}
                </div>
              )}
              <span
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-[#070b12] ring-1 ring-white/10"
              >
                {isEditing ? (
                  <UserCheck size={13} className="text-[#FCD116]" />
                ) : (
                  <UserPlus size={13} className="text-[#008751]" />
                )}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                <Sparkles size={10} style={{ color: accent }} />
                {isEditing ? 'Édition' : 'Création'}
              </div>
              <h3 className="truncate text-base font-black text-white font-heading leading-tight">
                {form.first_name || form.last_name
                  ? `${form.first_name} ${form.last_name}`.trim()
                  : isEditing
                    ? 'Modifier la fiche'
                    : 'Nouveau parent'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {ROLE_LABELS[form.relation_role] ?? 'Membre de la lignée'}
              </p>
            </div>
          </div>

          {/* ------------------------------- Identité --------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className={LC}>Prénom</label>
              <div className="relative">
                <CircleUser
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 peer-focus:text-emerald-400"
                />
                <input
                  type="text"
                  className={IC}
                  placeholder="Prénom"
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <label className={LC}>Nom de famille</label>
              <div className="relative">
                <CircleUser
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 peer-focus:text-emerald-400"
                />
                <input
                  type="text"
                  className={IC}
                  placeholder="Nom"
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* --------------------------- Sélecteur de genre --------------------------- */}
          <div>
            <label className={LC}>Genre / Sexe</label>
            <div className="grid grid-cols-3 gap-2">
              {genders.map(({ v, label, icon: Icon }) => {
                const active = form.gender === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('gender', v)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-bold transition-all duration-300',
                      active
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-white shadow-[0_0_20px_-6px_#008751]'
                        : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/15 hover:text-gray-300'
                    )}
                  >
                    <Icon size={13} className={active ? 'text-emerald-400' : ''} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------------------------- Rôle généalogique --------------------------- */}
          <div>
            <label className={LC}>Rôle généalogique</label>
            <div className="relative">
              <select
                className={SEL}
                value={form.relation_role}
                onChange={(e) => set('relation_role', e.target.value as RelationRole)}
              >
                {Object.entries(ROLE_LABELS).map(([k, l]) => (
                  <option key={k} value={k} className="bg-[#080d14]">
                    {l}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* -------------------------------- Naissance ------------------------------- */}
          <fieldset className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-3.5 space-y-3">
            <legend className="flex items-center gap-1.5 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Naissance
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className={LC}>Date</label>
                <div className="relative">
                  <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 peer-focus:text-emerald-400" />
                  <input type="date" className={IC} value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
                </div>
              </div>
              <div className="relative">
                <label className={LC}>Lieu</label>
                <div className="relative">
                  <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 peer-focus:text-emerald-400" />
                  <input type="text" className={IC} placeholder="Cotonou, Paris…" value={form.birth_place} onChange={(e) => set('birth_place', e.target.value)} />
                </div>
              </div>
            </div>
          </fieldset>

          {/* ---------------------------------- Décès --------------------------------- */}
          <fieldset className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-3.5 space-y-3">
            <legend className="flex items-center gap-1.5 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
              Décès <span className="font-medium normal-case tracking-normal text-gray-600">(si applicable)</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className={LC}>Date</label>
                <div className="relative">
                  <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 peer-focus:text-emerald-400" />
                  <input type="date" className={IC} value={form.death_date} onChange={(e) => set('death_date', e.target.value)} />
                </div>
              </div>
              <div className="relative">
                <label className={LC}>Lieu</label>
                <div className="relative">
                  <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 peer-focus:text-emerald-400" />
                  <input type="text" className={IC} placeholder="Lieu de décès" value={form.death_place} onChange={(e) => set('death_place', e.target.value)} />
                </div>
              </div>
            </div>
          </fieldset>

          {/* ---------------------------------- Notes --------------------------------- */}
          <div>
            <label className={LC}>Notes historiques / Anecdotes</label>
            <div className="relative">
              <ScrollText size={14} className="pointer-events-none absolute left-3 top-3 text-gray-600" />
              <textarea
                rows={2}
                className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder:text-gray-600 transition-all duration-300 focus:border-emerald-400/60 focus:bg-emerald-500/[0.04] focus:outline-none focus:ring-2 focus:ring-emerald-400/10"
                placeholder="Habitations, professions, mentions d'affranchissement…"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </div>

          {/* -------------------------------- Actions --------------------------------- */}
          <div className="flex gap-2.5 pt-1">
            {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] py-3 text-xs font-bold text-gray-300 transition-all hover:bg-white/[0.07] hover:text-white"
              >
                <X size={14} /> ANNULER
              </button>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={cn(
                'relative flex flex-[2] items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white transition-all duration-300 disabled:opacity-70',
                isEditing
                  ? 'bg-gradient-to-r from-[#FCD116] to-[#f0b400] text-black shadow-[0_8px_24px_-8px_#FCD116]'
                  : 'bg-gradient-to-r from-[#008751] to-[#00b56e] shadow-[0_8px_24px_-8px_#008751]'
              )}
            >
              {/* reflet animé */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : isEditing ? (
                <Save size={15} />
              ) : (
                <UserPlus size={15} />
              )}
              {saving ? 'SAUVEGARDE…' : isEditing ? 'ENREGISTRER' : 'AJOUTER LE PARENT'}
            </button>
          </div>
        </div>

        {/* ---------------------------------- Toast --------------------------------- */}
        {toast && (
          <div
            className={cn(
              'absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold backdrop-blur-md animate-in fade-in slide-in-from-bottom-2',
              toast.ok
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                : 'bg-red-500/15 text-red-300 ring-1 ring-red-400/30'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', toast.ok ? 'bg-emerald-400' : 'bg-red-400')} />
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
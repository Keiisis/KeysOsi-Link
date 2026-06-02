'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Person, DocumentItem } from '@/lib/genealogy/types';
import { buildAllReports, detectInconsistencies, buildResearchHints } from '@/lib/genealogy/engine';
import FamilyTree from '@/components/admin/genealogy/FamilyTree';
import PersonForm from '@/components/admin/genealogy/PersonForm';
import DocumentUploader from '@/components/admin/genealogy/DocumentUploader';
import DossierProgress from '@/components/admin/genealogy/DossierProgress';
import SmartAlerts from '@/components/admin/genealogy/SmartAlerts';
import ResearchAssistant from '@/components/admin/genealogy/ResearchAssistant';
import { 
  GitFork, Activity, Clock, Zap, Loader2, 
  Trash2, User, Globe, FileText, HelpCircle, RefreshCw 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminGenealogyPage() {
  const [treeId, setTreeId] = useState<string | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [presetRole, setPresetRole] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTreeData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get or create the tree
      let { data: tree } = await supabase
        .from('trees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!tree) {
        const { data: created, error: createErr } = await supabase
          .from('trees')
          .insert({ user_id: user.id, name: 'Mon arbre principal' })
          .select()
          .single();
          
        if (createErr) throw createErr;
        tree = created;
      }
      setTreeId(tree!.id);

      // 2. Fetch persons and documents
      const [personsRes, docsRes] = await Promise.all([
        supabase.from('persons').select('*').eq('tree_id', tree!.id),
        supabase.from('genealogy_documents').select('*').eq('tree_id', tree!.id),
      ]);

      if (personsRes.error) throw personsRes.error;
      if (docsRes.error) throw docsRes.error;

      setPersons(personsRes.data || []);
      setDocuments(docsRes.data || []);
      
      // Update selected person reference if it was selected
      if (selectedPerson) {
        const updatedSelected = (personsRes.data || []).find(p => p.id === selectedPerson.id);
        setSelectedPerson(updatedSelected || null);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erreur lors du chargement des données : ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPerson]);

  useEffect(() => {
    loadTreeData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddRelative = (role?: string) => {
    setSelectedPerson(null);
    setPresetRole(role || null);
  };

  const handleSelectPerson = (person: Person) => {
    setPresetRole(null);
    setSelectedPerson(person);
  };

  const handleCancelEdit = () => {
    setSelectedPerson(null);
    setPresetRole(null);
  };

  const deletePerson = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment retirer ce parent de l\'arbre ?')) return;
    try {
      const { error } = await supabase.from('persons').delete().eq('id', id);
      if (error) throw error;
      
      alert('Parent retiré avec succès 🗑️');
      setSelectedPerson(null);
      loadTreeData(true);
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    }
  };

  const reports = buildAllReports(persons, documents);
  const inconsistencies = detectInconsistencies(persons);
  const hints = buildResearchHints(persons);

  const allAlerts = [
    ...reports.afro_descendance.alerts,
    ...reports.ancetre_esclavage.alerts,
    ...inconsistencies,
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#008751]" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      {/* Header Héro section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#FCD116]">
            <GitFork size={18} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Dashboard Généalogie</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white font-heading tracking-tight leading-none">
            ARBRE <span className="text-benin-gradient">INTELLIGENT</span>
          </h2>
          <p className="text-gray-500 max-w-xl font-medium text-sm">
            Reconstituez votre lignée ancestrale. Téléversez les justificatifs d&apos;état civil et laissez le moteur valider vos dossiers Afro-descendance & esclavage.
          </p>
        </div>

        <div className="flex items-center gap-6 bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Actualiser</span>
            <button
              onClick={() => loadTreeData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-white hover:text-[#FCD116] font-mono text-xs transition-colors"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin text-[#008751]" : "text-[#008751]"} />
              {refreshing ? 'Sync...' : 'Synchronisé'}
            </button>
          </div>
          <div className="w-[1px] h-10 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">MOTEUR</span>
            <div className="flex items-center gap-2 text-green-400 font-bold text-xs">
              <Zap size={12} fill="currentColor" />
              ANALYSE LIVE
            </div>
          </div>
        </div>
      </div>

      {/* Main 3 columns grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Dossier Progresses and Prioritized Alerts */}
        <div className="lg:col-span-3 space-y-4">
          <DossierProgress report={reports.afro_descendance} />
          <DossierProgress report={reports.ancetre_esclavage} />
          <SmartAlerts alerts={allAlerts} onAlertClick={handleAddRelative} />
        </div>

        {/* MIDDLE COLUMN: Interactive Generational Tree Canvas */}
        <div className="lg:col-span-5 bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div>
              <h3 className="text-base font-black text-white font-heading uppercase tracking-wide">
                Canevas Généalogique
              </h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                Cliquez pour éditer ou glisser des pièces
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full">
              {persons.length} MEMBRES ENREGISTRÉS
            </div>
          </div>

          {treeId && (
            <FamilyTree 
              persons={persons} 
              documents={documents} 
              selectedPerson={selectedPerson}
              onSelect={handleSelectPerson} 
              onAddRelative={handleAddRelative}
            />
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar Forms, Document Upload and Search Assistant */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Active Relative Profile Card */}
          {selectedPerson && treeId ? (
            <div className="bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] space-y-4 relative overflow-hidden animate-in slide-in-from-right duration-300">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full pointer-events-none flex items-center justify-center">
                <User size={36} className="text-white/10" />
              </div>
              
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <p className="text-[10px] font-bold text-[#FCD116] uppercase tracking-widest font-mono">
                    FICHE ACTIVE
                  </p>
                  <h3 className="text-base font-black text-white font-heading mt-1">
                    {selectedPerson.first_name || '—'} {selectedPerson.last_name || '—'}
                  </h3>
                </div>
                
                <button
                  onClick={() => deletePerson(selectedPerson.id)}
                  title="Retirer cette personne de l'arbre"
                  className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/10 hover:bg-red-500/20 transition-all shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Upload section for active relative */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Déposer une pièce justificative
                </p>
                <DocumentUploader 
                  treeId={treeId} 
                  personId={selectedPerson.id} 
                  onUploaded={() => loadTreeData(true)} 
                />
              </div>

              {/* Uploaded documents list */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Pièces Jointes Validées
                </p>
                
                {documents.filter(d => d.person_id === selectedPerson.id).length > 0 ? (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-premium pr-1">
                    {documents.filter(d => d.person_id === selectedPerson.id).map(d => (
                      <div 
                        key={d.id} 
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={12} className="text-[#008751] shrink-0" />
                          <a 
                            href={d.file_url ?? '#'} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[11px] font-bold text-gray-300 truncate hover:text-[#FCD116] hover:underline transition-all"
                          >
                            {d.title || 'Document'}
                          </a>
                        </div>
                        <span className="text-[8px] font-mono font-bold text-gray-600 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                          {d.doc_type}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-600 italic py-2">
                    Aucun document justificatif téléversé pour le moment.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Form for creation or edit */}
          {treeId && (
            <PersonForm 
              treeId={treeId} 
              onSaved={() => loadTreeData(true)} 
              presetRole={presetRole}
              selectedPerson={selectedPerson}
              onCancelEdit={handleCancelEdit}
            />
          )}

          {/* Archive registries helpful hints */}
          <ResearchAssistant hints={hints} />
        </div>
      </div>
    </div>
  );
}

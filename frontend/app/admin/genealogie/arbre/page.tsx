'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Person, DocumentItem, Tree } from '@/lib/genealogy/types';
import FamilyTree from '@/components/admin/genealogy/FamilyTree';
import PersonForm from '@/components/admin/genealogy/PersonForm';
import DocumentUploader from '@/components/admin/genealogy/DocumentUploader';
import { 
  ChevronLeft, ZoomIn, ZoomOut, Maximize2, Loader2, User, 
  Trash2, FileText, Upload, X, ShieldAlert, Sparkles 
} from 'lucide-react';

export default function DedicatedTreePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const treeId = searchParams.get('id');

  const [tree, setTree] = useState<Tree | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [presetRole, setPresetRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pan & Zoom States
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const viewRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!treeId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // Fetch Tree, Persons, and Documents
      const [treeRes, personsRes, docsRes] = await Promise.all([
        supabase.from('trees').select('*').eq('id', treeId).single(),
        supabase.from('persons').select('*').eq('tree_id', treeId),
        supabase.from('genealogy_documents').select('*').eq('tree_id', treeId)
      ]);

      if (treeRes.error) throw treeRes.error;
      if (personsRes.error) throw personsRes.error;
      if (docsRes.error) throw docsRes.error;

      setTree(treeRes.data);
      setPersons(personsRes.data || []);
      setDocuments(docsRes.data || []);

      // Keep active person reference updated
      if (selectedPerson) {
        const fresh = (personsRes.data || []).find(p => p.id === selectedPerson.id);
        setSelectedPerson(fresh || null);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erreur chargement arbre : ' + err.message);
      router.push('/admin/genealogie');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [treeId, selectedPerson, router]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId]);

  // Drag and Pan calculations
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent panning when clicking buttons or cards
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.group')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom adjustments
  const handleZoomIn = () => setZoom(z => Math.min(1.8, z + 0.1));
  const handleZoomOut = () => setZoom(z => Math.max(0.4, z - 0.1));
  const handleResetZoom = () => {
    setZoom(0.9);
    setPan({ x: 0, y: 0 });
  };

  const handleSelectPerson = (person: Person) => {
    setPresetRole(null);
    setSelectedPerson(person);
  };

  const handleAddRelative = (role: string) => {
    setSelectedPerson(null);
    setPresetRole(role);
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
      loadData(true);
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03060d] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#008751]" size={36} />
      </div>
    );
  }

  const clientName = tree?.client_first_name 
    ? `${tree.client_first_name} ${tree.client_last_name}` 
    : 'Client';

  return (
    <div className="relative min-h-screen h-screen flex flex-col bg-[#03060d] text-white overflow-hidden select-none">
      
      {/* 1. Header Navigation Bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#070b13] relative z-40 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/genealogie')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-300 hover:text-white shrink-0"
            title="Retour au Dashboard"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="h-6 w-[1px] bg-white/10" />

          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-white">
              Arbre de <span className="text-benin-gradient">{clientName}</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-mono">
              {tree?.name} • {persons.length} MEMBRES
            </p>
          </div>
        </div>

        {/* Floating Tool Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-300 hover:text-white"
            title="Zoom arrière"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-[11px] font-mono font-bold text-gray-400 min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-300 hover:text-white"
            title="Zoom avant"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-300 hover:text-white"
            title="Réinitialiser"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      {/* 2. Interactive Panning Canvas Container */}
      <div 
        ref={viewRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative overflow-hidden bg-[#040810] cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      >
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Tree wrapper transformed by zoom and pan state */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
        >
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
      </div>

      {/* 3. Slider detail drawer (appears if a card is selected or presetRole is active) */}
      {(selectedPerson || presetRole) && tree && (
        <div className="absolute top-16 right-0 bottom-0 w-[420px] bg-[#070b13]/95 border-l border-white/5 shadow-[20px_0_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300 scrollbar-premium">
          <div className="p-6 space-y-6">
            
            {/* Header of Drawer */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  {selectedPerson ? 'Éditer le membre' : 'Ajouter un membre'}
                </p>
                <h3 className="text-base font-black text-white">
                  {selectedPerson 
                    ? `${selectedPerson.first_name || ''} ${selectedPerson.last_name || ''}`
                    : 'Création de Parenté'
                  }
                </h3>
              </div>
              <button
                onClick={handleCancelEdit}
                className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Document upload inside details */}
            {selectedPerson && (
              <div className="space-y-4 border-b border-white/5 pb-5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Upload size={12} className="text-emerald-400" /> Documents état civil
                  </h4>
                  {selectedPerson.id && (
                    <button
                      onClick={() => deletePerson(selectedPerson.id)}
                      className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Trash2 size={11} /> Supprimer membre
                    </button>
                  )}
                </div>

                <DocumentUploader
                  treeId={tree.id}
                  personId={selectedPerson.id}
                  onUploaded={() => loadData(true)}
                />

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {documents.filter(d => d.person_id === selectedPerson.id).map(d => (
                    <div 
                      key={d.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={12} className="text-[#008751] shrink-0" />
                        <a 
                          href={d.file_url ?? '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] font-bold text-gray-300 truncate hover:text-[#FCD116] transition-all"
                        >
                          {d.title || 'Fichier'}
                        </a>
                      </div>
                      <span className="text-[8px] font-mono font-bold text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                        {d.doc_type}
                      </span>
                    </div>
                  ))}
                  
                  {documents.filter(d => d.person_id === selectedPerson.id).length === 0 && (
                    <p className="text-[10px] text-gray-600 italic">Aucune pièce justificative.</p>
                  )}
                </div>
              </div>
            )}

            {/* Profile editing form */}
            <div className="pt-2">
              <PersonForm
                treeId={tree.id}
                persons={persons}
                onSaved={() => loadData(true)}
                presetRole={presetRole}
                selectedPerson={selectedPerson}
                onCancelEdit={handleCancelEdit}
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

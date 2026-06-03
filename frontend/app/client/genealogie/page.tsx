'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Person, DocumentItem, Tree } from '@/lib/genealogy/types';
import FamilyTree from '@/components/admin/genealogy/FamilyTree';
import { 
  GitFork, ZoomIn, ZoomOut, Maximize2, Loader2, User, 
  FileText, X, ShieldCheck 
} from 'lucide-react';

export default function ClientGenealogyPage() {
  const [tree, setTree] = useState<Tree | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const [loading, setLoading] = useState(true);

  // Pan & Zoom States
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const viewRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's assigned tree
      const { data: treeData, error: treeErr } = await supabase
        .from('trees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (treeErr) throw treeErr;

      if (!treeData) {
        setTree(null);
        setLoading(false);
        return;
      }

      setTree(treeData);

      // Fetch persons and documents
      const [personsRes, docsRes] = await Promise.all([
        supabase.from('persons').select('*').eq('tree_id', treeData.id),
        supabase.from('genealogy_documents').select('*').eq('tree_id', treeData.id)
      ]);

      if (personsRes.error) throw personsRes.error;
      if (docsRes.error) throw docsRes.error;

      setPersons(personsRes.data || []);
      setDocuments(docsRes.data || []);
    } catch (err: any) {
      console.error(err);
      alert('Erreur chargement de votre arbre : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Drag to Pan
  const handleMouseDown = (e: React.MouseEvent) => {
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

  // Zoom
  const handleZoomIn = () => setZoom(z => Math.min(1.8, z + 0.1));
  const handleZoomOut = () => setZoom(z => Math.max(0.4, z - 0.1));
  const handleResetZoom = () => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  };

  const handleSelectPerson = (person: Person) => {
    setSelectedPerson(person);
  };

  const handleCancelDetail = () => {
    setSelectedPerson(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="bg-[#0a0f18]/80 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-md text-center max-w-xl mx-auto py-16">
        <GitFork size={36} className="text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-black text-white uppercase tracking-wider">Arbre en cours de création</h3>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Votre généalogiste n&apos;a pas encore initialisé votre arbre de famille ou n&apos;a pas encore lié cet arbre à votre compte. 
          Dès que l&apos;arbre sera prêt, vous pourrez suivre son évolution en temps réel d&apos;ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Title Header with Zoom tools */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400">
            <GitFork size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Mon Espace Généalogie</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white font-heading mt-1">
            MA <span className="text-blue-400">GÉNÉALOGIE</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-[#0c1322] border border-white/5 px-3 py-1.5 rounded-2xl">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white"
            title="Zoom arrière"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] font-mono font-bold text-gray-400 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white"
            title="Zoom avant"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white"
            title="Réinitialiser"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Interactive Panning Canvas Container */}
      <div 
        ref={viewRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative overflow-hidden bg-[#040810] border border-white/5 rounded-[2.5rem] min-h-[560px] h-[600px] cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      >
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
        >
          <FamilyTree
            persons={persons}
            documents={documents}
            selectedPerson={selectedPerson}
            onSelect={handleSelectPerson}
          />
        </div>
      </div>

      {/* Detail Drawer (Read-Only) */}
      {selectedPerson && (
        <div className="absolute top-0 right-0 bottom-0 w-[380px] bg-[#070b13]/95 border-l border-white/5 shadow-2xl backdrop-blur-xl z-50 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300 scrollbar-premium">
          <div className="p-6 space-y-6">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                  Fiche Parent
                </p>
                <h3 className="text-base font-black text-white">
                  {selectedPerson.first_name || '—'} {selectedPerson.last_name || '—'}
                </h3>
              </div>
              <button
                onClick={handleCancelDetail}
                className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
              {selectedPerson.avatar_url ? (
                <img
                  src={selectedPerson.avatar_url}
                  alt="Avatar"
                  className="h-16 w-16 rounded-2xl object-cover border border-white/10 shadow-lg"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-black text-white">
                  {((selectedPerson.first_name?.[0] || '') + (selectedPerson.last_name?.[0] || '')).toUpperCase() || '?'}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-white">
                  {selectedPerson.first_name || '—'} {selectedPerson.last_name || '—'}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mt-0.5">
                  {selectedPerson.relation_role ? selectedPerson.relation_role.replace('_', ' ') : 'Membre'}
                </p>
              </div>
            </div>

            {/* Detail Stats */}
            <div className="space-y-4 font-medium text-xs">
              <div className="grid grid-cols-2 gap-3 bg-white/[0.01] p-4 rounded-2xl border border-white/5">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Naissance</span>
                  <p className="text-white font-bold mt-0.5">{selectedPerson.birth_date || '—'}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{selectedPerson.birth_place || '—'}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Décès</span>
                  <p className="text-white font-bold mt-0.5">{selectedPerson.death_date || '—'}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{selectedPerson.death_place || '—'}</p>
                </div>
              </div>

              {selectedPerson.notes && (
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-black">Notes & Anecdotes</span>
                  <p className="text-gray-300 leading-relaxed bg-white/[0.01] p-3 rounded-xl border border-white/5 text-[11px]">
                    {selectedPerson.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Civil documents list */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" /> Documents validés
              </h4>

              <div className="space-y-1.5">
                {documents.filter(d => d.person_id === selectedPerson.id).map(d => (
                  <div 
                    key={d.id} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={12} className="text-blue-400 shrink-0" />
                      <a 
                        href={d.file_url ?? '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] font-bold text-gray-300 truncate hover:text-blue-400 hover:underline transition-all"
                      >
                        {d.title || 'Télécharger le document'}
                      </a>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                      {d.doc_type}
                    </span>
                  </div>
                ))}
                
                {documents.filter(d => d.person_id === selectedPerson.id).length === 0 && (
                  <p className="text-[10px] text-gray-600 italic">Aucune pièce justificative validée.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

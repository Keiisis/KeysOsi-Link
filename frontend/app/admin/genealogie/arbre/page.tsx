'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Person, DocumentItem, Tree, RelationRole } from '@/lib/genealogy/types';
import { ROLE_LABELS } from '@/lib/genealogy/requirements';
import FamilyTree from '@/components/admin/genealogy/FamilyTree';
import PersonForm from '@/components/admin/genealogy/PersonForm';
import DocumentUploader from '@/components/admin/genealogy/DocumentUploader';
import { useTheme } from '@/lib/theme/ThemeContext';
import { 
  ChevronLeft, ZoomIn, ZoomOut, Maximize2, Loader2,
  Trash2, FileText, Upload, X, Download 
} from 'lucide-react';

export default function DedicatedTreePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const treeId = searchParams.get('id');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tree, setTree] = useState<Tree | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [presetRole, setPresetRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Pan & Zoom States
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const viewRef = useRef<HTMLDivElement | null>(null);
  const treeContainerRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!treeId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
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

  // Drag and Pan
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

  /* ─── DOWNLOAD TREE AS IMAGE ─── */
  const handleDownloadTree = async () => {
    setDownloading(true);
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const treeEl = treeContainerRef.current;
      if (!treeEl) throw new Error('Élément arbre introuvable');

      // Build missing roles report
      const allDirectRoles: RelationRole[] = [
        'self', 'father', 'mother',
        'paternal_grandfather', 'paternal_grandmother',
        'maternal_grandfather', 'maternal_grandmother',
        'paternal_ggf_1', 'paternal_ggm_1',
        'maternal_ggf_1', 'maternal_ggm_1',
      ];
      const existingRoles = new Set<RelationRole | null>(
        persons.map(p => (p.is_self ? 'self' : p.relation_role) as RelationRole | null).filter(Boolean)
      );
      const missingRoles = allDirectRoles.filter(r => !existingRoles.has(r));
      const incompletePersons = persons.filter(p => !p.first_name || !p.last_name || !p.birth_date);

      // Create a wrapper to include the report at the bottom
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;background:#FFFFFF;padding:40px;';
      
      // Clone tree into wrapper
      const treeClone = treeEl.cloneNode(true) as HTMLElement;
      treeClone.style.transform = 'none';
      treeClone.style.position = 'relative';
      wrapper.appendChild(treeClone);

      // Add report section
      const report = document.createElement('div');
      report.style.cssText = 'margin-top:48px;padding:32px;border-top:3px solid #008751;font-family:system-ui,sans-serif;color:#1B2A4A;';
      
      let html = `<h2 style="font-size:18px;font-weight:900;margin:0 0 6px;color:#008751;">📋 Rapport de l'arbre — ${clientName}</h2>`;
      html += `<p style="font-size:12px;color:#6B7280;margin:0 0 20px;">Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} • ${persons.length} membre(s) enregistré(s)</p>`;
      
      if (missingRoles.length > 0) {
        html += `<div style="margin-bottom:16px;padding:16px;background:#FEF3C7;border-radius:12px;border:1px solid #FCD34D;">`;
        html += `<h3 style="font-size:13px;font-weight:800;color:#92400E;margin:0 0 8px;">⚠️ Membres manquants (${missingRoles.length})</h3>`;
        html += `<ul style="margin:0;padding:0 0 0 16px;font-size:11px;color:#78350F;">`;
        missingRoles.forEach(r => {
          html += `<li style="margin-bottom:4px;">${ROLE_LABELS[r] || r}</li>`;
        });
        html += `</ul></div>`;
      }
      
      if (incompletePersons.length > 0) {
        html += `<div style="margin-bottom:16px;padding:16px;background:#FEE2E2;border-radius:12px;border:1px solid #FCA5A5;">`;
        html += `<h3 style="font-size:13px;font-weight:800;color:#991B1B;margin:0 0 8px;">🔴 Fiches incomplètes (${incompletePersons.length})</h3>`;
        html += `<ul style="margin:0;padding:0 0 0 16px;font-size:11px;color:#7F1D1D;">`;
        incompletePersons.forEach(p => {
          const missing: string[] = [];
          if (!p.first_name) missing.push('prénom');
          if (!p.last_name) missing.push('nom');
          if (!p.birth_date) missing.push('date de naissance');
          html += `<li style="margin-bottom:4px;"><strong>${p.first_name || '?'} ${p.last_name || '?'}</strong> (${ROLE_LABELS[p.relation_role || ''] || 'Membre'}) — manque : ${missing.join(', ')}</li>`;
        });
        html += `</ul></div>`;
      }

      if (missingRoles.length === 0 && incompletePersons.length === 0) {
        html += `<div style="padding:16px;background:#D1FAE5;border-radius:12px;border:1px solid #6EE7B7;">`;
        html += `<p style="font-size:13px;font-weight:700;color:#065F46;margin:0;">✅ Arbre complet — Toutes les fiches sont renseignées</p>`;
        html += `</div>`;
      }

      html += `<p style="margin-top:20px;font-size:9px;color:#9CA3AF;text-align:center;">RETOUR GAGNANT BÉNIN — Arbre Généalogique • retourgagnantbenin.bj</p>`;
      
      report.innerHTML = html;
      wrapper.appendChild(report);
      document.body.appendChild(wrapper);

      // Wait for rendering
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false,
        width: wrapper.scrollWidth,
        height: wrapper.scrollHeight,
      });

      document.body.removeChild(wrapper);

      // Download as PNG
      const link = document.createElement('a');
      link.download = `arbre-${clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (err: any) {
      console.error('Download error:', err);
      alert('Erreur lors du téléchargement : ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  /* ─── DOWNLOAD TREE AS FILLABLE PDF ─── */
  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      // 1. Dynamic imports
      const html2canvas = (await import('html2canvas')).default;
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      const treeEl = treeContainerRef.current;
      if (!treeEl) throw new Error('Élément arbre introuvable');

      // 2. Capture the family tree diagram as an image first
      const oldZoom = zoom;
      const oldPan = pan;
      setZoom(1);
      setPan({ x: 0, y: 0 });
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(treeEl, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      setZoom(oldZoom);
      setPan(oldPan);

      const treeImgData = canvas.toDataURL('image/jpeg', 0.9);

      // 3. Create PDF Doc
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const form = pdfDoc.getForm();

      // --- PAGE 1: COVER PAGE ---
      const page1 = pdfDoc.addPage([595, 842]);
      
      page1.drawRectangle({
        x: 0,
        y: 742,
        width: 595,
        height: 100,
        color: rgb(0, 0.53, 0.32),
      });

      page1.drawLine({
        start: { x: 0, y: 742 },
        end: { x: 595, y: 742 },
        thickness: 3,
        color: rgb(0.99, 0.82, 0.09),
      });

      page1.drawText('RETOUR GAGNANT BÉNIN', {
        x: 40,
        y: 785,
        size: 18,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      page1.drawText('GÉNÉALOGIE ET HISTOIRE FAMILIALE', {
        x: 40,
        y: 765,
        size: 8,
        font: helvetica,
        color: rgb(0.85, 0.85, 0.85),
      });

      page1.drawText('ARBRE & FICHE DE LIGNÉE DIRECTE', {
        x: 40,
        y: 520,
        size: 24,
        font: helveticaBold,
        color: rgb(0.06, 0.1, 0.18),
      });

      page1.drawText('Document interactif et modifiable en PDF', {
        x: 40,
        y: 495,
        size: 11,
        font: helvetica,
        color: rgb(0.42, 0.45, 0.5),
      });

      page1.drawRectangle({
        x: 40,
        y: 250,
        width: 515,
        height: 160,
        color: rgb(0.97, 0.97, 0.97),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      });

      page1.drawText('INFORMATIONS DOSSIER CLIENT', {
        x: 60,
        y: 380,
        size: 10,
        font: helveticaBold,
        color: rgb(0, 0.53, 0.32),
      });

      const cleanClientName = clientName || 'Non spécifié';
      const cleanTreeName = tree?.name || 'Arbre de Lignée';
      const generationDate = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      page1.drawText(`Client : ${cleanClientName}`, { x: 60, y: 345, size: 12, font: helvetica });
      page1.drawText(`Nom de l'arbre : ${cleanTreeName}`, { x: 60, y: 315, size: 12, font: helvetica });
      page1.drawText(`Membres enregistrés : ${persons.length}`, { x: 60, y: 285, size: 12, font: helvetica });

      page1.drawLine({ start: { x: 40, y: 80 }, end: { x: 555, y: 80 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      page1.drawText('Retour Gagnant Bénin — www.retourgagnantbenin.bj', {
        x: 40,
        y: 60,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
      page1.drawText(`Date : ${generationDate}`, {
        x: 460,
        y: 60,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      // --- PAGE 2: FAMILY TREE VISUAL (LANDSCAPE) ---
      const page2 = pdfDoc.addPage([842, 595]);
      
      page2.drawText(`ARBRE GÉNÉALOGIQUE : FAMILLE ${cleanClientName.toUpperCase()}`, {
        x: 40,
        y: 555,
        size: 14,
        font: helveticaBold,
        color: rgb(0.06, 0.1, 0.18),
      });
      page2.drawLine({ start: { x: 40, y: 545 }, end: { x: 802, y: 545 }, thickness: 1, color: rgb(0, 0.53, 0.32) });

      const embeddedTreeImg = await pdfDoc.embedJpg(treeImgData);
      const imgWidth = 842 - 80;
      const imgHeight = (embeddedTreeImg.height / embeddedTreeImg.width) * imgWidth;
      const yOffset = imgHeight < 460 ? (460 - imgHeight) / 2 + 40 : 40;
      
      page2.drawImage(embeddedTreeImg, {
        x: 40,
        y: yOffset,
        width: imgWidth,
        height: Math.min(imgHeight, 460),
      });

      page2.drawText('Page 2/Arbre', {
        x: 760,
        y: 20,
        size: 8,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6),
      });

      // --- PAGES 3+: INDIVIDUAL FORM SHEETS (PORTRAIT) ---
      const rolesToExport = [
        { role: 'self', label: 'SUJET (G0)' },
        { role: 'father', label: 'PÈRE (G1)' },
        { role: 'mother', label: 'MÈRE (G1)' },
        { role: 'paternal_grandfather', label: 'GRAND-PÈRE PATERNEL (G2)' },
        { role: 'paternal_grandmother', label: 'GRAND-MÈRE PATERNELLE (G2)' },
        { role: 'maternal_grandfather', label: 'GRAND-PÈRE MATERNEL (G2)' },
        { role: 'maternal_grandmother', label: 'GRAND-MÈRE MATERNELLE (G2)' },
      ];

      let currentPage = null;
      let memberOnPageCount = 0;
      let pageNum = 3;

      for (let index = 0; index < rolesToExport.length; index++) {
        const { role, label } = rolesToExport[index];
        const person = persons.find(p => (role === 'self' && p.is_self) || p.relation_role === role);

        if (memberOnPageCount % 2 === 0) {
          currentPage = pdfDoc.addPage([595, 842]);
          memberOnPageCount = 0;

          currentPage.drawText('FICHES DES MEMBRES DE LA LIGNÉE DIRECTE (MODIFIABLES)', {
            x: 40,
            y: 805,
            size: 10,
            font: helveticaBold,
            color: rgb(0, 0.53, 0.32),
          });
          currentPage.drawLine({ start: { x: 40, y: 795 }, end: { x: 555, y: 795 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
          
          currentPage.drawText(`Page ${pageNum++}`, {
            x: 520,
            y: 20,
            size: 8,
            font: helvetica,
            color: rgb(0.6, 0.6, 0.6),
          });
        }

        const page = currentPage!;
        const yBase = memberOnPageCount === 0 ? 440 : 80;

        page.drawRectangle({
          x: 40,
          y: yBase,
          width: 515,
          height: 300,
          color: rgb(0.99, 0.99, 0.99),
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 1,
        });

        page.drawRectangle({
          x: 40,
          y: yBase + 270,
          width: 515,
          height: 30,
          color: rgb(0.06, 0.1, 0.18),
        });

        page.drawText(label, {
          x: 55,
          y: yBase + 280,
          size: 10,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });

        const drawField = (fieldName: string, label: string, val: string, x: number, y: number, w: number) => {
          page.drawText(label, {
            x,
            y: y + 4,
            size: 8,
            font: helveticaBold,
            color: rgb(0.3, 0.35, 0.4),
          });

          const fieldId = `${role}_${fieldName}_${index}`;
          const textField = form.createTextField(fieldId);
          textField.setText(val);
          textField.setFontSize(8);
          
          textField.addToPage(page, {
            x: x + 65,
            y,
            width: w,
            height: 16,
          });
        };

        const fName = person?.first_name || '';
        const lName = person?.last_name || '';
        const bDate = person?.birth_date || '';
        const bPlace = person?.birth_place || '';
        const dDate = person?.death_date || '';
        const dPlace = person?.death_place || '';
        const noteText = person?.notes || '';

        drawField('first_name', 'Prénom :', fName, 55, yBase + 235, 150);
        drawField('last_name', 'Nom :', lName, 55, yBase + 205, 150);
        drawField('birth_date', 'Né(e) le :', bDate, 55, yBase + 175, 150);
        drawField('birth_place', 'à :', bPlace, 55, yBase + 145, 150);

        drawField('death_date', 'Mort(e) le :', dDate, 310, yBase + 175, 130);
        drawField('death_place', 'à :', dPlace, 310, yBase + 145, 130);

        page.drawText('Notes historiques & commentaires :', {
          x: 55,
          y: yBase + 115,
          size: 8,
          font: helveticaBold,
          color: rgb(0.3, 0.35, 0.4),
        });

        const noteFieldId = `${role}_notes_${index}`;
        const notesField = form.createTextField(noteFieldId);
        notesField.setText(noteText);
        notesField.setFontSize(7);
        notesField.enableMultiline();
        notesField.addToPage(page, {
          x: 55,
          y: yBase + 20,
          width: 485,
          height: 80,
        });

        memberOnPageCount++;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `arbre_genealogique_${cleanClientName.replace(/\s+/g, '_').toLowerCase()}.pdf`;
      link.click();
    } catch (err: any) {
      console.error('PDF error:', err);
      alert('Erreur lors du téléchargement PDF : ' + err.message);
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--panel-bg)' }}>
        <Loader2 className="animate-spin text-[#008751]" size={36} />
      </div>
    );
  }

  const clientName = tree?.client_first_name 
    ? `${tree.client_first_name} ${tree.client_last_name}` 
    : 'Client';

  return (
    <div
      className="relative min-h-screen h-screen flex flex-col overflow-hidden select-none"
      style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}
    >
      
      {/* 1. Header Navigation Bar */}
      <header
        className="h-16 flex items-center justify-between px-6 border-b relative z-40 shadow-md"
        style={{
          background: 'var(--panel-surface)',
          borderColor: 'var(--panel-border)',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/genealogie')}
            className="p-2 rounded-xl transition-all shrink-0"
            style={{ background: 'var(--panel-surface-hover)', color: 'var(--panel-text-muted)' }}
            title="Retour au Dashboard"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="h-6 w-[1px]" style={{ background: 'var(--panel-border)' }} />

          <div>
            <h1 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--panel-text-heading)' }}>
              Arbre de <span className="text-benin-gradient">{clientName}</span>
            </h1>
            <p className="text-[10px] font-mono" style={{ color: 'var(--panel-text-faint)' }}>
              {tree?.name} • {persons.length} MEMBRES
            </p>
          </div>
        </div>

        {/* Tool Controls */}
        <div className="flex items-center gap-2">
          {/* Download Button */}
          <button
            onClick={handleDownloadTree}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[11px] font-bold"
            style={{
              background: isDark ? 'rgba(0,135,81,0.12)' : 'rgba(0,135,81,0.08)',
              color: '#008751',
              border: `1px solid ${isDark ? 'rgba(0,135,81,0.25)' : 'rgba(0,135,81,0.2)'}`,
            }}
            title="Télécharger l'arbre en image"
          >
            {downloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {downloading ? 'Export…' : 'Télécharger'}
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[11px] font-bold"
            style={{
              background: isDark ? 'rgba(197,168,76,0.12)' : 'rgba(197,168,76,0.08)',
              color: 'var(--panel-accent)',
              border: `1px solid ${isDark ? 'rgba(197,168,76,0.25)' : 'rgba(197,168,76,0.2)'}`,
            }}
            title="Télécharger l'arbre en PDF modifiable"
          >
            {downloadingPDF ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            {downloadingPDF ? 'Export PDF…' : 'Télécharger PDF'}
          </button>

          <div className="h-6 w-[1px]" style={{ background: 'var(--panel-border)' }} />

          <button
            onClick={handleZoomOut}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: 'var(--panel-surface-hover)', color: 'var(--panel-text-muted)' }}
            title="Zoom arrière"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-[11px] font-mono font-bold min-w-[40px] text-center" style={{ color: 'var(--panel-text-muted)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: 'var(--panel-surface-hover)', color: 'var(--panel-text-muted)' }}
            title="Zoom avant"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: 'var(--panel-surface-hover)', color: 'var(--panel-text-muted)' }}
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
        className={`flex-1 relative overflow-hidden cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{ background: 'var(--panel-bg)' }}
      >
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: isDark ? 0.15 : 0.25,
            backgroundImage: isDark 
              ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
              : 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Tree wrapper transformed by zoom and pan state */}
        <div
          ref={treeContainerRef}
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

      {/* 3. Slider detail drawer */}
      {(selectedPerson || presetRole) && tree && (
        <div
          className="absolute top-16 right-0 bottom-0 w-[420px] border-l backdrop-blur-2xl z-50 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300 scrollbar-premium"
          style={{
            background: isDark ? 'rgba(7,11,19,0.95)' : 'rgba(255,255,255,0.97)',
            borderColor: 'var(--panel-border)',
            boxShadow: isDark ? '-20px 0 60px rgba(0,0,0,0.8)' : '-20px 0 60px rgba(0,0,0,0.1)',
          }}
        >
          <div className="p-6 space-y-6">
            
            {/* Header of Drawer */}
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--panel-border)' }}>
              <div>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  {selectedPerson ? 'Éditer le membre' : 'Ajouter un membre'}
                </p>
                <h3 className="text-base font-black" style={{ color: 'var(--panel-text-heading)' }}>
                  {selectedPerson 
                    ? `${selectedPerson.first_name || ''} ${selectedPerson.last_name || ''}`
                    : 'Création de Parenté'
                  }
                </h3>
              </div>
              <button
                onClick={handleCancelEdit}
                className="p-2 rounded-xl transition-all"
                style={{ color: 'var(--panel-text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Document upload inside details */}
            {selectedPerson && (
              <div className="space-y-4 border-b pb-5" style={{ borderColor: 'var(--panel-border)' }}>
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--panel-text-muted)' }}>
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
                      className="flex items-center justify-between p-2.5 rounded-xl"
                      style={{
                        background: 'var(--panel-surface-hover)',
                        border: `1px solid var(--panel-border)`,
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={12} className="text-[#008751] shrink-0" />
                        <a 
                          href={d.file_url ?? '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] font-bold truncate hover:text-[#FCD116] transition-all"
                          style={{ color: 'var(--panel-text)' }}
                        >
                          {d.title || 'Fichier'}
                        </a>
                      </div>
                      <span
                        className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          color: 'var(--panel-text-faint)',
                          background: 'var(--panel-badge-bg)',
                          border: `1px solid var(--panel-border)`,
                        }}
                      >
                        {d.doc_type}
                      </span>
                    </div>
                  ))}
                  
                  {documents.filter(d => d.person_id === selectedPerson.id).length === 0 && (
                    <p className="text-[10px] italic" style={{ color: 'var(--panel-text-faint)' }}>Aucune pièce justificative.</p>
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

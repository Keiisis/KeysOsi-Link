import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function getAuthUserId(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return null
    const supa = createClient(supabaseUrl, supabaseAnonKey)
    const { data } = await supa.auth.getUser(token)
    return data?.user?.id || null
}

// Tokens de couleur — alignés avec le design system Retour Gagnant
const COL_EMERALD = '#10B981'
const COL_EMERALD_DARK = '#047857'
const COL_GOLD = '#C9A84C'
const COL_NAVY = '#1a2332'
const COL_MUTED = '#718096'

interface DossierChecklistItem {
    label: string
    required: boolean
}

const CHECKLIST_AFRO: DossierChecklistItem[] = [
    { label: 'Acte de naissance de l\'enfant (apostillé)', required: true },
    { label: 'Acte de naissance des deux parents', required: true },
    { label: 'Acte de naissance des 4 grands-parents (si possible)', required: true },
    { label: 'Test ADN (origine afro-descendante)', required: false },
    { label: 'Justificatif de résidence en France/diaspora', required: true },
    { label: 'Pièce d\'identité (passeport en cours de validité)', required: true },
    { label: 'Photos d\'identité (norme ICAO, fond blanc)', required: true },
    { label: 'Casier judiciaire du pays de résidence (< 3 mois)', required: true },
    { label: 'Lettre de motivation manuscrite signée', required: true },
]

const CHECKLIST_ANCETRE: DossierChecklistItem[] = [
    { label: 'Recherche archives traite transatlantique', required: true },
    { label: 'Acte d\'esclavage ou registre de plantation', required: false },
    { label: 'Acte de naissance de l\'ancêtre identifié', required: true },
    { label: 'Chaîne généalogique complète depuis l\'ancêtre', required: true },
    { label: 'Photos / portraits / lettres familiales', required: false },
    { label: 'Test ADN attestant l\'origine béninoise', required: false },
    { label: 'Témoignages familiaux notariés', required: false },
    { label: 'Pièce d\'identité du demandeur', required: true },
    { label: 'Lettre du demandeur expliquant la démarche', required: true },
]

// POST /api/genealogie/dossier-pdf
// Body : { tree_id, tree_image_base64?, dossier_type?: 'afro_descendance'|'ancetre_esclavage'|'both' }
// Renvoie : application/pdf binaire
export async function POST(request: NextRequest) {
    try {
        const userId = await getAuthUserId(request)
        if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

        const body = await request.json()
        const treeId = String(body.tree_id || '')
        const treeImageB64: string | null = body.tree_image_base64 || null
        const dossierType: 'afro_descendance' | 'ancetre_esclavage' | 'both' =
            body.dossier_type === 'afro_descendance' || body.dossier_type === 'ancetre_esclavage'
                ? body.dossier_type
                : 'both'

        if (!treeId) return NextResponse.json({ error: 'tree_id requis' }, { status: 400 })

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Vérifier accès lecture
        const { data: canRead } = await supabase.rpc('can_read_tree', { p_tree_id: treeId })
        if (!canRead) {
            return NextResponse.json({ error: 'Accès refusé à cet arbre' }, { status: 403 })
        }

        // Charger les données
        const { data: tree } = await supabase
            .from('trees')
            .select('id, name, client_first_name, client_last_name, client_email, created_at')
            .eq('id', treeId)
            .single()
        if (!tree) return NextResponse.json({ error: 'Arbre introuvable' }, { status: 404 })

        const { data: persons } = await supabase
            .from('persons')
            .select('id, first_name, last_name, gender, birth_date, birth_place, death_date, death_place, relation_role, is_self')
            .eq('tree_id', treeId)
            .order('birth_date', { ascending: true, nullsFirst: false })

        const { data: docs } = await supabase
            .from('genealogy_documents')
            .select('id, doc_type, title, issued_date, person_id')
            .eq('tree_id', treeId)
            .order('doc_type')

        const { data: dossiers } = await supabase
            .from('dossiers')
            .select('id, dossier_type, status, progress, created_at')
            .eq('tree_id', treeId)

        // ── Génération du PDF ──
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const margin = 18

        // ════════════════ PAGE DE GARDE ════════════════
        doc.setFillColor(COL_EMERALD_DARK)
        doc.rect(0, 0, pageW, 80, 'F')

        doc.setFillColor(COL_GOLD)
        doc.rect(0, 78, pageW, 3, 'F')

        // Titre principal
        doc.setTextColor('#FFFFFF')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(28)
        doc.text('Retour Gagnant Bénin', pageW / 2, 38, { align: 'center' })

        doc.setFontSize(13)
        doc.setFont('helvetica', 'normal')
        doc.text('Dossier généalogique complet', pageW / 2, 50, { align: 'center' })

        doc.setFontSize(10)
        doc.setTextColor(COL_GOLD)
        doc.text('Plan de composition de Famille', pageW / 2, 62, { align: 'center' })

        // Bloc info client
        doc.setTextColor(COL_NAVY)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('CLIENT', margin, 110)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(14)
        const clientName = `${tree.client_first_name || ''} ${tree.client_last_name || ''}`.trim() || tree.name
        doc.text(clientName || '—', margin, 119)
        if (tree.client_email) {
            doc.setFontSize(10)
            doc.setTextColor(COL_MUTED)
            doc.text(tree.client_email, margin, 126)
        }

        doc.setTextColor(COL_NAVY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text('GÉNÉRÉ LE', margin, 145)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(12)
        const now = new Date()
        doc.text(
            now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
            margin,
            153
        )

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text('STATISTIQUES', margin, 175)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.text(`• ${(persons || []).length} personne(s) recensée(s)`, margin, 184)
        doc.text(`• ${(docs || []).length} document(s) au coffre-fort`, margin, 191)
        doc.text(`• ${(dossiers || []).length} dossier(s) en cours`, margin, 198)

        // Footer page de garde
        doc.setFontSize(9)
        doc.setTextColor(COL_MUTED)
        doc.text(
            'contact@retourgagnantbenin.bj · www.retourgagnantbenin.bj · 229 01 60 32 21 21',
            pageW / 2, pageH - 12, { align: 'center' }
        )

        // ════════════════ PAGE ARBRE (image) ════════════════
        if (treeImageB64) {
            doc.addPage()
            doc.setTextColor(COL_NAVY)
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('Arbre généalogique', margin, 22)
            doc.setDrawColor(COL_GOLD)
            doc.setLineWidth(0.6)
            doc.line(margin, 26, pageW - margin, 26)

            try {
                // Image base64 attendue : "data:image/png;base64,..."
                const imgData = treeImageB64.startsWith('data:') ? treeImageB64 : `data:image/png;base64,${treeImageB64}`
                const imgMaxW = pageW - margin * 2
                const imgMaxH = pageH - 50
                doc.addImage(imgData, 'PNG', margin, 32, imgMaxW, imgMaxH, undefined, 'FAST')
            } catch {
                doc.setFontSize(11)
                doc.setTextColor(COL_MUTED)
                doc.text('⚠ Snapshot d\'arbre indisponible', margin, 40)
            }
        }

        // ════════════════ TABLEAU PERSONNES ════════════════
        if ((persons || []).length > 0) {
            doc.addPage()
            doc.setTextColor(COL_NAVY)
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('Personnes', margin, 22)
            doc.setDrawColor(COL_GOLD)
            doc.setLineWidth(0.6)
            doc.line(margin, 26, pageW - margin, 26)

            autoTable(doc, {
                startY: 32,
                head: [['Nom complet', 'Sexe', 'Naissance', 'Lieu', 'Rôle', 'Décès']],
                body: (persons || []).map(p => [
                    `${p.first_name || ''} ${p.last_name || ''}`.trim() + (p.is_self ? ' ★' : ''),
                    p.gender === 'male' ? 'H' : p.gender === 'female' ? 'F' : '—',
                    p.birth_date || '—',
                    p.birth_place || '—',
                    p.relation_role || '—',
                    p.death_date ? `† ${p.death_date}` : '—',
                ]),
                headStyles: { fillColor: COL_EMERALD, textColor: '#FFFFFF', fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 2.5, textColor: COL_NAVY },
                alternateRowStyles: { fillColor: '#F8FAF9' },
                margin: { left: margin, right: margin },
            })
        }

        // ════════════════ COFFRE-FORT DOCUMENTAIRE ════════════════
        if ((docs || []).length > 0) {
            doc.addPage()
            doc.setTextColor(COL_NAVY)
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('Coffre-fort documentaire', margin, 22)
            doc.setDrawColor(COL_GOLD)
            doc.setLineWidth(0.6)
            doc.line(margin, 26, pageW - margin, 26)

            // Map person_id → nom pour enrichissement
            const personNames: Record<string, string> = {}
            for (const p of persons || []) {
                personNames[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim()
            }

            autoTable(doc, {
                startY: 32,
                head: [['Type', 'Titre', 'Émis le', 'Personne concernée']],
                body: (docs || []).map(d => [
                    d.doc_type || '—',
                    d.title || '—',
                    d.issued_date || '—',
                    d.person_id ? personNames[d.person_id] || '—' : '—',
                ]),
                headStyles: { fillColor: COL_EMERALD, textColor: '#FFFFFF', fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 2.5, textColor: COL_NAVY },
                alternateRowStyles: { fillColor: '#F8FAF9' },
                margin: { left: margin, right: margin },
            })
        }

        // ════════════════ CHECKLIST DOSSIER(S) ════════════════
        const renderChecklist = (title: string, items: DossierChecklistItem[], dossier?: { status: string; progress: number }) => {
            doc.addPage()
            doc.setTextColor(COL_NAVY)
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text(`Checklist : ${title}`, margin, 22)
            doc.setDrawColor(COL_GOLD)
            doc.setLineWidth(0.6)
            doc.line(margin, 26, pageW - margin, 26)

            if (dossier) {
                doc.setFontSize(10)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(COL_MUTED)
                doc.text(`Statut : ${dossier.status} — Avancement ${Math.round(dossier.progress)}%`, margin, 33)
            }

            autoTable(doc, {
                startY: dossier ? 40 : 32,
                head: [['Pièce à fournir', 'Obligatoire']],
                body: items.map(i => [
                    i.label,
                    i.required ? 'Oui' : 'Optionnel',
                ]),
                headStyles: { fillColor: COL_EMERALD, textColor: '#FFFFFF', fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 3, textColor: COL_NAVY },
                columnStyles: {
                    0: { cellWidth: 130 },
                    1: { cellWidth: 35, halign: 'center' },
                },
                alternateRowStyles: { fillColor: '#F8FAF9' },
                margin: { left: margin, right: margin },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 1) {
                        if (data.cell.text[0] === 'Oui') {
                            data.cell.styles.textColor = COL_EMERALD_DARK
                            data.cell.styles.fontStyle = 'bold'
                        } else {
                            data.cell.styles.textColor = COL_MUTED
                        }
                    }
                },
            })
        }

        const dossierByType: Record<string, { status: string; progress: number } | undefined> = {}
        for (const d of dossiers || []) {
            dossierByType[d.dossier_type] = { status: d.status, progress: d.progress }
        }

        if (dossierType === 'afro_descendance' || dossierType === 'both') {
            renderChecklist('Afro-descendance', CHECKLIST_AFRO, dossierByType.afro_descendance)
        }
        if (dossierType === 'ancetre_esclavage' || dossierType === 'both') {
            renderChecklist('Recherche ancestrale', CHECKLIST_ANCETRE, dossierByType.ancetre_esclavage)
        }

        // ════════════════ Footer numéroté sur toutes les pages ════════════════
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(COL_MUTED)
            doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 8, { align: 'right' })
            if (i > 1) {
                doc.text('Retour Gagnant Bénin', margin, pageH - 8)
            }
        }

        // ════════════════ Envoyer le PDF binaire ════════════════
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
        const filename = `Dossier-genealogique-${clientName.replace(/[^a-zA-Z0-9-]/g, '_') || treeId.slice(0, 8)}-${now.toISOString().slice(0, 10)}.pdf`

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': String(pdfBuffer.length),
            },
        })
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Erreur serveur' },
            { status: 500 }
        )
    }
}

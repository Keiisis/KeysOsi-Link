import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import { LOGO_BASE64 } from '@/lib/logoBase64'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Taux fixe XOF → EUR (zone CFA)
const XOF_TO_EUR = 655.957

// Convertir un montant en texte français (lettres majuscules)
function toWordsFr(n: number): string {
    if (n === 0) return 'ZÉRO'
    if (n < 0) return 'MOINS ' + toWordsFr(-n)

    const ones = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF',
        'DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE',
        'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF']
    const tens = ['', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE', 'QUATRE-VINGT', 'QUATRE-VINGT']

    function below100(n: number): string {
        if (n < 20) return ones[n]
        const t = Math.floor(n / 10), u = n % 10
        if (t === 7) return u === 1 ? 'SOIXANTE ET ONZE' : 'SOIXANTE-' + ones[10 + u]
        if (t === 9) return u === 0 ? 'QUATRE-VINGT-DIX' : 'QUATRE-VINGT-' + ones[10 + u]
        if (u === 0) return t === 8 ? 'QUATRE-VINGTS' : tens[t]
        if (u === 1 && t !== 8) return tens[t] + ' ET UN'
        return tens[t] + '-' + ones[u]
    }

    function below1000(n: number): string {
        if (n < 100) return below100(n)
        const h = Math.floor(n / 100), r = n % 100
        const hStr = h === 1 ? 'CENT' : ones[h] + ' CENT'
        if (r === 0) return h === 1 ? 'CENT' : ones[h] + ' CENTS'
        return hStr + ' ' + below100(r)
    }

    if (n < 1000) return below1000(n)
    if (n < 2000) {
        const r = n % 1000
        return r === 0 ? 'MILLE' : 'MILLE ' + below1000(r)
    }
    if (n < 1000000) {
        const m = Math.floor(n / 1000), r = n % 1000
        const mStr = below1000(m) + ' MILLE'
        return r === 0 ? mStr : mStr + ' ' + below1000(r)
    }
    if (n < 1000000000) {
        const m = Math.floor(n / 1000000), r = n % 1000000
        const mStr = m === 1 ? 'UN MILLION' : below1000(m) + ' MILLIONS'
        return r === 0 ? mStr : mStr + ' ' + toWordsFr(r)
    }
    return n.toLocaleString('fr-FR')
}

// Générer la référence du devis: XX-MM/F/RGB/BENIN/YYYY-MM-DD/INITIALES
function generateRef(clientName: string, createdAt: string): string {
    const d = new Date(createdAt)
    const yy = String(d.getFullYear()).slice(-2)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateStr = `${d.getFullYear()}-${mm}-${dd}`
    const parts = clientName.trim().split(/\s+/)
    const initials = parts.map(p => p[0]?.toUpperCase() || '').join('')
    return `${yy}-${mm}/F/RGB/BENIN/${dateStr}/${initials}`
}

// Formater une date en français
function dateFr(iso: string): string {
    const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    const d = new Date(iso)
    return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`
}

interface ProposalRow {
    id: string
    client_name: string
    client_email: string | null
    destination: string
    total_amount: number
    currency?: string
    created_at: string
}

interface ItemRow {
    type: string
    title: string
    selling_price: number
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: proposal, error: pe } = await supabase
            .from('ai_client_proposals')
            .select('id, client_name, client_email, destination, total_amount, created_at')
            .eq('id', id)
            .single()

        if (pe || !proposal) {
            return NextResponse.json({ error: 'Proposition introuvable' }, { status: 404 })
        }

        const { data: rawItems } = await supabase
            .from('ai_proposal_items')
            .select('type, title, selling_price')
            .eq('proposal_id', id)
            .order('order_index', { ascending: true })

        const p = proposal as ProposalRow
        const allItems: ItemRow[] = (rawItems || []) as ItemRow[]

        // Éléments facturables uniquement
        const billable = allItems.filter(i => i.type !== 'hero' && i.type !== 'pricing' && i.selling_price > 0)

        // Calculs — selling_price est le prix TTC
        const totalTTC_XOF = billable.reduce((s, i) => s + i.selling_price, 0)
        const totalHT_XOF = Math.round(totalTTC_XOF / 1.18)
        const tva_XOF = totalTTC_XOF - totalHT_XOF

        const totalTTC_EUR = Math.round(totalTTC_XOF / XOF_TO_EUR)
        const totalHT_EUR = Math.round(totalHT_XOF / XOF_TO_EUR)
        const tva_EUR = Math.round(tva_XOF / XOF_TO_EUR)

        const ref = generateRef(p.client_name, p.created_at)

        // ── Génération PDF ──────────────────────────────────────────────
        const pdf = new jsPDF('p', 'mm', 'a4')

        const PW = 210, PH = 297
        const ML = 14, MR = 14, CW = PW - ML - MR  // 182mm

        // ── BANDE COULEURS BÉNIN ────────────────────────────────────────
        pdf.setFillColor(0, 135, 81)
        pdf.rect(0, 0, PW / 3, 3, 'F')
        pdf.setFillColor(252, 209, 22)
        pdf.rect(PW / 3, 0, PW / 3, 3, 'F')
        pdf.setFillColor(232, 17, 45)
        pdf.rect((PW * 2) / 3, 0, PW / 3, 3, 'F')

        // ── HEADER BLANC ───────────────────────────────────────────────
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 3, PW, 50, 'F')

        try {
            pdf.addImage(LOGO_BASE64, 'JPEG', ML, 9, 16, 16)
        } catch (e) {
            console.error('Erreur ajout logo:', e)
        }

        // Nom société gauche
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(18)
        pdf.setTextColor(0, 135, 81)
        pdf.text('RETOUR GAGNANT', ML + 20, 18)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(232, 17, 45)
        pdf.text('BÉNIN', ML + 20, 24)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(100, 100, 100)
        pdf.text('Agence de Conciergerie & Services Internationaux', ML + 20, 29)
        pdf.text('Haie-Vive Cocotiers, Carré n°1158, Cotonou — République du Bénin', ML + 20, 34)

        // "DEVIS" titre droit
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(32)
        pdf.setTextColor(30, 30, 30)
        pdf.text('DEVIS', PW - MR, 22, { align: 'right' })

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(90, 90, 90)
        pdf.text(`Réf. : ${ref}`, PW - MR, 30, { align: 'right' })
        pdf.text(`Date : Cotonou, le ${dateFr(p.created_at)}`, PW - MR, 36, { align: 'right' })

        // Ligne séparatrice
        pdf.setDrawColor(0, 135, 81)
        pdf.setLineWidth(0.8)
        pdf.line(ML, 53, PW - MR, 53)

        let y = 60

        // ── BLOC CLIENT ─────────────────────────────────────────────────
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(60, 60, 60)
        pdf.text('À l\'attention de :', ML, y)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.setTextColor(20, 20, 20)
        pdf.text(p.client_name.toUpperCase(), ML, y + 6)

        if (p.client_email) {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(8)
            pdf.setTextColor(80, 80, 80)
            pdf.text(p.client_email, ML, y + 12)
        }

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(80, 80, 80)
        pdf.text(`Destination : ${p.destination}`, ML, y + 18)

        y += 28

        // ── LIGNE OBJET ─────────────────────────────────────────────────
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(40, 40, 40)
        pdf.text(`Objet : Devis pour services de voyage — ${p.destination}`, ML, y)
        y += 10

        // ── TABLE HEADER ────────────────────────────────────────────────
        const cols = [
            { label: 'DÉSIGNATION', w: 70, align: 'left' as const },
            { label: 'Qté', w: 14, align: 'center' as const },
            { label: 'Montant HT\n(FCFA)', w: 32, align: 'right' as const },
            { label: 'Montant TTC\n(FCFA)', w: 34, align: 'right' as const },
            { label: 'TTC\n(€)', w: 32, align: 'right' as const },
        ]

        // En-tête du tableau (fond vert foncé)
        pdf.setFillColor(20, 40, 30)
        pdf.rect(ML, y, CW, 12, 'F')

        let cx = ML
        for (const col of cols) {
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(7)
            pdf.setTextColor(255, 255, 255)
            const lines = col.label.split('\n')
            if (col.align === 'right') {
                lines.forEach((line, li) => pdf.text(line, cx + col.w - 2, y + 4.5 + li * 3.8, { align: 'right' }))
            } else if (col.align === 'center') {
                lines.forEach((line, li) => pdf.text(line, cx + col.w / 2, y + 4.5 + li * 3.8, { align: 'center' }))
            } else {
                lines.forEach((line, li) => pdf.text(line, cx + 2, y + 4.5 + li * 3.8))
            }
            cx += col.w
        }
        y += 12

        // Lignes du tableau
        billable.forEach((item, i) => {
            const rowH = 9
            const even = i % 2 === 0
            pdf.setFillColor(even ? 250 : 244, even ? 250 : 246, even ? 250 : 244)
            pdf.rect(ML, y, CW, rowH, 'F')
            pdf.setDrawColor(210, 210, 210)
            pdf.setLineWidth(0.2)
            pdf.line(ML, y + rowH, ML + CW, y + rowH)

            const htFCFA = Math.round(item.selling_price / 1.18)
            const ttcFCFA = item.selling_price
            const ttcEUR = Math.round(item.selling_price / XOF_TO_EUR)

            const rowData = [
                { text: item.title, w: cols[0].w, align: 'left' as const },
                { text: '1', w: cols[1].w, align: 'center' as const },
                { text: htFCFA.toLocaleString('fr-FR'), w: cols[2].w, align: 'right' as const },
                { text: ttcFCFA.toLocaleString('fr-FR'), w: cols[3].w, align: 'right' as const },
                { text: ttcEUR.toLocaleString('fr-FR'), w: cols[4].w, align: 'right' as const },
            ]

            cx = ML
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(8)
            pdf.setTextColor(30, 30, 30)
            for (const cell of rowData) {
                if (cell.align === 'right') {
                    pdf.text(cell.text, cx + cell.w - 2, y + 6, { align: 'right' })
                } else if (cell.align === 'center') {
                    pdf.text(cell.text, cx + cell.w / 2, y + 6, { align: 'center' })
                } else {
                    const lines = pdf.splitTextToSize(cell.text, cell.w - 4)
                    pdf.text(lines[0], cx + 2, y + 6)
                }
                cx += cell.w
            }
            y += rowH
        })

        // Ligne basse du tableau
        pdf.setDrawColor(0, 135, 81)
        pdf.setLineWidth(0.6)
        pdf.line(ML, y, ML + CW, y)
        y += 8

        // ── TOTAUX ───────────────────────────────────────────────────────
        const totW = 110
        const totX = PW - MR - totW

        const drawTotRow = (label: string, fcfa: number, eur: number, bold = false, highlight = false) => {
            if (highlight) {
                pdf.setFillColor(0, 135, 81)
                pdf.rect(totX - 4, y - 1, totW + 4, 10, 'F')
                pdf.setTextColor(255, 255, 255)
            } else {
                pdf.setTextColor(40, 40, 40)
            }
            pdf.setFont('helvetica', bold ? 'bold' : 'normal')
            pdf.setFontSize(bold ? 9 : 8)
            pdf.text(label, totX, y + 6)
            pdf.text(`${fcfa.toLocaleString('fr-FR')} FCFA`, PW - MR - 28, y + 6, { align: 'right' })
            pdf.text(`${eur.toLocaleString('fr-FR')} €`, PW - MR, y + 6, { align: 'right' })
            y += 10
        }

        drawTotRow('Sous-total HT :', totalHT_XOF, totalHT_EUR)
        drawTotRow('TVA 18 % :', tva_XOF, tva_EUR)
        pdf.setDrawColor(180, 180, 180)
        pdf.setLineWidth(0.4)
        pdf.line(totX - 4, y - 2, PW - MR, y - 2)
        drawTotRow('TOTAL TTC :', totalTTC_XOF, totalTTC_EUR, true, true)

        y += 6

        // ── TEXTE LÉGAL ──────────────────────────────────────────────────
        const montantLettre = toWordsFr(totalTTC_XOF)
        const montantEurLettres = toWordsFr(totalTTC_EUR)
        const legalText = pdf.splitTextToSize(
            `Arrêté le présent devis à la somme de ${montantLettre} (${totalTTC_XOF.toLocaleString('fr-FR')}) Francs CFA TTC, soit ${montantEurLettres} (${totalTTC_EUR.toLocaleString('fr-FR')}) Euros TTC.`,
            CW - 4
        )

        pdf.setFillColor(248, 248, 248)
        pdf.setDrawColor(200, 200, 200)
        pdf.setLineWidth(0.3)
        const legalH = legalText.length * 5 + 10
        pdf.roundedRect(ML, y, CW, legalH, 2, 2, 'FD')
        pdf.setFont('helvetica', 'italic')
        pdf.setFontSize(8)
        pdf.setTextColor(60, 60, 60)
        pdf.text(legalText, ML + 4, y + 7)
        y += legalH + 8

        // ── BLOC SIGNATURE ───────────────────────────────────────────────
        if (y + 30 < PH - 25) {
            const sigW = (CW - 8) / 2

            // Gauche — Pour approbation client
            pdf.setFillColor(248, 248, 255)
            pdf.setDrawColor(180, 180, 220)
            pdf.setLineWidth(0.3)
            pdf.roundedRect(ML, y, sigW, 28, 2, 2, 'FD')
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(7.5)
            pdf.setTextColor(80, 80, 140)
            pdf.text('Pour approbation :', ML + 4, y + 8)
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7)
            pdf.setTextColor(100, 100, 120)
            pdf.text('Signature & Cachet du client :', ML + 4, y + 15)
            pdf.text('Date :  ____/____/________', ML + 4, y + 22)

            // Droite — Signature RG
            const sig2X = ML + sigW + 8
            pdf.setFillColor(240, 255, 245)
            pdf.setDrawColor(0, 135, 81)
            pdf.setLineWidth(0.3)
            pdf.roundedRect(sig2X, y, sigW, 28, 2, 2, 'FD')
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(7.5)
            pdf.setTextColor(0, 100, 60)
            pdf.text('La Présidente Directrice Générale', sig2X + 4, y + 8)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(7)
            pdf.setTextColor(0, 135, 81)
            pdf.text('RETOUR GAGNANT BÉNIN', sig2X + 4, y + 14)
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(6.5)
            pdf.setTextColor(80, 120, 90)
            pdf.text(`Établi le ${dateFr(p.created_at)}`, sig2X + 4, y + 22)
        }

        // ── FOOTER ───────────────────────────────────────────────────────
        pdf.setFillColor(20, 40, 30)
        pdf.rect(0, PH - 18, PW, 18, 'F')

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        pdf.setTextColor(180, 220, 190)
        pdf.text('Haie-Vive Cocotiers, Carré n°1158, Cotonou — République du Bénin', PW / 2, PH - 13, { align: 'center' })

        pdf.setTextColor(252, 209, 22)
        pdf.text('+229 01 94 35 50 50  /  +229 01 60 32 21 21  /  +596 696 85 36 14', PW / 2, PH - 9, { align: 'center' })

        pdf.setTextColor(150, 200, 165)
        pdf.text('IFU : 3202644573981   |   RCCM : RB/COT/26 B 42001   |   contact@retourgagnantbenin.bj', PW / 2, PH - 4.5, { align: 'center' })

        // ── OUTPUT ───────────────────────────────────────────────────────
        const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
        const filename = `DEVIS-${p.client_name.replace(/\s+/g, '-').toUpperCase()}-${new Date(p.created_at).getFullYear()}.pdf`

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (err) {
        console.error('Devis PDF error:', err)
        return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 })
    }
}

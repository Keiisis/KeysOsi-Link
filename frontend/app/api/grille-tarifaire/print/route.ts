import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 503 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Fetch settings (grilles_tarifaires)
        const { data: settingsData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'grilles_tarifaires')
            .maybeSingle()

        // 2. Fetch signature details
        const { data: templateData } = await supabase
            .from('document_templates')
            .select('content')
            .eq('id', 'official_devis_facture')
            .maybeSingle()

        const tpl = templateData?.content || {}
        const presidentName = tpl.signature_name || 'N. R. G'

        // Default layout data if settings are empty
        const defaultGrids = [
            {
                id: 'documents-identite',
                title: 'DOCUMENTS & IDENTITÉ',
                rows: [
                    { no: '1', service: 'Acte de naissance béninois (sécurisé)', unit: 'Par document', price: '15 000 FCFA / 23 €', delay: '72h' },
                    { no: '2', service: 'Passeport Biométrique Béninois', unit: 'Par demande', price: '75 000 FCFA / 115 €', delay: '10 à 15 jours' },
                    { no: '3', service: 'Carte Nationale d\'Identité (CNIB)', unit: 'Par demande', price: '30 000 FCFA / 46 €', delay: '5 à 7 jours' },
                    { no: '4', service: 'Certificat d\'Identification Personnelle (CIP)', unit: 'Par document', price: '10 000 FCFA / 15 €', delay: '48h' },
                    { no: '5', service: 'Casier Judiciaire Béninois', unit: 'Par document', price: '12 000 FCFA / 18 €', delay: '72h' }
                ]
            }
        ]

        let grids = defaultGrids
        if (settingsData?.value) {
            try {
                grids = JSON.parse(settingsData.value)
            } catch (e) {
                console.error('Error parsing grilles_tarifaires settings:', e)
            }
        }

        // Filter if gridId is provided
        const url = new URL(request.url)
        const gridId = url.searchParams.get('gridId')
        if (gridId) {
            grids = grids.filter(g => g.id === gridId)
        }

        if (grids.length === 0) {
            return new NextResponse('Aucune grille tarifaire trouvée.', { status: 404 })
        }

        // 3. Read image assets from filesystem for clean rendering
        let logoBase64 = ''
        try {
            const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-transparent.png')
            if (fs.existsSync(logoPath)) {
                const buffer = fs.readFileSync(logoPath)
                logoBase64 = `data:image/png;base64,${buffer.toString('base64')}`
            }
        } catch (err) {
            console.error('Failed to read transparent logo:', err)
        }

        let stampBase64 = ''
        try {
            const stampPath = path.join(process.cwd(), 'public', 'images', 'cachet-PDG.png')
            if (fs.existsSync(stampPath)) {
                const buffer = fs.readFileSync(stampPath)
                stampBase64 = `data:image/png;base64,${buffer.toString('base64')}`
            }
        } catch (err) {
            console.error('Failed to read stamp:', err)
        }

        const date = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric',
        })

        // Helper for special chars formatting in jsPDF
        const safe = (txt: string) => {
            if (!txt) return ''
            return txt
                .replace(/—/g, '-')
                .replace(/–/g, '-')
                .replace(/’/g, "'")
                .normalize("NFD").replace(/[\u0300-\u036f]/g, (match) => {
                    const map: Record<string, string> = { 'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'î': 'i', 'ï': 'i', 'ô': 'o', 'û': 'u', 'ç': 'c', 'É': 'E' }
                    return map[match] || match
                })
        }

        // 4. Generate PDF using jsPDF
        const pdf = new jsPDF('p', 'mm', 'a4')
        const PW = 210
        const PH = 297
        const ML = 15
        const MR = 15
        const CW = PW - ML - MR

        grids.forEach((grid, idx) => {
            if (idx > 0) {
                pdf.addPage()
            }

            const gridRef = `GRI-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${grid.id.toUpperCase().slice(0, 8)}`

            // ── DRAPEAU BÉNIN ──
            pdf.setFillColor(0, 135, 81)
            pdf.rect(0, 0, PW / 3, 3.5, 'F')
            pdf.setFillColor(252, 209, 22)
            pdf.rect(PW / 3, 0, PW / 3, 3.5, 'F')
            pdf.setFillColor(232, 17, 45)
            pdf.rect((PW * 2) / 3, 0, PW / 3, 3.5, 'F')

            // ── LOGO (sans background, libre et bien gros) ──
            const logoSize = 25
            if (logoBase64) {
                try {
                    pdf.addImage(logoBase64, 'PNG', ML, 9, logoSize, logoSize)
                } catch (e) {
                    console.error('Logo render error:', e)
                }
            }

            // ── BRAND TEXTS ──
            const textStartX = ML + logoSize + 5
            const nameY = 16

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(16)
            pdf.setTextColor(0, 135, 81)
            pdf.text('RETOUR ', textStartX, nameY)
            pdf.setTextColor(232, 17, 45)
            pdf.text('GAGNANT', textStartX + pdf.getTextWidth('RETOUR '), nameY)

            pdf.setFontSize(8)
            pdf.setTextColor(0, 0, 0)
            pdf.text('Bénin', textStartX, nameY + 4.5)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(7.5)
            pdf.setTextColor(0, 0, 0)
            pdf.text('L\'agence d\'accompagnement à la Nationalité Béninoise et au retour des Afro-descendants.', textStartX, nameY + 9)

            // ── TYPE DOCUMENT (droite) ──
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(15)
            pdf.setTextColor(0, 135, 81)
            pdf.text('GRILLES TARIFAIRES', PW - MR, 14, { align: 'right' })

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(10.5)
            pdf.setTextColor(232, 17, 45)
            pdf.text(safe(grid.title), PW - MR, 19, { align: 'right' })

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(8.5)
            pdf.setTextColor(0, 0, 0)
            pdf.text(`Réf. : ${gridRef}`, PW - MR, 24, { align: 'right' })
            pdf.text(`Cotonou, le ${safe(date)}`, PW - MR, 28, { align: 'right' })

            // Separator Line
            pdf.setDrawColor(0, 135, 81)
            pdf.setLineWidth(0.8)
            pdf.line(ML, 37, PW - MR, 37)

            let y = 45

            // ── COPYWRITTEN INTRO TEXT ──
            const introText = `Retour Gagnant Bénin est le partenaire stratégique de référence dédié à la réussite absolue de votre retour et de votre établissement au Bénin. De l'acquisition rigoureuse de votre nationalité béninoise à la sécurisation de vos projets de vie et d'investissement, notre agence déploie une expertise d'excellence pour chacun de vos besoins administratifs et juridiques. C'est avec le plus haut niveau d'engagement que nous vous présentons ci-dessous la grille tarifaire officielle de nos prestations pour le pôle ${grid.title}.`
            const introLines = pdf.splitTextToSize(safe(introText), CW)

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(9)
            pdf.setTextColor(0, 0, 0)
            introLines.forEach((line: string) => {
                pdf.text(line, ML, y)
                y += 5.2
            })
            y += 4

            // ── TABLE HEADER ──
            const cols = [
                { label: 'N°', w: 15, align: 'center' as const },
                { label: 'Service / Prestation', w: 90, align: 'left' as const },
                { label: 'Unité', w: 25, align: 'center' as const },
                { label: 'Tarif (FCFA/EUR)', w: 32, align: 'right' as const },
                { label: 'Délai', w: 18, align: 'center' as const }
            ]

            pdf.setFillColor(0, 135, 81)
            pdf.rect(ML, y, CW, 10, 'F')

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(8.5)
            pdf.setTextColor(255, 255, 255)

            let cx = ML
            cols.forEach(col => {
                if (col.align === 'center') {
                    pdf.text(safe(col.label), cx + col.w / 2, y + 6.5, { align: 'center' })
                } else if (col.align === 'right') {
                    pdf.text(safe(col.label), cx + col.w - 2, y + 6.5, { align: 'right' })
                } else {
                    pdf.text(safe(col.label), cx + 2, y + 6.5)
                }
                cx += col.w
            })
            y += 10

            // ── TABLE ROWS ──
            grid.rows.forEach((row: any, rIdx: number) => {
                const serviceLines = pdf.splitTextToSize(safe(row.service), 86)
                const rowH = Math.max(9, 4 + serviceLines.length * 4.2)

                // Background zebra
                if (rIdx % 2 === 1) {
                    pdf.setFillColor(248, 250, 252)
                    pdf.rect(ML, y, CW, rowH, 'F')
                }

                // Row bottom border
                pdf.setDrawColor(0, 0, 0)
                pdf.setLineWidth(0.3)
                pdf.line(ML, y + rowH, ML + CW, y + rowH)

                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(8.5)
                pdf.setTextColor(0, 0, 0)

                // N°
                pdf.text(safe(row.no), ML + 7.5, y + rowH / 2 + 1.2, { align: 'center' })

                // Service
                serviceLines.forEach((line: string, liIdx: number) => {
                    pdf.text(line, ML + 15 + 2, y + 4.2 + liIdx * 4.2)
                })

                // Unit
                pdf.text(safe(row.unit), ML + 15 + 90 + 12.5, y + rowH / 2 + 1.2, { align: 'center' })

                // Tarif
                pdf.setTextColor(0, 135, 81)
                pdf.text(safe(row.price), ML + 15 + 90 + 25 + 30, y + rowH / 2 + 1.2, { align: 'right' })

                // Delay
                pdf.setTextColor(0, 0, 0)
                pdf.text(safe(row.delay), ML + 15 + 90 + 25 + 32 + 9, y + rowH / 2 + 1.2, { align: 'center' })

                y += rowH
            })

            // Double border table bottom
            pdf.setDrawColor(0, 135, 81)
            pdf.setLineWidth(0.8)
            pdf.line(ML, y, ML + CW, y)

            // ── SIGNATURE ZONE (Forcée vers le bas de la page A4) ──
            const sigY = PH - 69
            const sigW = 90
            const sigX = PW - MR - sigW

            pdf.setFillColor(240, 255, 245)
            pdf.setDrawColor(0, 135, 81)
            pdf.setLineWidth(0.6)
            pdf.roundedRect(sigX, sigY, sigW, 43, 2.5, 2.5, 'FD')

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(10.5)
            pdf.setTextColor(0, 107, 64)
            pdf.text('DIRECTION GENERALE', sigX + 5, sigY + 8)

            pdf.setFontSize(9)
            pdf.setTextColor(0, 135, 81)
            pdf.text('RETOUR GAGNANT BENIN', sigX + 5, sigY + 13)

            pdf.setFontSize(8.5)
            pdf.setTextColor(0, 0, 0)
            pdf.text('La Presidente Directrice Generale :', sigX + 5, sigY + 18)

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(11)
            pdf.setTextColor(0, 135, 81)
            pdf.text(safe(presidentName), sigX + 5, sigY + 24)

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(8)
            pdf.setTextColor(0, 0, 0)
            pdf.text(`Fait a Cotonou, Le ${safe(date)}`, sigX + 5, sigY + 31)

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(8)
            pdf.setTextColor(0, 135, 81)
            pdf.text('VALIDITE OFFICIELLE GARANTIE', sigX + 5, sigY + 37)

            // Cachet PDG agrandi x4 (width/height 68x68 mm)
            if (stampBase64) {
                try {
                    pdf.addImage(stampBase64, 'PNG', sigX + sigW - 68, sigY - 12, 68, 68)
                } catch (e) {
                    console.error('Stamp render error:', e)
                }
            }

            // ── FOOTER BLANC SÉCURISÉ (Forcé en bas absolu) ──
            pdf.setFillColor(255, 255, 255)
            pdf.rect(0, PH - 21, PW, 21, 'F')

            pdf.setDrawColor(221, 227, 238)
            pdf.setLineWidth(0.4)
            pdf.line(ML, PH - 21, PW - MR, PH - 21)

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(7.5)
            pdf.setTextColor(0, 0, 0)
            pdf.text(
                'RETOUR GAGNANT BENIN - RCCM: RB/COT/26 B 42001 - IFU: 3202644573981 - Haie-Vive Cocotiers, Cotonou - contact@retourgagnantbenin.bj',
                PW / 2,
                PH - 12,
                { align: 'center' }
            )
            pdf.setFontSize(7)
            pdf.text(
                `Document N° ${gridRef} - Genere le ${new Date().toLocaleDateString('fr-FR')}`,
                PW / 2,
                PH - 7,
                { align: 'center' }
            )
        })

        // ── OUTPUT PDF BUFFER DIRECTLY ──
        const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
        const filename = grids.length === 1
            ? `GRILLE-TARIFAIRE-${grids[0].title.replace(/\s+/g, '-').toUpperCase()}.pdf`
            : `GRILLES-TARIFAIRES-COMPLETES.pdf`

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (err) {
        console.error('Grille print error:', err)
        return new NextResponse('Erreur lors de la generation de la grille tarifaire.', { status: 500 })
    }
}

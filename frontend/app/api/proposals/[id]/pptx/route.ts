import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import pptxgen from 'pptxgenjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Couleurs Bénin
const C = {
    green: '008751',
    yellow: 'FCD116',
    red: 'E8112D',
    dark: '050D1A',
    dark2: '0A1628',
    white: 'FFFFFF',
    gray: '8899AA',
    grayLight: 'B0BEC5',
}

const CATEGORY_COLORS: Record<string, string> = {
    hotel:      '0A1E38',
    restaurant: '1A0D00',
    activity:   '0A1A00',
    transport:  '100820',
    hero:       '020C18',
    pricing:    '010D05',
}

const CATEGORY_ACCENT: Record<string, string> = {
    hotel:      '38BDF8',
    restaurant: 'FB923C',
    activity:   '34D399',
    transport:  'A78BFA',
    hero:       C.yellow,
    pricing:    C.green,
}

const CATEGORY_LABEL: Record<string, string> = {
    hotel:      '🏨  Hébergement',
    restaurant: '🍽️  Restaurant',
    activity:   '🎯  Activité & Visite',
    transport:  '🚗  Transport',
}

function emo(type: string): string {
    return { hotel: '🏨', restaurant: '🍽️', activity: '🎯', transport: '🚗' }[type] ?? '✦'
}

interface ProposalRow {
    id: string
    client_name: string
    client_email: string | null
    destination: string
    total_amount: number
    currency?: string
    start_date?: string | null
    end_date?: string | null
    created_at: string
}

interface ItemRow {
    type: string
    title: string
    subtitle?: string
    description: string | null
    location?: string | null
    highlights?: string[]
    image_url: string | null
    original_price: number
    selling_price: number
    order_index: number
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: proposal, error: pe } = await supabase
            .from('ai_client_proposals')
            .select('id, client_name, client_email, destination, total_amount, currency, start_date, end_date, created_at')
            .eq('id', id)
            .single()

        if (pe || !proposal) {
            return NextResponse.json({ error: 'Proposition introuvable' }, { status: 404 })
        }

        const { data: rawItems } = await supabase
            .from('ai_proposal_items')
            .select('*')
            .eq('proposal_id', id)
            .order('order_index', { ascending: true })

        const p = proposal as ProposalRow
        const items: ItemRow[] = (rawItems || []) as ItemRow[]
        const billable = items.filter(i => i.type !== 'hero' && i.type !== 'pricing' && i.selling_price > 0)
        const currency = p.currency || 'FCFA'

        // ─── Générer le PPTX ────────────────────────────
        const pptx = new pptxgen()
        pptx.author = 'Retour Gagnant Bénin'
        pptx.company = 'Retour Gagnant Bénin'
        pptx.title = `Voyage ${p.destination} — ${p.client_name}`
        pptx.layout = 'LAYOUT_WIDE' // 16:9

        // Helpers
        const addBg = (slide: pptxgen.Slide, color: string) => {
            slide.background = { color }
        }

        const addTopBar = (slide: pptxgen.Slide, label: string, accentColor: string) => {
            // Barre supérieure colorée
            slide.addShape(pptxgen.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: accentColor },
                line: { color: accentColor, width: 0 },
            })
            // Badge catégorie
            slide.addText(label, {
                x: 0.4, y: 0.18, w: 4, h: 0.35,
                fontSize: 10, bold: true,
                color: accentColor,
                fontFace: 'Calibri',
            })
        }

        const addBottomBar = (slide: pptxgen.Slide) => {
            slide.addShape(pptxgen.ShapeType.rect, {
                x: 0, y: 5.2, w: '100%', h: 0.3,
                fill: { color: '00000044' },
                line: { color: '00000000', width: 0 },
            })
            slide.addText('Retour Gagnant Bénin  ·  +229 01 60 32 21 21  ·  retourgagnantbenin.bj', {
                x: 0, y: 5.22, w: '100%', h: 0.26,
                fontSize: 8, color: C.grayLight,
                align: 'center', fontFace: 'Calibri',
            })
        }

        // ═══════════════════════════════════════════════════════
        // SLIDE HERO
        // ═══════════════════════════════════════════════════════
        {
            const slide = pptx.addSlide()
            addBg(slide, C.dark)

            // Barre tricolore Bénin (3 bandes)
            slide.addShape(pptxgen.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.12, fill: { color: C.green }, line: { width: 0 } })
            slide.addShape(pptxgen.ShapeType.rect, { x: 0, y: 0.12, w: '100%', h: 0.12, fill: { color: C.yellow }, line: { width: 0 } })
            slide.addShape(pptxgen.ShapeType.rect, { x: 0, y: 0.24, w: '100%', h: 0.12, fill: { color: C.red }, line: { width: 0 } })

            // Logo texte
            slide.addText('RETOUR  GAGNANT  BÉNIN', {
                x: 0, y: 0.55, w: '100%', h: 0.45,
                fontSize: 16, bold: true, color: C.yellow,
                align: 'center', fontFace: 'Calibri',
                charSpacing: 8,
            })

            // Ligne décorative
            slide.addShape(pptxgen.ShapeType.rect, {
                x: 3, y: 1.15, w: 4, h: 0.03,
                fill: { color: C.yellow + '60' }, line: { width: 0 },
            })

            // Titre destination
            slide.addText(p.destination.toUpperCase(), {
                x: 0, y: 1.3, w: '100%', h: 1.1,
                fontSize: 48, bold: true, color: C.white,
                align: 'center', fontFace: 'Calibri',
            })

            // "Préparé pour"
            slide.addText(`Proposition préparée pour  ${p.client_name}`, {
                x: 0, y: 2.5, w: '100%', h: 0.45,
                fontSize: 16, color: C.yellow,
                align: 'center', fontFace: 'Calibri', italic: true,
            })

            // Dates si disponibles
            if (p.start_date && p.end_date) {
                const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                slide.addText(`Du ${fmt(p.start_date)}  au  ${fmt(p.end_date)}`, {
                    x: 0, y: 3.05, w: '100%', h: 0.38,
                    fontSize: 13, color: C.grayLight,
                    align: 'center', fontFace: 'Calibri',
                })
            }

            // Stats (hôtels, activités, restaurants)
            const statItems = [
                { label: 'Hôtels', val: items.filter(i => i.type === 'hotel').length },
                { label: 'Activités', val: items.filter(i => i.type === 'activity').length },
                { label: 'Restaurants', val: items.filter(i => i.type === 'restaurant').length },
            ].filter(s => s.val > 0)

            if (statItems.length > 0) {
                const colW = 2.5
                const startX = (10 - statItems.length * colW) / 2
                statItems.forEach((s, i) => {
                    const x = startX + i * colW
                    slide.addShape(pptxgen.ShapeType.roundRect, {
                        x, y: 3.6, w: colW - 0.2, h: 0.7,
                        fill: { color: C.green + '30' },
                        line: { color: C.green, width: 1 },
                        rectRadius: 0.08,
                    })
                    slide.addText(`${s.val}  ${s.label}`, {
                        x, y: 3.6, w: colW - 0.2, h: 0.7,
                        fontSize: 14, bold: true, color: C.white,
                        align: 'center', fontFace: 'Calibri',
                    })
                })
            }

            // Total
            slide.addText(`Total : ${p.total_amount.toLocaleString('fr-FR')} ${currency}`, {
                x: 0, y: 4.5, w: '100%', h: 0.45,
                fontSize: 18, bold: true, color: C.yellow,
                align: 'center', fontFace: 'Calibri',
            })

            addBottomBar(slide)
        }

        // ═══════════════════════════════════════════════════════
        // SLIDES CONTENU (hotel, restaurant, activity, transport)
        // ═══════════════════════════════════════════════════════
        for (const item of items.filter(i => i.type !== 'hero' && i.type !== 'pricing')) {
            const slide = pptx.addSlide()
            const bg = CATEGORY_COLORS[item.type] || C.dark2
            const accent = CATEGORY_ACCENT[item.type] || C.yellow
            addBg(slide, bg)

            // Barre accent haut
            slide.addShape(pptxgen.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: accent }, line: { width: 0 },
            })

            // Badge catégorie
            const catLabel = CATEGORY_LABEL[item.type] || item.type
            slide.addText(catLabel, {
                x: 0.4, y: 0.18, w: 5, h: 0.35,
                fontSize: 11, bold: true, color: accent, fontFace: 'Calibri',
            })

            // Prix (haut droite)
            if (item.selling_price > 0) {
                slide.addShape(pptxgen.ShapeType.roundRect, {
                    x: 7.5, y: 0.12, w: 2.2, h: 0.45,
                    fill: { color: accent + '25' },
                    line: { color: accent, width: 1 },
                    rectRadius: 0.06,
                })
                slide.addText(`${item.selling_price.toLocaleString('fr-FR')} ${currency}`, {
                    x: 7.5, y: 0.12, w: 2.2, h: 0.45,
                    fontSize: 11, bold: true, color: accent,
                    align: 'center', fontFace: 'Calibri',
                })
            }

            // Location
            if (item.location) {
                slide.addText(`📍  ${item.location}`, {
                    x: 0.4, y: 0.6, w: 6, h: 0.3,
                    fontSize: 10, color: C.grayLight, fontFace: 'Calibri',
                })
            }

            // Titre
            slide.addText(item.title, {
                x: 0.4, y: 0.95, w: 9.2, h: 1.2,
                fontSize: 32, bold: true, color: C.white,
                fontFace: 'Calibri', wrap: true,
            })

            // Sous-titre
            if (item.subtitle) {
                slide.addText(item.subtitle, {
                    x: 0.4, y: 2.2, w: 9.2, h: 0.4,
                    fontSize: 14, color: accent, fontFace: 'Calibri', italic: true,
                })
            }

            // Description
            if (item.description) {
                slide.addText(item.description, {
                    x: 0.4, y: item.subtitle ? 2.65 : 2.2, w: 9.2, h: 0.85,
                    fontSize: 11, color: C.grayLight, fontFace: 'Calibri',
                    wrap: true,
                })
            }

            // Highlights
            const highlights = item.highlights || []
            if (highlights.length > 0) {
                const hY = item.description ? 3.65 : 3.1
                highlights.slice(0, 4).forEach((h, idx) => {
                    const x = 0.4 + (idx % 2) * 4.8
                    const y = hY + Math.floor(idx / 2) * 0.42
                    slide.addShape(pptxgen.ShapeType.roundRect, {
                        x, y, w: 4.5, h: 0.36,
                        fill: { color: accent + '18' },
                        line: { color: accent + '50', width: 0.5 },
                        rectRadius: 0.06,
                    })
                    slide.addText(`✦  ${h}`, {
                        x, y, w: 4.5, h: 0.36,
                        fontSize: 10, color: C.white, fontFace: 'Calibri',
                        inset: 0.12,
                    })
                })
            }

            addBottomBar(slide)
        }

        // ═══════════════════════════════════════════════════════
        // SLIDE PRICING (récapitulatif)
        // ═══════════════════════════════════════════════════════
        {
            const slide = pptx.addSlide()
            addBg(slide, CATEGORY_COLORS.pricing)

            // Barre verte
            slide.addShape(pptxgen.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: C.green }, line: { width: 0 },
            })

            // Titre
            slide.addText('RÉCAPITULATIF DU DEVIS', {
                x: 0, y: 0.2, w: '100%', h: 0.55,
                fontSize: 22, bold: true, color: C.yellow,
                align: 'center', fontFace: 'Calibri', charSpacing: 4,
            })

            // En-tête tableau
            const tY = 0.9
            const colX = [0.4, 1.2, 7.2, 8.6]
            slide.addShape(pptxgen.ShapeType.rect, {
                x: 0.4, y: tY, w: 9.2, h: 0.38,
                fill: { color: C.green + '40' }, line: { width: 0 },
            })
            ;[['', 'Prestation'], ['', 'Montant']].forEach((_, i) => void i)
            slide.addText('Prestation', {
                x: colX[1], y: tY, w: 5.5, h: 0.38,
                fontSize: 10, bold: true, color: C.yellow, fontFace: 'Calibri',
            })
            slide.addText('Prix', {
                x: colX[2], y: tY, w: 1.8, h: 0.38,
                fontSize: 10, bold: true, color: C.yellow,
                align: 'right', fontFace: 'Calibri',
            })

            // Lignes items
            billable.slice(0, 10).forEach((item, idx) => {
                const rowY = tY + 0.38 + idx * 0.38
                if (idx % 2 === 0) {
                    slide.addShape(pptxgen.ShapeType.rect, {
                        x: 0.4, y: rowY, w: 9.2, h: 0.38,
                        fill: { color: 'FFFFFF08' }, line: { width: 0 },
                    })
                }
                slide.addText(emo(item.type), {
                    x: colX[0], y: rowY, w: 0.7, h: 0.38,
                    fontSize: 14, align: 'center', fontFace: 'Calibri',
                })
                slide.addText(item.title, {
                    x: colX[1], y: rowY, w: 5.5, h: 0.38,
                    fontSize: 10, color: C.white, fontFace: 'Calibri',
                })
                slide.addText(`${item.selling_price.toLocaleString('fr-FR')} ${currency}`, {
                    x: colX[2], y: rowY, w: 1.8, h: 0.38,
                    fontSize: 10, color: C.grayLight,
                    align: 'right', fontFace: 'Calibri',
                })
            })

            // Ligne total
            const totalY = tY + 0.38 + Math.min(billable.length, 10) * 0.38 + 0.15
            slide.addShape(pptxgen.ShapeType.rect, {
                x: 0.4, y: totalY, w: 9.2, h: 0.5,
                fill: { color: C.green + '30' },
                line: { color: C.green, width: 1 },
            })
            slide.addText('TOTAL', {
                x: 0.4, y: totalY, w: 6.5, h: 0.5,
                fontSize: 14, bold: true, color: C.white, fontFace: 'Calibri',
                inset: 0.15,
            })
            slide.addText(`${p.total_amount.toLocaleString('fr-FR')} ${currency}`, {
                x: 7.1, y: totalY, w: 2.3, h: 0.5,
                fontSize: 14, bold: true, color: C.yellow,
                align: 'right', fontFace: 'Calibri', inset: 0.15,
            })

            // Contacts
            const contactY = Math.min(totalY + 0.75, 4.7)
            slide.addText('Pour finaliser votre réservation :', {
                x: 0, y: contactY, w: '100%', h: 0.3,
                fontSize: 10, color: C.grayLight, align: 'center', fontFace: 'Calibri',
            })
            slide.addText('+229 01 60 32 21 21  ·  contact@retourgagnantbenin.bj  ·  www.retourgagnantbenin.bj', {
                x: 0, y: contactY + 0.3, w: '100%', h: 0.35,
                fontSize: 11, bold: true, color: C.yellow, align: 'center', fontFace: 'Calibri',
            })

            addBottomBar(slide)
        }

        // ─── Retourner le buffer .pptx ────────────────────────
        const buf = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
        const safeName = p.client_name.replace(/[^a-zA-Z0-9-]/g, '_')
        const mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

        // Copier dans un Uint8Array plain (ArrayBuffer garanti) pour satisfaire BodyInit
        const blob = new Blob([new Uint8Array(buf)], { type: mimeType })

        return new NextResponse(blob, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="Voyage-${p.destination}-${safeName}.pptx"`,
            },
        })

    } catch (err) {
        console.error('Erreur PPTX:', err)
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur interne' }, { status: 500 })
    }
}

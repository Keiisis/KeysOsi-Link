'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Script from 'next/script'
import { 
    CheckCircle2, FileText, Receipt, Download, Loader2, 
    PenTool, ShieldCheck, Mail, Phone, Calendar, ArrowRight,
    CreditCard, X
} from 'lucide-react'
import { LOGO_BASE64 } from '@/lib/logoBase64'

interface DocumentFinancier {
    id: string
    type: 'devis' | 'facture'
    numero: string
    client_nom: string
    client_prenom: string
    client_email: string
    client_phone: string
    client_adresse: string
    items: any[]
    currency: string
    sous_total: number
    total_tva: number
    remise: number
    total: number
    status: string
    notes: string
    conditions: string
    validite: string
    created_at: string
    signature_url?: string
}

export default function ClientPortalPage() {
    const params = useParams()
    const id = params?.id as string
    
    const [doc, setDoc] = useState<DocumentFinancier | null>(null)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [signing, setSigning] = useState(false)
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState('')

    // Canvas Refs for Signature
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)

    useEffect(() => {
        const fetchDoc = async () => {
            if (!id) return
            const { data, error } = await supabase
                .from('documents_financiers')
                .select('*')
                .eq('id', id)
                .single()
                
            if (error || !data) {
                setError("Document introuvable ou lien invalide.")
            } else {
                setDoc(data as DocumentFinancier)
                if (data.signature_url) setSignatureUrl(data.signature_url)
            }
            setLoading(false)
        }
        fetchDoc()
    }, [id])

    // ─── Signature Logic ──────────────────────────────────────────
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true)
        draw(e)
    }

    const endDrawing = () => {
        setIsDrawing(false)
        const canvas = canvasRef.current
        if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) ctx.beginPath()
        }
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        let x = 0
        let y = 0
        
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left
            y = e.touches[0].clientY - rect.top
        } else {
            x = (e as React.MouseEvent).clientX - rect.left
            y = (e as React.MouseEvent).clientY - rect.top
        }

        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#00af64' // Emerald color

        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const clearSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    const saveSignature = async () => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        // Vérifier si le canvas est vide (très basique)
        const ctx = canvas.getContext('2d')
        const pixelBuffer = new Uint32Array(ctx!.getImageData(0, 0, canvas.width, canvas.height).data.buffer)
        const isCanvasBlank = !pixelBuffer.some(color => color !== 0)
        
        if (isCanvasBlank) {
            alert("Veuillez apposer votre signature avant de valider.")
            return
        }

        setIsProcessing(true)
        const dataUrl = canvas.toDataURL('image/png')
        
        // Mettre à jour la BDD
        const { error } = await supabase
            .from('documents_financiers')
            .update({ 
                status: 'accepte', 
                signature_url: dataUrl,
                signed_at: new Date().toISOString()
            })
            .eq('id', id)

        if (!error && doc) {
            setSignatureUrl(dataUrl)
            setDoc(prev => prev ? { ...prev, status: 'accepte' } : null)
            setSigning(false)

            // AUTOMATISATION ERP (Tueur de Odoo) :
            // Créer instantanément la Facture liée au Devis
            const numeroFacture = `FAC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
            
            await supabase.from('documents_financiers').insert({
                type: 'facture',
                numero: numeroFacture,
                parent_devis_id: id,
                client_nom: doc.client_nom,
                client_prenom: doc.client_prenom,
                client_email: doc.client_email,
                client_phone: doc.client_phone,
                client_adresse: doc.client_adresse,
                items: doc.items,
                currency: doc.currency,
                sous_total: doc.sous_total,
                total_tva: doc.total_tva,
                remise: doc.remise,
                total: doc.total,
                status: 'envoye', // La facture attend le paiement
                notes: 'Facture générée automatiquement suite à la validation du devis.',
                conditions: doc.conditions,
                validite: 'A réception',
            })
            
            alert("Devis signé avec succès ! Une facture vient d'être générée pour votre paiement.")
        } else {
            alert("Erreur lors de la sauvegarde.")
        }
        setIsProcessing(false)
    }

    // ─── Paiement FedaPay Logic ────────────────────────────────────
    const processPayment = () => {
        if (!doc) return
        
        // Vérifier si FedaPay est chargé via le script
        if (typeof window !== 'undefined' && (window as any).FedaPay) {
            (window as any).FedaPay.init({
                public_key: process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY || 'pk_live_XXXXX', // Remplacer par la vraie clé
                transaction: {
                    amount: doc.total,
                    description: `Paiement ${doc.type === 'facture' ? 'Facture' : 'Devis'} N° ${doc.numero}`,
                    currency: doc.currency || 'XOF'
                },
                customer: {
                    email: doc.client_email,
                    lastname: doc.client_nom,
                    firstname: doc.client_prenom || 'Client'
                },
                onComplete: async function(resp: any) {
                    const reason = resp.reason;
                    if (reason === 'checkout complete') {
                        setIsProcessing(true)
                        // Mettre à jour le statut en base de données
                        await supabase
                            .from('documents_financiers')
                            .update({ 
                                status: 'paye',
                                payment_method: 'FedaPay'
                            })
                            .eq('id', id)
                            
                        setDoc(prev => prev ? { ...prev, status: 'paye' } : null)
                        setIsProcessing(false)
                        alert("Paiement confirmé ! Merci de votre confiance.")
                    }
                }
            }).open()
        } else {
            alert("Le système de paiement est en cours d'initialisation, veuillez patienter ou rafraîchir la page.")
        }
    }


    const generatePDF = async () => {
        if (!doc) return
        setGenerating(true)
        try {
            const jsPDF = (await import('jspdf')).default
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pw = 210
            const ph = 297
            const ml = 14
            const mr = 14
            const cw = pw - ml - mr 

            // ── BENIN FLAG STRIPE ──────────────────────────────────
            pdf.setFillColor(0, 135, 81)
            pdf.rect(0, 0, pw / 3, 4, 'F')
            pdf.setFillColor(252, 209, 22)
            pdf.rect(pw / 3, 0, pw / 3, 4, 'F')
            pdf.setFillColor(232, 17, 45)
            pdf.rect((pw * 2) / 3, 0, pw / 3, 4, 'F')

            // ── DARK HEADER ────────────────────────────────────────
            pdf.setFillColor(10, 16, 24)
            pdf.rect(0, 4, pw, 50, 'F')

            try {
                pdf.addImage(LOGO_BASE64, 'JPEG', ml, 10, 16, 16)
            } catch (e) {
                console.error('Erreur ajout logo:', e)
            }

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(22)
            pdf.setTextColor(0, 185, 100)
            pdf.text('RETOUR GAGNANT', ml + 20, 20)

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7.5)
            pdf.setTextColor(140, 160, 180)
            pdf.text('BÉNIN', ml + 20, 25)

            pdf.setFontSize(7)
            pdf.setTextColor(100, 120, 140)
            pdf.text('Agence de Conciergerie & Services Internationaux', ml + 20, 31)
            pdf.text('Avenue de la Marina, Cotonou — République du Bénin', ml + 20, 36)
            pdf.text('contact@retourgagnantbenin.bj  |  www.retourgagnantbenin.bj', ml + 20, 41)
            pdf.text('+229 01 94 35 50 50  |  +229 01 60 32 21 21', ml + 20, 46)

            const typeLabel = doc.type === 'devis' ? 'DEVIS' : 'FACTURE'
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(30)
            if (doc.type === 'devis') {
                pdf.setTextColor(252, 209, 22)
            } else {
                pdf.setTextColor(0, 185, 100)
            }
            pdf.text(typeLabel, pw - mr, 24, { align: 'right' })

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(9)
            pdf.setTextColor(160, 175, 190)
            pdf.text(`N° ${doc.numero}`, pw - mr, 32, { align: 'right' })
            pdf.text(`Date : ${new Date(doc.created_at).toLocaleDateString('fr-FR')}`, pw - mr, 38, { align: 'right' })
            pdf.text(doc.type === 'facture' ? `Délai : ${doc.validite}` : `Validité : ${doc.validite}`, pw - mr, 44, { align: 'right' })

            const statusColorMap: Record<string, [number, number, number]> = {
                brouillon: [90, 90, 90],
                envoye: [59, 130, 246],
                accepte: [0, 175, 100],
                refuse: [230, 60, 60],
                paye: [16, 200, 120],
                en_retard: [230, 60, 60],
                annule: [90, 90, 90],
            }
            const sc = statusColorMap[doc.status] || [90, 90, 90]
            pdf.setFillColor(sc[0], sc[1], sc[2])
            pdf.roundedRect(pw - mr - 26, 47, 26, 6, 1.5, 1.5, 'F')
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(6)
            pdf.setTextColor(255, 255, 255)
            const statusLabels: Record<string, string> = { brouillon: 'BROUILLON', envoye: 'ENVOYÉ', accepte: 'ACCEPTÉ', refuse: 'REFUSÉ', paye: 'PAYÉ', en_retard: 'EN RETARD', annule: 'ANNULÉ' }
            pdf.text(statusLabels[doc.status] || doc.status.toUpperCase(), pw - mr - 13, 51.3, { align: 'center' })

            let y = 64
            const boxW = (cw - 6) / 2
            const boxH = 42

            pdf.setFillColor(18, 28, 42)
            pdf.setDrawColor(40, 60, 90)
            pdf.setLineWidth(0.4)
            pdf.roundedRect(ml, y, boxW, boxH, 2, 2, 'FD')

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(6.5)
            pdf.setTextColor(80, 120, 180)
            pdf.text('ÉMETTEUR', ml + 4, y + 7)

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(9.5)
            pdf.setTextColor(220, 230, 245)
            pdf.text('RETOUR GAGNANT BÉNIN', ml + 4, y + 15)

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7.5)
            pdf.setTextColor(140, 160, 185)
            pdf.text('RCCM : RB/COT/26 B 42001', ml + 4, y + 22)
            pdf.text('IFU : 3202644573981', ml + 4, y + 27.5)
            pdf.text('Avenue de la Marina, Cotonou, Bénin', ml + 4, y + 33)
            pdf.text('contact@retourgagnantbenin.bj', ml + 4, y + 38.5)

            const toX = ml + boxW + 6
            pdf.setFillColor(248, 250, 255)
            pdf.setDrawColor(200, 215, 240)
            pdf.roundedRect(toX, y, boxW, boxH, 2, 2, 'FD')

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(6.5)
            pdf.setTextColor(100, 110, 160)
            pdf.text('DESTINATAIRE', toX + 4, y + 7)

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(9.5)
            pdf.setTextColor(30, 40, 70)
            const clientFullName = `${doc.client_nom} ${doc.client_prenom}`.trim() || 'Client'
            pdf.text(clientFullName, toX + 4, y + 15)

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7.5)
            pdf.setTextColor(70, 80, 110)
            if (doc.client_email) pdf.text(doc.client_email, toX + 4, y + 22)
            if (doc.client_phone) pdf.text(doc.client_phone, toX + 4, y + 27.5)
            if (doc.client_adresse) {
                const addrLines = pdf.splitTextToSize(doc.client_adresse, boxW - 8)
                addrLines.slice(0, 2).forEach((line: string, li: number) => {
                    pdf.text(line, toX + 4, y + 33 + li * 5.5)
                })
            }

            y += boxH + 10
            const cols = [
                { header: 'DESCRIPTION DU SERVICE', w: 68, align: 'left' as const },
                { header: 'QTÉ', w: 14, align: 'center' as const },
                { header: 'PU HT (XOF)', w: 28, align: 'right' as const },
                { header: 'TVA %', w: 15, align: 'center' as const },
                { header: 'TVA MNT', w: 22, align: 'right' as const },
                { header: 'TOTAL HT', w: 35, align: 'right' as const },
            ]

            pdf.setFillColor(10, 16, 24)
            pdf.rect(ml, y, cw, 10, 'F')

            let colX = ml
            cols.forEach(col => {
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(6.5)
                pdf.setTextColor(200, 215, 230)
                if (col.align === 'right') {
                    pdf.text(col.header, colX + col.w - 2, y + 6.5, { align: 'right' })
                } else if (col.align === 'center') {
                    pdf.text(col.header, colX + col.w / 2, y + 6.5, { align: 'center' })
                } else {
                    pdf.text(col.header, colX + 3, y + 6.5)
                }
                colX += col.w
            })
            y += 10

            doc.items.forEach((item: any, i: number) => {
                const rowH = 9.5
                const even = i % 2 === 0
                pdf.setFillColor(even ? 252 : 247, even ? 253 : 249, even ? 254 : 252)
                pdf.rect(ml, y, cw, rowH, 'F')
                pdf.setDrawColor(220, 228, 238)
                pdf.setLineWidth(0.2)
                pdf.line(ml, y + rowH, ml + cw, y + rowH)

                const tvaMnt = item.quantity * item.unit_price * item.tva / 100
                const lineTotal = item.quantity * item.unit_price
                const rowData = [
                    { text: item.description || '—', w: cols[0].w, align: 'left' },
                    { text: String(item.quantity), w: cols[1].w, align: 'center' },
                    { text: item.unit_price.toLocaleString('fr-FR'), w: cols[2].w, align: 'right' },
                    { text: item.tva + '%', w: cols[3].w, align: 'center' },
                    { text: tvaMnt.toLocaleString('fr-FR'), w: cols[4].w, align: 'right' },
                    { text: lineTotal.toLocaleString('fr-FR'), w: cols[5].w, align: 'right' },
                ]
                colX = ml
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(8)
                pdf.setTextColor(40, 55, 75)
                rowData.forEach(cell => {
                    if (cell.align === 'right') {
                        pdf.text(cell.text, colX + cell.w - 2, y + 6.5, { align: 'right' })
                    } else if (cell.align === 'center') {
                        pdf.text(cell.text, colX + cell.w / 2, y + 6.5, { align: 'center' })
                    } else {
                        const lines = pdf.splitTextToSize(cell.text ?? '', cell.w - 5)
                        pdf.text(lines[0] ?? '', colX + 3, y + 6.5)
                    }
                    colX += cell.w
                })
                y += rowH
            })

            pdf.setDrawColor(150, 170, 200)
            pdf.setLineWidth(0.6)
            pdf.line(ml, y, ml + cw, y)
            y += 8

            const totW = 85
            const totX2 = pw - mr - totW

            const drawRow = (label: string, value: string, bold = false, red = false) => {
                pdf.setFont('helvetica', bold ? 'bold' : 'normal')
                pdf.setFontSize(bold ? 9 : 8)
                pdf.setTextColor(red ? 200 : 70, red ? 50 : 85, red ? 50 : 105)
                pdf.text(label, totX2, y + 5)
                pdf.setTextColor(red ? 200 : 25, red ? 50 : 35, red ? 50 : 60)
                pdf.text(value, pw - mr, y + 5, { align: 'right' })
                y += 8
            }

            drawRow('Sous-total HT', `${doc.sous_total.toLocaleString('fr-FR')} XOF`)
            drawRow('TVA (18%)', `+ ${doc.total_tva.toLocaleString('fr-FR')} XOF`)
            if (doc.remise > 0) drawRow('Remise', `- ${doc.remise.toLocaleString('fr-FR')} XOF`, false, true)

            pdf.setDrawColor(150, 175, 210)
            pdf.setLineWidth(0.5)
            pdf.line(totX2 - 2, y - 2, pw - mr, y - 2)

            pdf.setFillColor(0, 135, 81)
            pdf.roundedRect(totX2 - 4, y - 1, totW + 4, 12, 2, 2, 'F')
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(10)
            pdf.setTextColor(255, 255, 255)
            pdf.text('TOTAL TTC', totX2, y + 7.5)
            pdf.text(`${doc.total.toLocaleString('fr-FR')} XOF`, pw - mr, y + 7.5, { align: 'right' })
            y += 18

            if (doc.type === 'devis' && y + 28 < ph - 20) {
                const sigW = (cw - 8) / 2
                pdf.setFillColor(242, 255, 248)
                pdf.setDrawColor(0, 135, 81)
                pdf.setLineWidth(0.4)
                pdf.roundedRect(ml, y, sigW, 26, 2, 2, 'FD')
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(7)
                pdf.setTextColor(0, 100, 60)
                pdf.text('BON POUR ACCORD', ml + 4, y + 8)
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(6.5)
                pdf.setTextColor(90, 100, 95)
                pdf.text('Signature & Cachet du client :', ml + 4, y + 15)
                pdf.text('Date :  ____/____/________', ml + 4, y + 22)

                const sig2X = ml + sigW + 8
                pdf.setFillColor(242, 245, 255)
                pdf.setDrawColor(100, 110, 200)
                pdf.roundedRect(sig2X, y, sigW, 26, 2, 2, 'FD')
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(7)
                pdf.setTextColor(70, 80, 170)
                pdf.text('La Présidente Directrice Générale', sig2X + 4, y + 8)
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(6.5)
                pdf.setTextColor(0, 135, 81)
                pdf.text('RETOUR GAGNANT BÉNIN', sig2X + 4, y + 14)
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(6.5)
                pdf.setTextColor(90, 95, 130)
                pdf.text('Signature & Cachet officiel', sig2X + 4, y + 20)
                pdf.text(`Établi le ${new Date(doc.created_at).toLocaleDateString('fr-FR')}`, sig2X + 4, y + 25)
            }

            if (doc.status === 'brouillon') {
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(75)
                pdf.setTextColor(210, 215, 222)
                pdf.text('BROUILLON', pw / 2, ph / 2, { align: 'center', angle: 40 })
            }
            if (doc.status === 'paye') {
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(80)
                pdf.setTextColor(195, 240, 215)
                pdf.text('PAYÉ', pw / 2, ph / 2, { align: 'center', angle: 40 })
            }

            pdf.setFillColor(10, 16, 24)
            pdf.rect(0, ph - 15, pw, 15, 'F')
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(6.5)
            pdf.setTextColor(100, 120, 145)
            pdf.text('RETOUR GAGNANT BÉNIN — RCCM: RB/COT/26 B 42001 — IFU: 3202644573981 — Avenue de la Marina, Cotonou, Bénin', pw / 2, ph - 9, { align: 'center' })
            pdf.text(`Document N° ${doc.numero} — Généré le ${new Date().toLocaleDateString('fr-FR')}`, pw / 2, ph - 5, { align: 'center' })

            pdf.save(`${doc.type}_${doc.numero}.pdf`)
        } catch (err) {
            console.error('PDF generation error:', err)
        }
        setGenerating(false)
    }


    if (loading) {
        return <div className="min-h-screen bg-[#060a10] flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
    }

    if (error || !doc) {
        return (
            <div className="min-h-screen bg-[#060a10] flex flex-col items-center justify-center text-center p-6">
                <ShieldCheck size={48} className="text-red-500 mb-4 opacity-50" />
                <h1 className="text-2xl font-black text-white mb-2">Document Sécurisé</h1>
                <p className="text-gray-400 max-w-sm">{error || "Ce document n'est plus disponible ou vous n'y avez pas accès."}</p>
            </div>
        )
    }

    const isPaid = doc.status === 'paye'
    const isAccepted = doc.status === 'accepte'
    const statusColor = isPaid ? 'text-emerald-400 bg-emerald-500/10' : 
                       isAccepted ? 'text-emerald-400 bg-emerald-500/10' : 
                       'text-blue-400 bg-blue-500/10'

    return (
        <div className="min-h-screen bg-[#060a10] text-gray-300 font-sans selection:bg-emerald-500/30">
            {/* INJECTION FEDAPAY SCRIPT */}
            <Script src="https://checkout.fedapay.com/js/checkout.js" strategy="lazyOnload" />

            {/* Bandeau Supérieur Minimaliste Bénin */}
            <div className="h-1.5 w-full flex">
                <div className="flex-1 bg-emerald-600"></div>
                <div className="flex-1 bg-amber-400"></div>
                <div className="flex-1 bg-red-600"></div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
                
                {/* Header Portail */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <img src="/logo.jpg" alt="Logo Retour Gagnant" className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                        <div>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-2">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Espace Client Sécurisé</span>
                            </motion.div>
                            <h1 className="text-3xl font-black text-white tracking-tight">
                                RETOUR GAGNANT <span className="text-emerald-500">BÉNIN</span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Agence de Conciergerie & Services Internationaux</p>
                        </div>
                    </div>

                    <div className="text-left md:text-right bg-white/5 border border-white/10 p-4 rounded-2xl md:min-w-[200px]">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                            {doc.type === 'devis' ? 'Devis Pro-forma' : 'Facture Officielle'}
                        </p>
                        <p className="text-xl font-black text-white font-mono break-all">{doc.numero}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/5">
                            <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-400' : isAccepted ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'}`}></div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor.split(' ')[0]}`}>
                                {doc.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Paper Document */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="bg-[#0c1420] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
                >
                    {/* Watermark */}
                    {(isPaid || doc.status === 'brouillon') && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 opacity-5">
                            <p className="text-[150px] font-black italic transform -rotate-45 text-white blur-[2px]">
                                {doc.status.toUpperCase()}
                            </p>
                        </div>
                    )}

                    <div className="p-6 md:p-10 relative z-10">
                        {/* Client Info */}
                        <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
                            <div>
                                <img src="/logo.jpg" alt="Retour Gagnant Logo" className="h-16 w-auto mb-4 object-contain rounded-lg border border-white/10" />
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Émetteur</p>
                                <p className="text-white font-bold">RETOUR GAGNANT BÉNIN</p>
                                <div className="text-sm text-gray-400 mt-2 space-y-1">
                                    <p>RCCM: RB/COT/26 B 42001</p>
                                    <p>IFU: 3202644573981</p>
                                </div>
                            </div>
                            <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 md:w-1/2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Destinataire (Client)</p>
                                <p className="text-lg text-white font-bold">{doc.client_nom} {doc.client_prenom}</p>
                                <div className="text-sm text-gray-400 mt-2 space-y-1">
                                    {doc.client_email && <p className="flex items-center gap-2"><Mail size={14} className="text-gray-500"/> {doc.client_email}</p>}
                                    {doc.client_phone && <p className="flex items-center gap-2"><Phone size={14} className="text-gray-500"/> {doc.client_phone}</p>}
                                    {doc.client_adresse && <p className="mt-2 text-xs border-t border-white/10 pt-2">{doc.client_adresse}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto w-full mb-8 rounded-2xl border border-white/5">
                            <table className="w-full text-left border-collapse min-w-full">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/5">
                                        <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Description</th>
                                        <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Qté</th>
                                        <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">PU HT</th>
                                        <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">TVA</th>
                                        <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Total HT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doc.items.map((it, i) => (
                                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01]">
                                            <td className="py-4 px-3 md:px-5 text-sm text-gray-300 min-w-[150px]">{it.description}</td>
                                            <td className="py-4 px-5 text-sm text-gray-400 text-center">{it.quantity}</td>
                                            <td className="py-4 px-5 text-sm text-gray-400 text-right font-mono">{it.unit_price.toLocaleString('fr-FR')}</td>
                                            <td className="py-4 px-5 text-sm text-gray-400 text-right">{it.tva}%</td>
                                            <td className="py-4 px-5 text-sm text-white font-mono text-right">{(it.quantity * it.unit_price).toLocaleString('fr-FR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals & Conditions */}
                        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-8">
                            <div className="lg:w-1/2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Conditions Générales & Validité</p>
                                <p className="text-xs text-gray-400 bg-white/5 p-4 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
                                    {doc.conditions}
                                    <br/><br/>
                                    <strong><Calendar size={12} className="inline mr-1 relative -top-[1px]"/> Délai / Validité :</strong> {doc.validite}
                                </p>
                            </div>
                            <div className="lg:w-1/2 lg:max-w-xs ml-auto space-y-3">
                                <div className="flex justify-between items-center text-sm text-gray-400 border-b border-white/5 pb-3">
                                    <span>Sous-total HT</span>
                                    <span className="font-mono">{doc.sous_total.toLocaleString('fr-FR')} {doc.currency}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-400 border-b border-white/5 pb-3">
                                    <span>TVA</span>
                                    <span className="font-mono">+ {doc.total_tva.toLocaleString('fr-FR')} {doc.currency}</span>
                                </div>
                                {doc.remise > 0 && (
                                    <div className="flex justify-between items-center text-sm text-amber-500 border-b border-white/5 pb-3">
                                        <span>Remise appliquée</span>
                                        <span className="font-mono">- {doc.remise.toLocaleString('fr-FR')} {doc.currency}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">Total TTC</span>
                                    <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">
                                        {doc.total.toLocaleString('fr-FR')} <span className="text-sm font-bold ml-1">{doc.currency}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* SIGNATURE VISUALIZATION */}
                        {signatureUrl && doc.type === 'devis' && (
                            <div className="mt-12 bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <p className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-1">
                                        <CheckCircle2 size={16} /> Devis signé et accepté
                                    </p>
                                    <p className="text-xs text-gray-500">Document validé légalement par vos soins.</p>
                                </div>
                                <div className="bg-white px-8 py-2 rounded-xl flex items-center justify-center">
                                    <img src={signatureUrl} alt="Signature Client" className="h-16 object-contain pointer-events-none filter drop-shadow-sm" />
                                </div>
                            </div>
                        )}
                        
                    </div>
                </motion.div>

                {/* ─── ACTION AREA (BOTTOM FLOATING OR STATIC) ─── */}
                <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4">
                    
                    {/* CASE 1: Devis not accepted -> Require Signature */}
                    {doc.type === 'devis' && !isAccepted && !signing && (
                        <button 
                            onClick={() => setSigning(true)}
                            className="w-full md:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 transition-all"
                        >
                            <PenTool size={20} />
                            Accepter le Devis & Signer
                        </button>
                    )}

                    {/* CASE 2: Facture not paid -> Require Payment (FedaPay) */}
                    {doc.type === 'facture' && !isPaid && (
                        <button 
                            onClick={processPayment}
                            disabled={isProcessing}
                            className="w-full md:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black px-8 py-4 rounded-2xl font-black text-lg shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard size={20} />}
                            {isProcessing ? 'Connexion en cours...' : `Payer de façon sécurisée (${doc.total.toLocaleString()} ${doc.currency})`}
                        </button>
                    )}

                    {/* CASE 3: Download Button (Always available unless signing) */}
                    {!signing && (
                        <button 
                            onClick={generatePDF}
                            disabled={generating}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-gray-300 hover:text-white px-6 py-4 rounded-2xl font-bold transition-all hover:bg-white/10 disabled:opacity-50"
                        >
                            {generating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {generating ? 'Génération...' : 'Télécharger le PDF'}
                        </button>
                    )}
                </div>
            </div>

            {/* ─── SIGNATURE MODAL OVERLAY ─── */}
            <AnimatePresence>
                {signing && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#0c1420] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div>
                                    <h3 className="text-xl font-black text-white">Signature Numérique</h3>
                                    <p className="text-xs text-gray-400 mt-1">Dessinez votre signature dans le cadre ci-dessous.</p>
                                </div>
                                <button onClick={() => setSigning(false)} className="text-gray-500 hover:text-white bg-white/5 p-2 rounded-xl">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-6">
                                <div className="bg-white rounded-2xl shadow-inner border-[3px] border-emerald-500/30 overflow-hidden relative touch-none">
                                    {/* Ligne pointillée pour guider */}
                                    <div className="absolute top-[70%] left-8 right-8 h-px border-b-2 border-dashed border-gray-200 pointer-events-none"></div>
                                    <span className="absolute bottom-4 right-6 text-gray-300 font-bold text-xs pointer-events-none select-none italic">
                                        Signez au-dessus de la ligne
                                    </span>

                                    <canvas
                                        ref={canvasRef}
                                        width={500}
                                        height={250}
                                        className="w-full h-[250px] cursor-crosshair block"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={endDrawing}
                                        onMouseLeave={endDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={endDrawing}
                                    />
                                </div>
                                
                                <div className="flex justify-between items-center mt-4">
                                    <button onClick={clearSignature} className="text-sm font-bold text-gray-400 hover:text-white px-4 py-2">
                                        Effacer
                                    </button>
                                    <button 
                                        onClick={saveSignature}
                                        disabled={isProcessing}
                                        className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        Valider & Approuver
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}

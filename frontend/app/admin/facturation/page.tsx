'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
    FileText, Plus, Trash2, X, Loader2, Search,
    Send, Download, Eye, Calculator, Receipt,
    Phone, Mail, CheckCircle2, Building2, User, Hash,
    Calendar, CreditCard, ArrowRight, BarChart3, TrendingUp,
    AlertCircle, Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'

interface DevisItem {
    description: string
    quantity: number
    unit_price: number
    tva: number
}

interface DocumentFinancier {
    id: string
    type: 'devis' | 'facture'
    numero: string
    client_nom: string
    client_prenom: string
    client_email: string
    client_phone: string
    client_adresse: string
    items: DevisItem[]
    sous_total: number
    total_tva: number
    remise: number
    total: number
    status: string
    notes: string
    conditions: string
    validite: string
    created_at: string
    agent_id: string
    agent_email?: string
}

export default function AdminFacturationPage() {
    const [documents, setDocuments] = useState<DocumentFinancier[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'devis' | 'facture'>('all')
    const [showPreview, setShowPreview] = useState<DocumentFinancier | null>(null)
    const [generating, setGenerating] = useState(false)

    const fetchDocuments = useCallback(async () => {
        const { data } = await supabase
            .from('documents_financiers')
            .select(`*, agent:agent_id(email)`)
            .order('created_at', { ascending: false })
            
        // Map agent email if joined
        const mapped = (data || []).map(d => ({
            ...d,
            agent_email: d.agent?.email || 'N/A'
        }))
        
        setDocuments(mapped as DocumentFinancier[])
        setLoading(false)
    }, [])

    useEffect(() => { fetchDocuments() }, [fetchDocuments])

    const handleDelete = async (id: string) => {
        if(!confirm('Voulez-vous vraiment supprimer ce document ?')) return;
        await supabase.from('documents_financiers').delete().eq('id', id)
        setDocuments(prev => prev.filter(d => d.id !== id))
        setShowPreview(null)
    }

    const handleUpdateStatus = async (id: string, status: string) => {
        await supabase.from('documents_financiers').update({ status }).eq('id', id)
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d))
        if (showPreview?.id === id) setShowPreview(prev => prev ? { ...prev, status } : null)
    }

    const generatePDF = async (doc: DocumentFinancier) => {
        setGenerating(true)
        try {
            const jsPDF = (await import('jspdf')).default
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pw = 210
            const ph = 297
            const ml = 14
            const mr = 14
            const cw = pw - ml - mr // 182mm

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

            // Company name (left)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(22)
            pdf.setTextColor(0, 185, 100)
            pdf.text('RETOUR GAGNANT', ml, 20)

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7.5)
            pdf.setTextColor(140, 160, 180)
            pdf.text('BÉNIN', ml, 25)

            pdf.setFontSize(7)
            pdf.setTextColor(100, 120, 140)
            pdf.text('Agence de Conciergerie & Services Internationaux', ml, 31)
            pdf.text('Avenue de la Marina, Cotonou — République du Bénin', ml, 36)
            pdf.text('contact@retourgagnantbenin.bj  |  www.retourgagnantbenin.bj', ml, 41)
            pdf.text('+229 01 94 35 50 50  |  +229 01 60 32 21 21', ml, 46)

            // Document type badge (right)
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
            pdf.text(`N\u00b0 ${doc.numero}`, pw - mr, 32, { align: 'right' })
            pdf.text(`Date : ${new Date(doc.created_at).toLocaleDateString('fr-FR')}`, pw - mr, 38, { align: 'right' })
            pdf.text(doc.type === 'facture' ? `D\u00e9lai : ${doc.validite}` : `Validit\u00e9 : ${doc.validite}`, pw - mr, 44, { align: 'right' })

            // Status badge
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
            const statusLabels: Record<string, string> = { brouillon: 'BROUILLON', envoye: 'ENVOY\u00c9', accepte: 'ACCEPT\u00c9', refuse: 'REFUS\u00c9', paye: 'PAY\u00c9', en_retard: 'EN RETARD', annule: 'ANNUL\u00c9' }
            pdf.text(statusLabels[doc.status] || doc.status.toUpperCase(), pw - mr - 13, 51.3, { align: 'center' })

            let y = 64

            // FROM box 
            const boxW = (cw - 6) / 2
            const boxH = 42

            pdf.setFillColor(18, 28, 42)
            pdf.setDrawColor(40, 60, 90)
            pdf.setLineWidth(0.4)
            pdf.roundedRect(ml, y, boxW, boxH, 2, 2, 'FD')

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(6.5)
            pdf.setTextColor(80, 120, 180)
            pdf.text('\u00c9METTEUR', ml + 4, y + 7)

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(9.5)
            pdf.setTextColor(220, 230, 245)
            pdf.text('RETOUR GAGNANT B\u00c9NIN', ml + 4, y + 15)

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7.5)
            pdf.setTextColor(140, 160, 185)
            pdf.text('RCCM : RB/COT/26 B 42001', ml + 4, y + 22)
            pdf.text('IFU : 3202644573981', ml + 4, y + 27.5)
            pdf.text('Avenue de la Marina, Cotonou, B\u00e9nin', ml + 4, y + 33)
            pdf.text('contact@retourgagnantbenin.bj', ml + 4, y + 38.5)

            // TO box
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

            // ── ITEMS TABLE ────────────────────────────────────────
            const cols = [
                { header: 'DESCRIPTION DU SERVICE', w: 68, align: 'left' as const },
                { header: 'QT\u00c9', w: 14, align: 'center' as const },
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

            doc.items.forEach((item: DevisItem, i: number) => {
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
                    { text: item.description || '\u2014', w: cols[0].w, align: 'left' },
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
                        const lines = pdf.splitTextToSize(cell.text, cell.w - 5)
                        pdf.text(lines[0], colX + 3, y + 6.5)
                    }
                    colX += cell.w
                })
                y += rowH
            })

            pdf.setDrawColor(150, 170, 200)
            pdf.setLineWidth(0.6)
            pdf.line(ml, y, ml + cw, y)
            y += 8

            // ── TOTALS ─────────────────────────────────────────────
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

            // ── SIGNATURE ZONE (devis) ─────────────────────────────
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
                pdf.text('RETOUR GAGNANT B\u00c9NIN', sig2X + 4, y + 14)
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(6.5)
                pdf.setTextColor(90, 95, 130)
                pdf.text('Signature & Cachet officiel', sig2X + 4, y + 20)
                pdf.text(`\u00c9tabli le ${new Date(doc.created_at).toLocaleDateString('fr-FR')}`, sig2X + 4, y + 25)
            }

            // ── WATERMARK ──────────────────────────────────────────
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
                pdf.text('PAY\u00c9', pw / 2, ph / 2, { align: 'center', angle: 40 })
            }

            // ── LEGAL FOOTER ───────────────────────────────────────
            pdf.setFillColor(10, 16, 24)
            pdf.rect(0, ph - 15, pw, 15, 'F')
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(6.5)
            pdf.setTextColor(100, 120, 145)
            pdf.text('RETOUR GAGNANT B\u00c9NIN \u2014 RCCM: RB/COT/26 B 42001 \u2014 IFU: 3202644573981 \u2014 Avenue de la Marina, Cotonou, B\u00e9nin', pw / 2, ph - 9, { align: 'center' })
            pdf.text(`Document N\u00b0 ${doc.numero} \u2014 G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString('fr-FR')}`, pw / 2, ph - 5, { align: 'center' })

            pdf.save(`${doc.type}_${doc.numero}.pdf`)
        } catch (err) {
            console.error('PDF generation error:', err)
        }
        setGenerating(false)
    }

    const filtered = documents.filter(d => {
        const matchSearch = d.numero?.toLowerCase().includes(search.toLowerCase()) ||
            d.client_nom?.toLowerCase().includes(search.toLowerCase())
        const matchType = filterType === 'all' || d.type === filterType
        return matchSearch && matchType
    })

    const statusConfig: Record<string, { color: string; label: string }> = {
        brouillon: { color: 'bg-gray-500/20 text-gray-400', label: 'Brouillon' },
        envoye: { color: 'bg-blue-500/20 text-blue-400', label: 'Envoy\u00e9' },
        accepte: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Accept\u00e9' },
        refuse: { color: 'bg-red-500/20 text-red-400', label: 'Refus\u00e9' },
        paye: { color: 'bg-green-500/20 text-green-400', label: 'Pay\u00e9' },
        en_retard: { color: 'bg-orange-500/20 text-orange-400', label: 'En retard' },
        annule: { color: 'bg-zinc-500/20 text-zinc-400', label: 'Annul\u00e9' },
    }

    if (loading) {
        return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
    }

    const totalCA = documents.filter(d => d.status === 'paye').reduce((s, d) => s + d.total, 0)
    const unpaidCA = documents.filter(d => d.type === 'facture' && (d.status === 'envoye' || d.status === 'en_retard')).reduce((s, d) => s + d.total, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Calculator size={16} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.3em]">ERP & Comptabilit\u00e9</span>
                    </div>
                    <h1 className="text-2xl font-black text-white">Centre de Facturation</h1>
                    <p className="text-gray-500 text-sm mt-1">Supervision globale des finances de l'agence.</p>
                </div>
                <Link href="/admin/facturation/create" className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all">
                    <Plus size={16} /> Cr\u00e9er une Facture / Devis
                </Link>
            </div>

            {/* Stats Ultra Puissantes (Dashboard Financier) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'CA Encaiss\u00e9 (Total)', value: `${totalCA.toLocaleString('fr-FR')} XOF`, icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'En Attente de Paiement', value: `${unpaidCA.toLocaleString('fr-FR')} XOF`, icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                    { label: 'Devis Actifs', value: documents.filter(d => d.type === 'devis' && d.status !== 'refuse').length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'TVA Collect\u00e9e', value: `${documents.filter(d => d.status === 'paye').reduce((s, d) => s + d.total_tva, 0).toLocaleString('fr-FR')} XOF`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map(stat => (
                    <div key={stat.label} className="bg-[#0c1420] border border-white/5 rounded-xl p-5 shadow-lg">
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                            <stat.icon size={18} className={stat.color} />
                        </div>
                        <p className="text-2xl font-black text-white font-mono">{stat.value}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par Num\u00e9ro ou Client..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 text-sm" />
                </div>
                <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-full sm:w-auto">
                    {[{ k: 'all', l: 'Tous' }, { k: 'devis', l: 'Devis' }, { k: 'facture', l: 'Factures' }].map(f => (
                        <button key={f.k} type="button" onClick={() => setFilterType(f.k as typeof filterType)} className={`flex-1 sm:flex-none text-xs font-bold px-4 py-2 rounded-lg transition-all ${filterType === f.k ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}>{f.l}</button>
                    ))}
                </div>
            </div>

            {/* Document List (Tables are cleaner for ERP) */}
            <div className="bg-[#0c1420] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document</th>
                                <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</th>
                                <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Montant</th>
                                <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Statut</th>
                                <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Créé par</th>
                                <th className="py-4 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500">
                                        <Receipt size={32} className="mx-auto mb-3 opacity-50" />
                                        <p className="text-sm font-semibold">Aucun document trouvé</p>
                                    </td>
                                </tr>
                            ) : filtered.map(doc => (
                                <tr key={doc.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-3 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${doc.type==='devis'?'bg-blue-500/10 text-blue-400':'bg-emerald-500/10 text-emerald-400'}`}>
                                                {doc.type === 'devis' ? <FileText size={16} /> : <Receipt size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{doc.numero}</p>
                                                <p className="text-gray-500 text-[10px]">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-5">
                                        <p className="text-white text-sm font-medium">{doc.client_nom} {doc.client_prenom}</p>
                                        <p className="text-gray-500 text-[10px]">{doc.client_email || doc.client_phone}</p>
                                    </td>
                                    <td className="py-3 px-5 text-right">
                                        <p className="text-white font-mono text-sm font-bold">{doc.total.toLocaleString('fr-FR')} XOF</p>
                                    </td>
                                    <td className="py-3 px-5 text-center">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusConfig[doc.status]?.color || ''}`}>{statusConfig[doc.status]?.label}</span>
                                    </td>
                                    <td className="py-3 px-5">
                                        <p className="text-gray-400 text-xs">{doc.agent_email}</p>
                                    </td>
                                    <td className="py-3 px-5 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    const url = `${window.location.origin}/p/${doc.id}`
                                                    navigator.clipboard.writeText(url)
                                                    alert('Lien Magique Client copié dans le presse-papier ! Envoye-le via WhatsApp.')
                                                }} 
                                                className="p-2 text-gray-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all" 
                                                title="Copier le Lien Client"
                                            >
                                                <LinkIcon size={16} />
                                            </button>
                                            <button onClick={() => setShowPreview(doc)} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-all" title="Aperçu / Modifier"><Eye size={16} /></button>
                                            <button onClick={() => generatePDF(doc)} disabled={generating} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-all" title="PDF">
                                                {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                            </button>
                                            <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all" title="Supprimer"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(null)}>
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={e => e.stopPropagation()} className="bg-[#080e15] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
                            {/* Flag stripe */}
                            <div className="h-1 flex flex-shrink-0">
                                <div className="flex-1 bg-emerald-600" />
                                <div className="flex-1 bg-amber-400" />
                                <div className="flex-1 bg-red-600" />
                            </div>

                            {/* Header */}
                            <div className="bg-[#0c1420] border-b border-white/5 p-5 flex items-start justify-between flex-shrink-0">
                                <div>
                                    <p className="text-emerald-400 text-xl font-black tracking-wider">RETOUR GAGNANT B\u00c9NIN</p>
                                    <p className="text-gray-600 text-xs mt-0.5">Agence de Services Internationaux</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-3xl font-black ${showPreview.type === 'devis' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {showPreview.type === 'devis' ? 'DEVIS' : 'FACTURE'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 font-mono">N° {showPreview.numero}</p>
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1 p-5 space-y-5">
                                {/* Actions Rapides (Conversion) */}
                                {showPreview.type === 'devis' && showPreview.status !== 'accepte' && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-amber-500">
                                            <FileText size={20} />
                                            <div>
                                                <p className="text-sm font-bold">Ce client a-t-il valid\u00e9 ce devis ?</p>
                                                <p className="text-xs text-amber-500/70">Passez-le en "Accept\u00e9" pour g\u00e9n\u00e9rer automatiquement la facture correspondante.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleUpdateStatus(showPreview.id, 'accepte')} className="bg-amber-500 text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-400">Marquer Accept\u00e9</button>
                                    </div>
                                )}

                                {/* Details like inside PDF */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Client</p>
                                        <p className="text-white font-bold">{showPreview.client_nom} {showPreview.client_prenom}</p>
                                        <p className="text-gray-400 text-xs mt-1">{showPreview.client_email}</p>
                                        <p className="text-gray-400 text-xs">{showPreview.client_phone}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">R\u00e9capitulatif Total</p>
                                        <p className="text-2xl text-emerald-400 font-black font-mono mt-1">{showPreview.total.toLocaleString('fr-Fr')} XOF</p>
                                    </div>
                                </div>

                                <div className="border border-white/5 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-white/5 text-gray-400 text-left">
                                            <tr>
                                                <th className="p-3">Description</th>
                                                <th className="p-3 text-center">Qt\u00e9</th>
                                                <th className="p-3 text-right">PU</th>
                                                <th className="p-3 text-right">TVA</th>
                                                <th className="p-3 text-right">Total HT</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {showPreview.items.map((it, i) => (
                                                <tr key={i} className="border-t border-white/5">
                                                    <td className="p-3 text-gray-300">{it.description}</td>
                                                    <td className="p-3 text-gray-400 text-center">{it.quantity}</td>
                                                    <td className="p-3 text-gray-400 text-right font-mono">{it.unit_price.toLocaleString('fr-FR')}</td>
                                                    <td className="p-3 text-gray-400 text-right">{it.tva}%</td>
                                                    <td className="p-3 text-white font-medium text-right font-mono">{(it.quantity * it.unit_price).toLocaleString('fr-FR')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Status Update */}
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-xs text-gray-400 mb-2">Changer le statut manuellement :</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(statusConfig).map(([key, cfg]) => (
                                            <button key={key} type="button" onClick={() => handleUpdateStatus(showPreview.id, key)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all border ${showPreview.status === key ? cfg.color : 'bg-transparent border-white/10 text-gray-500 hover:text-white hover:border-white/30'}`}>{cfg.label}</button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}

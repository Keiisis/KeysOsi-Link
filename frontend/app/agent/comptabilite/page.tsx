'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
    Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Download, Activity, CheckCircle2,
    BarChart3, Landmark, ArrowRight, FileText, X, TrendingDown, Zap, MessageCircle,
    RefreshCw, Plus, AlertTriangle, Banknote, CreditCard, Bell, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useTranslation } from '@/lib/translation'
import { exportToExcelMultiSheet } from '@/lib/exportExcel'
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area
} from 'recharts'

interface DocumentItem {
    description?: string
    quantity?: number
    unit_price?: number
    tva?: number
    unit_cost?: number
}

interface DocumentFinancier {
    id: string
    type: 'devis' | 'facture'
    numero: string
    client_nom: string
    client_prenom: string
    client_phone?: string
    client_email?: string
    client_adresse?: string
    total: number
    sous_total?: number
    total_tva?: number
    remise?: number
    items?: DocumentItem[]
    currency?: string
    status: string
    created_at: string
}

interface Depense {
    id: string
    titre: string
    categorie: string
    montant: number
    date_depense: string
}

// Taux de commission par défaut supprimé (sera récupéré en BDD)

// ── Helpers de Périodes ──────────────────────────────────────────
// Period = 'tous' | '3_mois' | 'YYYY-MM' (mois civil précis)
type Period = string

const MONTH_REGEX = /^\d{4}-\d{2}$/
const isMonth = (p: Period) => MONTH_REGEX.test(p)

function currentMonthKey(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(key: string, delta: number): string {
    const [y, m] = key.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number)
    const s = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
}

function periodLabel(period: Period): string {
    if (period === 'tous') return 'Global'
    if (period === '3_mois') return '3 derniers mois'
    if (isMonth(period)) return monthLabel(period)
    return period
}

function periodSlug(period: Period): string {
    if (period === 'tous') return 'Global'
    if (period === '3_mois') return '3_mois'
    if (isMonth(period)) return period
    return period
}

function getPeriodRange(period: Period): { start: Date; end: Date } {
    const now = new Date()
    const fullEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    if (period === 'tous') return { start: new Date(0), end: fullEnd }
    if (period === '3_mois') return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: fullEnd }
    if (isMonth(period)) {
        const [y, m] = period.split('-').map(Number)
        const start = new Date(y, m - 1, 1, 0, 0, 0, 0)
        const end = new Date(y, m, 0, 23, 59, 59, 999)
        return { start, end }
    }
    return { start: new Date(0), end: fullEnd }
}

function getPreviousPeriodRange(period: Period): { start: Date; end: Date } {
    if (isMonth(period)) {
        const prev = shiftMonth(period, -1)
        return getPeriodRange(prev)
    }
    const now = new Date()
    if (period === '3_mois') {
        const start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        const end = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        return { start, end }
    }
    return { start: new Date(0), end: new Date(0) }
}

function last12Months(): string[] {
    const out: string[] = []
    const d = new Date()
    for (let i = 0; i < 12; i++) {
        const ref = new Date(d.getFullYear(), d.getMonth() - i, 1)
        out.push(`${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`)
    }
    return out
}

function calcTrend(current: number, previous: number): string | null {
    if (previous === 0) return current > 0 ? '+100' : '0'
    const pct = ((current - previous) / previous) * 100
    return (pct >= 0 ? '+' : '') + pct.toFixed(1)
}

export default function AgentComptabilitePage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [allDocs, setAllDocs] = useState<DocumentFinancier[]>([])
    const [expenses, setExpenses] = useState<Depense[]>([])
    const [selectedPeriod, setSelectedPeriod] = useState<Period>(() => currentMonthKey())
    const [showRelancesOnly, setShowRelancesOnly] = useState(false)
    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const [newExpense, setNewExpense] = useState({ titre: '', categorie: 'operationnel', montant: '' })
    const [savingExpense, setSavingExpense] = useState(false)
    // Paiements manuels
    const [paiements, setPaiements] = useState<Record<string, number>>({}) // document_id → montant total payé
    const [paiementsList, setPaiementsList] = useState<Array<{ id: string; document_id: string; type: string; montant: number; date_paiement: string; reference: string | null; notes: string | null }>>([])
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentDoc, setPaymentDoc] = useState<DocumentFinancier | null>(null)
    const [paymentDocId, setPaymentDocId] = useState<string>('')
    const [newPayment, setNewPayment] = useState({ type: 'virement', montant: '', reference: '', notes: '', date: new Date().toISOString().split('T')[0] })
    const [savingPayment, setSavingPayment] = useState(false)
    const [paymentMode, setPaymentMode] = useState<'site' | 'externe'>('site')
    const [externePayment, setExternePayment] = useState({ libelle: '', client: '' })
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 8

    const [commissionRate, setCommissionRate] = useState(0.10)

    const fetchAllData = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        // Fetch Documents
        const { data: docs } = await supabase
            .from('documents_financiers')
            .select('*')
            .eq('agent_id', user.id)
            .order('created_at', { ascending: false })

        // Fetch Expenses
        const { data: exp } = await supabase
            .from('depenses')
            .select('*')
            .eq('agent_id', user.id)
            .order('date_depense', { ascending: false })

        // Fetch Settings — commission_rate dans la table settings
        const { data: settings } = await supabase
            .from('settings')
            .select('key,value')
            .eq('key', 'commission_rate')
            .maybeSingle()

        if (settings?.value) {
            setCommissionRate(parseFloat(settings.value))
        }

        // Fetch paiements manuels pour cet agent
        const { data: paiem } = await supabase
            .from('paiements_manuels')
            .select('id, document_id, type, montant, date_paiement, reference, notes')
            .eq('agent_id', user.id)
            .order('date_paiement', { ascending: false })

        if (paiem) {
            const map: Record<string, number> = {}
            paiem.forEach(p => {
                map[p.document_id] = (map[p.document_id] || 0) + Number(p.montant)
            })
            setPaiements(map)
            setPaiementsList(paiem.map(p => ({
                id: String(p.id),
                document_id: String(p.document_id),
                type: String(p.type),
                montant: Number(p.montant),
                date_paiement: String(p.date_paiement),
                reference: p.reference ?? null,
                notes: p.notes ?? null,
            })))
        }

        if (docs) setAllDocs(docs)
        if (exp) setExpenses(exp)
        setLoading(false)
    }

    useEffect(() => {
        const init = async () => {
            await fetchAllData()
        }
        init()
    }, [])

    // ── Données Calculées ───────────────────────────────────────────
    const { start: pStart, end: pEnd } = useMemo(() => getPeriodRange(selectedPeriod), [selectedPeriod])
    const { start: prevStart, end: prevEnd } = useMemo(() => getPreviousPeriodRange(selectedPeriod), [selectedPeriod])

    const periodDocs = useMemo(() => 
        allDocs.filter(d => {
            const date = new Date(d.created_at)
            return date >= pStart && date <= pEnd
        }), [allDocs, pStart, pEnd])

    const prevDocs = useMemo(() => 
        allDocs.filter(d => {
            const date = new Date(d.created_at)
            return date >= prevStart && date <= prevEnd
        }), [allDocs, prevStart, prevEnd])

    const stats = useMemo(() => {
        const getStats = (list: DocumentFinancier[], expList: Depense[]) => {
            const invoices = list.filter(d => d.type === 'facture')
            const encaisse = invoices.filter(d => d.status === 'paye').reduce((acc, d) => acc + d.total, 0)
            const facture = invoices.reduce((acc, d) => acc + d.total, 0)
            const attente = invoices.filter(d => d.status === 'envoye' || d.status === 'accepte').reduce((acc, d) => acc + d.total, 0)
            const totalDepenses = expList.reduce((acc, e) => acc + Number(e.montant), 0)
            const beneficeNet = encaisse - totalDepenses
            return { 
                encaisse, facture, attente, 
                commission: Math.round(encaisse * commissionRate),
                depenses: totalDepenses,
                beneficeNet
            }
        }

        const curr = getStats(periodDocs, expenses.filter(e => {
            const date = new Date(e.date_depense)
            return date >= pStart && date <= pEnd
        }))
        const prev = getStats(prevDocs, expenses.filter(e => {
            const date = new Date(e.date_depense)
            return date >= prevStart && date <= prevEnd
        }))

        // Predictive Logic
        const daysInPeriod = Math.max(1, (pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24))
        const dailyAvg = curr.encaisse / daysInPeriod
        const projection30j = dailyAvg * 30

        return {
            ...curr,
            projection30j,
            trends: {
                encaisse: (selectedPeriod === 'tous') ? null : calcTrend(curr.encaisse, prev.encaisse),
                facture: (selectedPeriod === 'tous') ? null : calcTrend(curr.facture, prev.facture),
                attente: (selectedPeriod === 'tous') ? null : calcTrend(curr.attente, prev.attente),
                commission: (selectedPeriod === 'tous') ? null : calcTrend(curr.commission, prev.commission),
                benefice: (selectedPeriod === 'tous') ? null : calcTrend(curr.beneficeNet, prev.beneficeNet)
            }
        }
    }, [periodDocs, prevDocs, expenses, selectedPeriod, pStart, pEnd, prevStart, prevEnd, commissionRate])

    // Data for Recharts
    const chartData = useMemo(() => {
        const days: Record<string, number> = {}
        periodDocs.filter(d => d.status === 'paye').forEach(d => {
            const day = new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
            days[day] = (days[day] || 0) + d.total
        })
        return Object.entries(days).map(([name, total]) => ({ name, total })).reverse()
    }, [periodDocs])

    const displayedDocs = useMemo(() => {
        let docs = periodDocs
        if (showRelancesOnly) {
            docs = docs.filter(d => d.status === 'envoye' || d.status === 'accepte')
        }
        return docs
    }, [periodDocs, showRelancesOnly])

    const totalPages = Math.max(1, Math.ceil(displayedDocs.length / ITEMS_PER_PAGE))
    const paginatedDocs = useMemo(() => 
        displayedDocs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [displayedDocs, currentPage])

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('fr-BJ', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val)
    }

    const handleWhatsAppReminder = (doc: DocumentFinancier) => {
        const message = `Bonjour ${doc.client_nom},\n\nC'est l'agence Retour Gagnant Bénin. Nous vous relançons concernant le document ${doc.numero} d'un montant de ${formatCurrency(doc.total)}.\n\nVous pouvez le consulter et le régler ici : ${window.location.origin}/portail/${doc.id}\n\nCordialement.`
        const encoded = encodeURIComponent(message)
        const phone = doc.client_phone?.replace(/\s+/g, '')
        window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
    }

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingExpense(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSavingExpense(false); return }

        const { error } = await supabase.from('depenses').insert({
            agent_id: user.id,
            titre: newExpense.titre,
            categorie: newExpense.categorie,
            montant: Number(newExpense.montant),
            date_depense: new Date().toISOString()
        })

        if (!error) {
            setShowExpenseModal(false)
            setNewExpense({ titre: '', categorie: 'operationnel', montant: '' })
            fetchAllData()
        }
        setSavingExpense(false)
    }

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingPayment(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSavingPayment(false); return }

        const isExterne = paymentMode === 'externe' && !paymentDoc
        const targetDocId = paymentDoc?.id || paymentDocId
        if (!isExterne && !targetDocId) { setSavingPayment(false); return }
        if (isExterne && !externePayment.libelle.trim()) { setSavingPayment(false); return }

        const composedNotes = isExterne
            ? `[EXTERNE] ${externePayment.libelle}${externePayment.client ? ' — ' + externePayment.client : ''}${newPayment.notes ? ' | ' + newPayment.notes : ''}`
            : (newPayment.notes || null)

        const { error } = await supabase.from('paiements_manuels').insert({
            agent_id: user.id,
            document_id: isExterne ? null : targetDocId,
            type: newPayment.type,
            montant: Number(newPayment.montant),
            date_paiement: newPayment.date,
            reference: newPayment.reference || null,
            notes: composedNotes,
        })

        if (!error) {
            setShowPaymentModal(false)
            setPaymentDoc(null)
            setPaymentDocId('')
            setPaymentMode('site')
            setExternePayment({ libelle: '', client: '' })
            setNewPayment({ type: 'virement', montant: '', reference: '', notes: '', date: new Date().toISOString().split('T')[0] })
            fetchAllData()
        } else {
            alert('Erreur: ' + error.message + (isExterne ? '\n\nAstuce: la colonne document_id de paiements_manuels doit être nullable pour accepter les paiements externes.' : ''))
        }
        setSavingPayment(false)
    }

    const handleExport = async () => {
        const statusLabels: Record<string, string> = {
            brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté',
            refuse: 'Refusé', paye: 'Payé', en_retard: 'En retard', annule: 'Annulé'
        }
        const paymentLabels: Record<string, string> = {
            virement: 'Virement bancaire', especes: 'Espèces', cheque: 'Chèque',
            mobile_money: 'Mobile Money', carte: 'Carte bancaire', autre: 'Autre'
        }

        const pLabel = periodLabel(selectedPeriod)
        const subtitleBase = `Période : ${pLabel}   —   Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}   —   Document strictement confidentiel`
        const docsById = new Map(allDocs.map(d => [d.id, d]))

        // Reconstruction HT/TVA/Remise/TTC depuis documents_financiers (fallback si champs absents)
        const enrichDoc = (d: DocumentFinancier) => {
            const ht = typeof d.sous_total === 'number' ? d.sous_total : (d.items || []).reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unit_price || 0), 0)
            const tva = typeof d.total_tva === 'number' ? d.total_tva : (d.items || []).reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unit_price || 0) * Number(it.tva || 0) / 100, 0)
            const remise = Number(d.remise || 0)
            const ttc = Number(d.total || 0)
            return { ht, tva, remise, ttc }
        }

        // ── Sheet 1 : Journal comptable chronologique (Débit/Crédit)
        type JournalRow = { date: Date; piece: string; libelle: string; mode: string; debit: number; credit: number }
        const journalRows: JournalRow[] = []
        // Factures émises → crédit 70 (produit)
        displayedDocs.filter(d => d.type === 'facture').forEach(d => {
            journalRows.push({
                date: new Date(d.created_at),
                piece: d.numero,
                libelle: `Facture émise — ${d.client_nom} ${d.client_prenom}`.trim(),
                mode: '—',
                debit: 0,
                credit: Number(d.total || 0),
            })
        })
        // Paiements encaissés → débit banque/caisse
        paiementsList.filter(p => {
            const date = new Date(p.date_paiement)
            return date >= pStart && date <= pEnd
        }).forEach(p => {
            const d = docsById.get(p.document_id)
            const isExterne = !d && /^\[EXTERNE\]/i.test(p.notes || '')
            const libelleExterne = isExterne ? (p.notes || '').replace(/^\[EXTERNE\]\s*/i, '').split('|')[0].trim() : ''
            journalRows.push({
                date: new Date(p.date_paiement),
                piece: d?.numero || (isExterne ? 'EXT' : '—'),
                libelle: d
                    ? `Encaissement — ${d.client_nom} ${d.client_prenom}`.trim()
                    : isExterne ? `Encaissement externe — ${libelleExterne}` : 'Encaissement',
                mode: paymentLabels[p.type] || p.type,
                debit: Number(p.montant || 0),
                credit: 0,
            })
        })
        // Dépenses → débit 6x (charges)
        const expensesPeriod = expenses.filter(e => {
            const date = new Date(e.date_depense)
            return date >= pStart && date <= pEnd
        })
        expensesPeriod.forEach(e => {
            journalRows.push({
                date: new Date(e.date_depense),
                piece: '—',
                libelle: `Dépense — ${e.titre} (${e.categorie})`,
                mode: '—',
                debit: Number(e.montant || 0),
                credit: 0,
            })
        })
        journalRows.sort((a, b) => a.date.getTime() - b.date.getTime())

        const journalSheet = {
            sheetName: 'Journal',
            title: 'JOURNAL COMPTABLE CHRONOLOGIQUE',
            subtitle: subtitleBase,
            legalHeader: true,
            totalRow: true,
            columns: [
                { header: 'Date', key: 'date', width: 13, type: 'date' as const },
                { header: 'N° Pièce', key: 'piece', width: 20 },
                { header: 'Libellé de l\'opération', key: 'libelle', width: 48 },
                { header: 'Mode', key: 'mode', width: 18, type: 'status' as const },
                { header: 'Débit (FCFA)', key: 'debit', width: 18, type: 'currency' as const, totalFormula: 'sum' as const },
                { header: 'Crédit (FCFA)', key: 'credit', width: 18, type: 'currency' as const, totalFormula: 'sum' as const },
            ],
            data: journalRows,
        }

        // ── Sheet 2 : Documents financiers (avec HT / TVA / Remise / TTC)
        const docsRows = displayedDocs.map(d => {
            const { ht, tva, remise, ttc } = enrichDoc(d)
            const paye = paiements[d.id] || 0
            return {
                numero: d.numero,
                type: d.type === 'facture' ? 'Facture' : 'Devis',
                client: `${d.client_nom} ${d.client_prenom}`.trim(),
                email: d.client_email || '',
                phone: d.client_phone || '',
                adresse: d.client_adresse || '',
                ht,
                tva,
                remise,
                ttc,
                paye,
                reste: Math.max(0, ttc - paye),
                status: statusLabels[d.status] || d.status,
                created_at: new Date(d.created_at),
            }
        })

        const docsSheet = {
            sheetName: 'Documents',
            title: 'DOCUMENTS FINANCIERS (DEVIS & FACTURES)',
            subtitle: subtitleBase,
            legalHeader: true,
            totalRow: true,
            columns: [
                { header: 'N° Document', key: 'numero', width: 22, group: 'Identification' },
                { header: 'Type', key: 'type', width: 12, type: 'status' as const, group: 'Identification' },
                { header: 'Date', key: 'created_at', width: 13, type: 'date' as const, group: 'Identification' },
                { header: 'Client', key: 'client', width: 26, group: 'Client' },
                { header: 'Email', key: 'email', width: 26, group: 'Client' },
                { header: 'Téléphone', key: 'phone', width: 16, group: 'Client' },
                { header: 'Adresse', key: 'adresse', width: 26, group: 'Client' },
                { header: 'Sous-total HT', key: 'ht', width: 16, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Montants HT / TVA / TTC' },
                { header: 'TVA', key: 'tva', width: 14, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Montants HT / TVA / TTC' },
                { header: 'Remise', key: 'remise', width: 13, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Montants HT / TVA / TTC' },
                { header: 'TOTAL TTC', key: 'ttc', width: 17, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Montants HT / TVA / TTC' },
                { header: 'Encaissé', key: 'paye', width: 15, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Règlement' },
                { header: 'Reste à payer', key: 'reste', width: 16, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Règlement' },
                { header: 'Statut', key: 'status', width: 14, type: 'status' as const, group: 'Règlement' },
            ],
            data: docsRows,
        }

        // ── Sheet 3 : Lignes d'articles (détail ventilation)
        const lignesRows: Array<Record<string, unknown>> = []
        displayedDocs.forEach(d => {
            const items = Array.isArray(d.items) ? d.items : []
            items.forEach((it, idx) => {
                const qty = Number(it.quantity || 0)
                const pu = Number(it.unit_price || 0)
                const tvaRate = Number(it.tva || 0)
                const ht = qty * pu
                const tvaVal = ht * tvaRate / 100
                lignesRows.push({
                    date: new Date(d.created_at),
                    numero: d.numero,
                    type: d.type === 'facture' ? 'Facture' : 'Devis',
                    client: `${d.client_nom} ${d.client_prenom}`.trim(),
                    ligne: idx + 1,
                    description: it.description || '',
                    qty,
                    pu,
                    ht,
                    tva_taux: tvaRate / 100,
                    tva_montant: tvaVal,
                    ttc: ht + tvaVal,
                })
            })
        })
        const lignesSheet = {
            sheetName: 'Lignes d\'articles',
            title: 'DÉTAIL DES LIGNES D\'ARTICLES',
            subtitle: subtitleBase,
            legalHeader: true,
            totalRow: true,
            columns: [
                { header: 'Date', key: 'date', width: 13, type: 'date' as const, group: 'Pièce' },
                { header: 'N° Document', key: 'numero', width: 20, group: 'Pièce' },
                { header: 'Type', key: 'type', width: 11, type: 'status' as const, group: 'Pièce' },
                { header: 'Client', key: 'client', width: 26, group: 'Pièce' },
                { header: 'N°', key: 'ligne', width: 6, type: 'number' as const, group: 'Article' },
                { header: 'Description', key: 'description', width: 42, group: 'Article' },
                { header: 'Qté', key: 'qty', width: 8, type: 'number' as const, totalFormula: 'sum' as const, group: 'Article' },
                { header: 'Prix unitaire', key: 'pu', width: 15, type: 'currency' as const, group: 'Article' },
                { header: 'Total HT', key: 'ht', width: 15, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Calcul TVA' },
                { header: 'Taux TVA', key: 'tva_taux', width: 11, type: 'percent' as const, group: 'Calcul TVA' },
                { header: 'TVA', key: 'tva_montant', width: 14, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Calcul TVA' },
                { header: 'TTC', key: 'ttc', width: 15, type: 'currency' as const, totalFormula: 'sum' as const, group: 'Calcul TVA' },
            ],
            data: lignesRows,
        }

        // ── Sheet 4 : Paiements
        const paiementsPeriod = paiementsList.filter(p => {
            const date = new Date(p.date_paiement)
            return date >= pStart && date <= pEnd
        })
        const paiementsSheet = {
            sheetName: 'Paiements',
            title: 'REGISTRE DES PAIEMENTS ENCAISSÉS',
            subtitle: subtitleBase,
            legalHeader: true,
            totalRow: true,
            columns: [
                { header: 'Date', key: 'date', width: 13, type: 'date' as const },
                { header: 'N° Facture', key: 'numero', width: 20 },
                { header: 'Client / Libellé', key: 'client', width: 34 },
                { header: 'Mode', key: 'type', width: 18, type: 'status' as const },
                { header: 'Référence', key: 'reference', width: 20 },
                { header: 'Montant (FCFA)', key: 'montant', width: 18, type: 'currency' as const, totalFormula: 'sum' as const },
                { header: 'Notes', key: 'notes', width: 36 },
            ],
            data: paiementsPeriod.map(p => {
                const d = docsById.get(p.document_id)
                const isExterne = !d && /^\[EXTERNE\]/i.test(p.notes || '')
                const libelleExterne = isExterne ? (p.notes || '').replace(/^\[EXTERNE\]\s*/i, '').split('|')[0].trim() : ''
                return {
                    date: new Date(p.date_paiement),
                    numero: d?.numero || (isExterne ? 'EXTERNE' : '—'),
                    client: d ? `${d.client_nom} ${d.client_prenom}`.trim() : (isExterne ? libelleExterne : '—'),
                    type: paymentLabels[p.type] || p.type,
                    reference: p.reference || '',
                    montant: p.montant,
                    notes: p.notes || '',
                }
            }),
        }

        // ── Sheet 5 : Dépenses
        const depensesSheet = {
            sheetName: 'Dépenses',
            title: 'REGISTRE DES DÉPENSES',
            subtitle: subtitleBase,
            legalHeader: true,
            totalRow: true,
            columns: [
                { header: 'Date', key: 'date', width: 13, type: 'date' as const },
                { header: 'Titre de la dépense', key: 'titre', width: 42 },
                { header: 'Catégorie', key: 'categorie', width: 18, type: 'status' as const },
                { header: 'Montant (FCFA)', key: 'montant', width: 18, type: 'currency' as const, totalFormula: 'sum' as const },
            ],
            data: expensesPeriod.map(e => ({
                date: new Date(e.date_depense),
                titre: e.titre,
                categorie: e.categorie,
                montant: Number(e.montant),
            })),
        }

        // ── Sheet 6 : Rapprochement par mode de paiement
        const modeBuckets = new Map<string, { nb: number; total: number }>()
        paiementsPeriod.forEach(p => {
            const key = paymentLabels[p.type] || p.type
            const b = modeBuckets.get(key) || { nb: 0, total: 0 }
            b.nb += 1
            b.total += Number(p.montant || 0)
            modeBuckets.set(key, b)
        })
        const rapprochementSheet = {
            sheetName: 'Rapprochement',
            title: 'RAPPROCHEMENT PAR MODE DE PAIEMENT',
            subtitle: subtitleBase,
            legalHeader: true,
            totalRow: true,
            columns: [
                { header: 'Mode de paiement', key: 'mode', width: 30 },
                { header: 'Nb transactions', key: 'nb', width: 18, type: 'number' as const, totalFormula: 'sum' as const },
                { header: 'Total encaissé (FCFA)', key: 'total', width: 22, type: 'currency' as const, totalFormula: 'sum' as const },
            ],
            data: Array.from(modeBuckets.entries()).map(([mode, v]) => ({ mode, nb: v.nb, total: v.total })),
        }

        // ── Sheet 7 : Synthèse
        const totalHT = docsRows.reduce((a, d) => a + (d.ht as number), 0)
        const totalTVA = docsRows.reduce((a, d) => a + (d.tva as number), 0)
        const totalRemise = docsRows.reduce((a, d) => a + (d.remise as number), 0)
        const totalTTC = docsRows.reduce((a, d) => a + (d.ttc as number), 0)
        const totalEncaisseManuel = paiementsPeriod.reduce((a, p) => a + Number(p.montant || 0), 0)
        const totalDepenses = expensesPeriod.reduce((a, e) => a + Number(e.montant || 0), 0)
        const beneficeNet = totalEncaisseManuel + stats.encaisse - totalDepenses

        const resumeSheet = {
            sheetName: 'Synthèse',
            title: 'SYNTHÈSE FINANCIÈRE',
            subtitle: subtitleBase,
            legalHeader: true,
            columns: [
                { header: 'Indicateur', key: 'label', width: 46 },
                { header: 'Valeur (FCFA)', key: 'value', width: 24, type: 'currency' as const },
            ],
            data: [
                { label: 'Chiffre d\'affaires HT facturé', value: totalHT },
                { label: 'TVA collectée', value: totalTVA },
                { label: 'Remises accordées', value: totalRemise },
                { label: 'Chiffre d\'affaires TTC facturé', value: totalTTC },
                { label: 'Encaissements (factures soldées statut payé)', value: stats.encaisse },
                { label: 'Encaissements manuels enregistrés', value: totalEncaisseManuel },
                { label: 'Total dépenses période', value: totalDepenses },
                { label: 'En attente d\'encaissement', value: stats.attente },
                { label: 'Bénéfice net estimé', value: beneficeNet },
                { label: `Commission agent (${(commissionRate * 100).toFixed(0)}%)`, value: stats.commission },
                { label: 'Nombre de factures émises', value: docsRows.filter(d => d.type === 'Facture').length },
                { label: 'Nombre de paiements enregistrés', value: paiementsPeriod.length },
                { label: 'Nombre de dépenses enregistrées', value: expensesPeriod.length },
            ],
        }

        await exportToExcelMultiSheet({
            filename: `RGB_Comptabilite_${periodSlug(selectedPeriod)}_${new Date().toISOString().split('T')[0]}`,
            coverTitle: 'Rapport comptable mensuel',
            coverSubtitle: 'À l\'attention du comptable — Document de synthèse officiel',
            coverPeriod: pLabel,
            sheets: [resumeSheet, journalSheet, docsSheet, lignesSheet, paiementsSheet, depensesSheet, rapprochementSheet],
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#060a10]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Chargement trésorerie...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 text-emerald-400">
                        <Landmark size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Trésorerie Réelle</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Espace <span className="text-emerald-400">Financier</span></h1>
                    <p className="text-nexus-text-muted text-sm mt-1">Plateforme de gestion analytique.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Sélecteur mois précis + navigation */}
                    <div className="flex items-center bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <button
                            type="button"
                            title="Mois précédent"
                            onClick={() => {
                                const base = isMonth(selectedPeriod) ? selectedPeriod : currentMonthKey()
                                setSelectedPeriod(shiftMonth(base, -1))
                                setCurrentPage(1)
                            }}
                            className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-white/5 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <select
                            value={selectedPeriod}
                            onChange={e => { setSelectedPeriod(e.target.value as Period); setCurrentPage(1) }}
                            title="Choisir une période"
                            className="bg-transparent px-3 py-2 text-xs font-bold text-white outline-none cursor-pointer min-w-[160px]"
                        >
                            {last12Months().map(m => (
                                <option key={m} value={m} className="bg-[#0c1420]">{monthLabel(m)}</option>
                            ))}
                            <option value="3_mois" className="bg-[#0c1420]">3 derniers mois</option>
                            <option value="tous" className="bg-[#0c1420]">Global (tout l&apos;historique)</option>
                        </select>
                        <button
                            type="button"
                            title="Mois suivant"
                            disabled={isMonth(selectedPeriod) && selectedPeriod >= currentMonthKey()}
                            onClick={() => {
                                const base = isMonth(selectedPeriod) ? selectedPeriod : currentMonthKey()
                                const next = shiftMonth(base, 1)
                                if (next <= currentMonthKey()) {
                                    setSelectedPeriod(next)
                                    setCurrentPage(1)
                                }
                            }}
                            className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <button 
                        onClick={() => fetchAllData()}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-emerald-400 transition-all"
                        title="Actualiser les données"
                    >
                        <RefreshCw size={18} />
                    </button>
                    
                    <button 
                        title={showRelancesOnly ? "Afficher tout" : "Afficher relances"}
                        onClick={() => { setShowRelancesOnly(!showRelancesOnly); setCurrentPage(1); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                            showRelancesOnly 
                                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        <AlertTriangle size={18} />
                        <span className="text-xs font-bold font-primary">Relances</span>
                    </button>

                    <button title="Exporter en CSV" onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all hover:bg-emerald-500/10">
                        <Download size={18} />
                        <span className="text-xs font-bold">Export</span>
                    </button>

                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-all font-bold"
                    >
                        <Plus size={18} />
                        <span className="text-xs">Dépense</span>
                    </button>

                    <button
                        onClick={() => {
                            setPaymentDoc(null)
                            setPaymentDocId('')
                            setNewPayment({ type: 'virement', montant: '', reference: '', notes: '', date: new Date().toISOString().split('T')[0] })
                            setShowPaymentModal(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all font-bold"
                        title="Enregistrer un paiement manuel"
                    >
                        <Banknote size={18} />
                        <span className="text-xs">Paiement</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Encaissé Réel', value: stats.encaisse, icon: Wallet, color: 'emerald', trend: stats.trends.encaisse },
                    { label: 'Bénéfice Net', value: stats.beneficeNet, icon: TrendingUp, color: 'sky', trend: stats.trends.benefice },
                    { label: 'Mes Dépenses', value: stats.depenses, icon: TrendingDown, color: 'rose', trend: null },
                    { label: 'Mes Commissions', value: stats.commission, icon: Zap, color: 'purple', trend: stats.trends.commission, isCommission: true },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-nexus-card p-6 group hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 rounded-xl bg-${s.color}-500/10 flex items-center justify-center`}>
                                <s.icon size={20} className={`text-${s.color}-400`} />
                            </div>
                            {s.trend && (
                                <div className={`flex items-center gap-1 text-[10px] font-bold ${s.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {s.trend.startsWith('+') ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                    {s.trend}%
                                </div>
                            )}
                        </div>
                        <p className="text-2xl font-black text-white mb-1 font-mono tracking-tighter">{formatCurrency(s.value)}</p>
                        <p className="text-[10px] text-nexus-text-muted font-bold uppercase tracking-widest">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Performance Graphs (RECHARTS) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-nexus-card p-6 min-h-[350px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Activity size={16} className="text-emerald-400" /> Flux de Revenus
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1 font-bold">Ventes encaissées sur la période sélectionnée</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 font-bold">Projection 30j</p>
                            <p className="text-lg font-black text-emerald-400 font-mono tracking-tighter">~ {formatCurrency(stats.projection30j)}</p>
                        </div>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0c1420', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-nexus-card p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center relative">
                        <TrendingUp size={32} className="text-emerald-400" />
                        <div className="absolute inset-0 animate-pulse bg-emerald-500/10 rounded-full" />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-xl">Score Prédictif</h4>
                        <p className="text-gray-500 text-xs mt-2 px-4 leading-relaxed">
                            Basé sur vos {periodDocs.length} derniers documents, votre croissance estimée est de <span className="text-emerald-400 font-bold">{stats.trends.encaisse || '0'}%</span>.
                        </p>
                    </div>
                    <div className="w-full pt-4 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <span>Santé Financière</span>
                            <span className="text-emerald-400">Stable</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 glass-nexus-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                            <BarChart3 size={16} className="text-emerald-400" /> Journal - Page {currentPage}/{totalPages}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    <th className="py-4 px-6">Document</th>
                                    <th className="py-4 px-6">Client</th>
                                    <th className="py-4 px-6 text-right">Total</th>
                                    <th className="py-4 px-6 text-right">Payé</th>
                                    <th className="py-4 px-6 text-right">Solde</th>
                                    <th className="py-4 px-6 text-center">État</th>
                                    <th className="py-4 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedDocs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-gray-500 italic text-sm">
                                            Aucun document trouvé pour cette sélection.
                                        </td>
                                    </tr>
                                ) : paginatedDocs.map((tx) => {
                                    const montantPaye = paiements[tx.id] || 0
                                    const solde = Math.max(0, tx.total - montantPaye)
                                    const isSolde = solde === 0 && tx.type === 'facture'
                                    return (
                                    <tr key={tx.id} className={`hover:bg-white/[0.02] transition-colors group ${solde > 0 && tx.type === 'facture' ? 'border-l-2 border-amber-500/40' : ''}`}>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <FileText size={15} className="text-emerald-400" />
                                                <div>
                                                    <p className="text-sm font-bold text-white">{tx.numero}</p>
                                                    <p className="text-[9px] text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-300">{tx.client_nom} {tx.client_prenom}</td>
                                        <td className="py-4 px-6 text-right font-mono text-sm font-bold text-white">{formatCurrency(tx.total)}</td>
                                        <td className="py-4 px-6 text-right font-mono text-sm text-emerald-400">
                                            {montantPaye > 0 ? formatCurrency(montantPaye) : <span className="text-gray-600">—</span>}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono text-sm">
                                            {tx.type === 'facture' ? (
                                                <span className={solde > 0 ? 'text-amber-400 font-bold' : 'text-gray-600'}>
                                                    {solde > 0 ? formatCurrency(solde) : '✓ Soldé'}
                                                </span>
                                            ) : <span className="text-gray-600">—</span>}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase border ${
                                                    isSolde || tx.status === 'paye' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    tx.status === 'envoye' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    tx.status === 'accepte' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                    'bg-gray-500/10 text-gray-400 border-white/10'
                                                }`}>
                                                    {isSolde ? 'payé' : tx.status}
                                                </span>
                                                {(tx.status === 'envoye' || tx.status === 'accepte') && (
                                                    <button
                                                        onClick={() => handleWhatsAppReminder(tx)}
                                                        className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                                                        title="Envoyer une relance WhatsApp"
                                                    >
                                                        <MessageCircle size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {tx.type === 'facture' && solde > 0 && (
                                                <button
                                                    type="button"
                                                    title="Enregistrer un paiement"
                                                    onClick={() => { setPaymentDoc(tx); setNewPayment(p => ({ ...p, montant: String(solde) })); setShowPaymentModal(true) }}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all text-[10px] font-bold border border-emerald-500/20"
                                                >
                                                    <Banknote size={12} />
                                                    Encaisser
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-white/5 flex justify-center gap-2">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-nexus-card p-6">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                             Répartition de l&apos;activité
                        </h3>
                        <div className="space-y-5">
                            {[
                                { label: 'Collecté', val: stats.encaisse, color: 'bg-emerald-500' },
                                { label: 'Signature en cours', val: stats.attente, color: 'bg-amber-500' },
                                { label: 'Autres', val: Math.max(0, stats.facture - stats.encaisse - stats.attente), color: 'bg-gray-500' },
                            ].map((item) => {
                                const pct = stats.facture > 0 ? (item.val / stats.facture) * 100 : 0
                                return (
                                    <div key={item.label}>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1.5">
                                            <span className="text-gray-500">{item.label}</span>
                                            <span className="text-white">{Math.round(pct)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl bg-white w-20 h-20 rounded-full" />
                        <CheckCircle2 size={24} className="mb-4 relative z-10" />
                        <h4 className="text-lg font-black mb-2 relative z-10">Conseil de Trésorerie</h4>
                        <p className="text-white/80 text-xs leading-relaxed relative z-10">
                            {stats.attente > 0 
                                ? `Vous avez ${formatCurrency(stats.attente)} qui dorment. Relancez vos clients pour débloquer vos commissions !`
                                : "Excellent travail ! Votre trésorerie est parfaitement convertie."}
                        </p>
                        <button 
                            onClick={() => window.location.href='/agent/devis'}
                            className="mt-6 w-full py-2.5 bg-white text-emerald-800 font-bold rounded-xl text-xs hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 relative z-10"
                        >
                            Ouvrir les Devis <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ALARM BANNER — Factures non soldées */}
            {(() => {
                const nonSoldees = allDocs.filter(d => d.type === 'facture' && (paiements[d.id] || 0) < d.total && d.status !== 'annule')
                const totalRestant = nonSoldees.reduce((a, d) => a + Math.max(0, d.total - (paiements[d.id] || 0)), 0)
                if (nonSoldees.length === 0) return null
                return (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl border"
                        style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                                <Bell size={16} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-amber-300">
                                    {nonSoldees.length} facture{nonSoldees.length > 1 ? 's' : ''} non soldée{nonSoldees.length > 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-amber-500/70">{formatCurrency(totalRestant)} restants à encaisser</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowRelancesOnly(true)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/15 transition-all flex-shrink-0"
                        >
                            Voir tout
                        </button>
                    </motion.div>
                )
            })()}

            {/* EXPENSE MODAL */}
            <AnimatePresence>
                {showExpenseModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowExpenseModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={e => e.stopPropagation()} className="glass-nexus-card w-full max-w-md overflow-hidden bg-[#0c1420]">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-lg font-black text-white">Ajouter une Dépense</h3>
                                <button title="Fermer" onClick={() => setShowExpenseModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Libellé</label>
                                    <input required value={newExpense.titre} onChange={e => setNewExpense({...newExpense, titre: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm" placeholder="ex: Publicité Facebook" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Montant (XOF)</label>
                                        <input required type="number" value={newExpense.montant} onChange={e => setNewExpense({...newExpense, montant: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm font-mono" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Catégorie</label>
                                        <select title="Catégorie de dépense" value={newExpense.categorie} onChange={e => setNewExpense({...newExpense, categorie: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm appearance-none">
                                            <option value="marketing">Marketing</option>
                                            <option value="operationnel">Opérationnel</option>
                                            <option value="logistique">Logistique</option>
                                            <option value="autre">Autre</option>
                                        </select>
                                    </div>
                                </div>
                                <button disabled={savingExpense} type="submit" className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                                    {savingExpense ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />} Enregistrer la dépense
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PAYMENT MODAL */}
            <AnimatePresence>
                {showPaymentModal && (() => {
                    const selectedDoc = paymentDoc || (paymentDocId ? allDocs.find(d => d.id === paymentDocId) || null : null)
                    const solde = selectedDoc ? Math.max(0, selectedDoc.total - (paiements[selectedDoc.id] || 0)) : 0
                    const selectableDocs = allDocs
                        .filter(d => d.type === 'facture')
                        .filter(d => (d.total - (paiements[d.id] || 0)) > 0 || d.status !== 'paye')
                    return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={e => e.stopPropagation()} className="glass-nexus-card w-full max-w-md overflow-hidden bg-[#0c1420]">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-white">Enregistrer un Paiement</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{selectedDoc ? `${selectedDoc.numero} — ${selectedDoc.client_nom} ${selectedDoc.client_prenom}` : paymentMode === 'externe' ? 'Paiement externe (facture hors site)' : 'Choisir une facture à encaisser'}</p>
                                </div>
                                <button title="Fermer" onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                            </div>
                            {!paymentDoc && (
                                <div className="px-6 pt-4 pb-0 space-y-3">
                                    {/* Toggle site / externe */}
                                    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMode('site')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${paymentMode === 'site' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Facture du site
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPaymentMode('externe')
                                                setPaymentDocId('')
                                            }}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${paymentMode === 'externe' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Facture Externe
                                        </button>
                                    </div>

                                    {paymentMode === 'site' ? (
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Facture concernée</label>
                                            <select
                                                title="Facture à encaisser"
                                                required
                                                value={paymentDocId}
                                                onChange={e => {
                                                    const id = e.target.value
                                                    setPaymentDocId(id)
                                                    const d = allDocs.find(x => x.id === id)
                                                    if (d) {
                                                        const s = Math.max(0, d.total - (paiements[d.id] || 0))
                                                        setNewPayment(p => ({ ...p, montant: s > 0 ? String(s) : String(d.total) }))
                                                    }
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm"
                                            >
                                                <option value="" disabled>— Sélectionnez une facture —</option>
                                                {selectableDocs.length === 0 && <option value="" disabled>Aucune facture disponible</option>}
                                                {selectableDocs.map(d => (
                                                    <option key={d.id} value={d.id} className="bg-[#0c1420]">
                                                        {d.numero} — {d.client_nom} {d.client_prenom} — {formatCurrency(Math.max(0, d.total - (paiements[d.id] || 0)))} restant
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Libellé <span className="text-[#E8112D]">*</span></label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={externePayment.libelle}
                                                    onChange={e => setExternePayment(p => ({ ...p, libelle: e.target.value }))}
                                                    className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none text-sm"
                                                    placeholder="Ex: Prestation conseil, Vente accessoires..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Client / Bénéficiaire <span className="normal-case text-gray-600">(optionnel)</span></label>
                                                <input
                                                    type="text"
                                                    value={externePayment.client}
                                                    onChange={e => setExternePayment(p => ({ ...p, client: e.target.value }))}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none text-sm"
                                                    placeholder="Nom du client / société"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {selectedDoc && (
                                <div className="px-6 pt-4 pb-0">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                                        <span className="text-xs text-gray-500">Solde restant</span>
                                        <span className="text-base font-black text-amber-400">{formatCurrency(solde)}</span>
                                    </div>
                                </div>
                            )}
                            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Mode de paiement</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { val: 'virement', icon: CreditCard, label: 'Virement' },
                                            { val: 'especes', icon: Banknote, label: 'Espèces' },
                                            { val: 'cheque', icon: FileText, label: 'Chèque' },
                                            { val: 'mobile_money', icon: Zap, label: 'Mobile M.' },
                                            { val: 'carte', icon: CreditCard, label: 'Carte' },
                                            { val: 'autre', icon: Wallet, label: 'Autre' },
                                        ].map(opt => (
                                            <button key={opt.val} type="button" onClick={() => setNewPayment(p => ({ ...p, type: opt.val }))}
                                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[10px] font-bold transition-all ${newPayment.type === opt.val ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-white'}`}>
                                                <opt.icon size={16} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Montant (XOF)</label>
                                        <input required type="number" min="1" value={newPayment.montant} onChange={e => setNewPayment(p => ({ ...p, montant: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm font-mono" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date</label>
                                        <input type="date" title="Date du paiement" value={newPayment.date} onChange={e => setNewPayment(p => ({ ...p, date: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Référence <span className="normal-case text-gray-600">(optionnel)</span></label>
                                    <input type="text" value={newPayment.reference} onChange={e => setNewPayment(p => ({ ...p, reference: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm" placeholder="N° de virement, chèque..." />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notes <span className="normal-case text-gray-600">(optionnel)</span></label>
                                    <textarea rows={2} value={newPayment.notes} onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm resize-none" placeholder="Commentaire..." />
                                </div>
                                <button disabled={savingPayment || !newPayment.montant || (paymentMode === 'site' ? !selectedDoc : !externePayment.libelle.trim())} type="submit"
                                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                                    {savingPayment ? <RefreshCw size={18} className="animate-spin" /> : <Banknote size={18} />} Confirmer l&apos;encaissement
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )
                })()}
            </AnimatePresence>
        </div>
    )
}

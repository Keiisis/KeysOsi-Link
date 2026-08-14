import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
    View, Text, StyleSheet, ScrollView, Image, Linking,
    StatusBar, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
    Bell, FolderOpen, MessageSquare, FileText, CreditCard,
    Calendar, Headphones, HelpCircle, ShieldCheck, ShoppingBag,
    BadgeCheck, ChevronRight, ArrowRight, FileCheck2, Phone, Clock,
} from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, {
    useSharedValue, useAnimatedStyle,
    withSpring, withTiming, withDelay, Easing,
} from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { useLang } from '../../contexts/LangContext'
import { authHeaders } from '../../config/api'
import { fetchWithTimeout } from '../../lib/fetch'
import { colors, typography, spacing, radius, shadows } from '../../config/theme'
import { FlagBar, Card, IconTile } from '../../components/ui'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

interface DossierInfo { status: string; progress: number; service_type: string | null }
interface RdvInfo { id: string; date: string | null; heure: string | null; type: string; statut: string; motif: string | null; notes: string | null }

/* RDV : libellés d'affichage (source rdv_requests, statuts partagés avec le web). */
const RDV_STATUT_LABEL: Record<string, string> = {
    en_attente: 'En attente de confirmation',
    confirme: 'Rendez-vous confirmé', confirmed: 'Rendez-vous confirmé',
}
const RDV_TYPE_LABEL: Record<string, string> = {
    visio: 'Visioconférence', telephone: 'Par téléphone', presentiel: 'En présentiel',
}
/* Titre du RDV : on récupère le service depuis les notes (« Demande concernant : X. »)
   posées à la prise de RDV, sinon le motif, sinon un libellé générique. */
function rdvServiceLabel(r: RdvInfo): string {
    const notes = r.notes || ''
    const m = notes.match(/Demande concernant\s*:\s*([^.\n]+)/i)
    if (m) return m[1].trim()
    if (r.motif) return r.motif
    return 'Consultation'
}
function rdvWhen(r: RdvInfo): string {
    if (!r.date) return ''
    const d = new Date(`${r.date}T${(r.heure || '09:00').slice(0, 5)}:00`)
    if (isNaN(d.getTime())) return ''
    const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const heure = (r.heure || '').slice(0, 5)
    return heure ? `${jour} à ${heure}` : jour
}

/* Étapes réelles du cycle de vie d'un dossier (voir mobile/CLAUDE.md).
   Sert à afficher « Étape n sur 5 » sans inventer de valeur. */
const STATUS_STEPS = ['soumis', 'verifie', 'traitement', 'validation', 'termine'] as const
const STATUS_LABEL: Record<string, string> = {
    soumis: 'Dossier soumis', verifie: 'En vérification', traitement: 'En traitement',
    validation: 'En validation', termine: 'Terminé', annule: 'Annulé',
}
const STATUS_HINT: Record<string, string> = {
    soumis: 'Votre dossier a bien été reçu. Un agent va le prendre en charge.',
    verifie: 'Vérification de vos pièces justificatives en cours.',
    traitement: 'Traitement du dossier par l\'administration compétente.',
    validation: 'Dernière validation avant délivrance de votre document.',
    termine: 'Votre dossier est finalisé. Vous pouvez récupérer vos documents.',
    annule: 'Ce dossier a été annulé. Contactez votre conseiller pour en savoir plus.',
}

/* Entrée échelonnée des sections : un seul effet, pas de boucle infinie. */
const AnimatedSection = ({ delay = 0, children, style }: any) => {
    const o = useSharedValue(0); const y = useSharedValue(14)
    useEffect(() => {
        o.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }))
        y.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 120 }))
    }, [])
    const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }))
    return <Animated.View style={[s, style]}>{children}</Animated.View>
}

export default function HomeScreen({ navigation }: { navigation: { navigate: (route: string, params?: object) => void } }) {
    const insets = useSafeAreaInsets()
    const { profile } = useAuth()
    const { t } = useLang()
    const [dossier, setDossier] = useState<DossierInfo | null>(null)
    const [rdv, setRdv] = useState<RdvInfo | null>(null)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [unreadNotifs, setUnreadNotifs] = useState(0)
    const [advisor, setAdvisor] = useState<string | null>(null)

    const progressAnim = useSharedValue(0)
    useEffect(() => {
        if (dossier) {
            progressAnim.value = withDelay(350, withSpring(
                Math.max(0, Math.min(100, dossier.progress)),
                { damping: 18, stiffness: 90 },
            ))
        }
    }, [dossier])
    const progressBarStyle = useAnimatedStyle(() => ({ width: `${progressAnim.value}%` }))

    /* ─── Données (logique inchangée) ─── */
    const fetchData = async () => {
        if (!profile) return
        try {
            const [dossierRes, rdvRes, notifRes, conversationRes] = await Promise.all([
                supabase.from('dossiers').select('status, progress, service_type')
                    .eq('client_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
                /* RDV/consultation actif le plus récent : source `rdv_requests`
                   (même table que « Mes rendez-vous »). On surface le dernier
                   pris pour qu'il soit visible dès la prise, avant même
                   l'ouverture d'un dossier facturé. */
                supabase.from('rdv_requests').select('id, date, heure, type, statut, motif, notes')
                    .or(`client_id.eq.${profile.id},client_email.eq.${profile.email}`)
                    .in('statut', ['en_attente', 'confirme', 'confirmed'])
                    .order('created_at', { ascending: false }).limit(1).maybeSingle(),
                supabase.from('notifications').select('*', { count: 'exact', head: true })
                    .eq('user_id', profile.id).eq('is_read', false),
                supabase.from('messages').select('id')
                    .eq('client_id', profile.id).eq('type', 'chat')
                    .order('created_at', { ascending: false }).limit(1).maybeSingle(),
            ])
            if (dossierRes.data) setDossier(dossierRes.data as DossierInfo)
            setRdv(rdvRes.data ? (rdvRes.data as RdvInfo) : null)
            setUnreadNotifs(notifRes.count || 0)
            if (conversationRes.data?.id) {
                const lastSeenKey = `@rg_chat_last_seen_${profile.id}`
                const lastSeenIso = await AsyncStorage.getItem(lastSeenKey).catch(() => null)
                let q = supabase.from('chat_messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', conversationRes.data.id).eq('role', 'agent')
                if (lastSeenIso) q = q.gt('created_at', lastSeenIso)
                const { count } = await q
                setUnreadMessages(count || 0)
            } else { setUnreadMessages(0) }
        } catch { /* silencieux */ }
    }
    /* Sans cela, revenir de la messagerie laissait le compteur de messages
       non lus fige : `profile` n'ayant pas change, fetchData ne rejouait pas. */
    useEffect(() => { fetchData() }, [profile])
    useFocusEffect(useCallback(() => { fetchData() }, [profile]))

    /* Temps réel : dès qu'un agent confirme/refuse un RDV (rdv_requests) ou fait
       évoluer un dossier, la carte « Suivi » se met à jour en direct, sans avoir
       à quitter l'accueil. La notification in-app arrive en parallèle (cloche). */
    useEffect(() => {
        if (!profile?.id) return
        const ch = supabase
            .channel('home-suivi')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_requests', filter: `client_id=eq.${profile.id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers', filter: `client_id=eq.${profile.id}` }, () => fetchData())
            .subscribe()
        return () => { supabase.removeChannel(ch) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id])

    /* Conseiller reellement assigne (dossier_tracking.agent_assigne, expose par
       /api/mobile/dossiers). Sans assignation, on garde « Equipe RGB » : on
       n'affiche jamais un nom qui n'existe pas. */
    useEffect(() => {
        let alive = true
        const loadAdvisor = async () => {
            try {
                const res = await fetchWithTimeout(
                    `${API_BASE}/api/mobile/dossiers`,
                    { timeoutMs: 8000, headers: { ...(await authHeaders()) } },
                )
                const json = await res.json().catch(() => ({}))
                if (alive && json?.advisor?.name) setAdvisor(String(json.advisor.name))
            } catch { /* silencieux : le repli suffit */ }
        }
        if (profile) loadAdvisor()
        return () => { alive = false }
    }, [profile])

    /* ─── Dérivations ─── */
    const getGreeting = () => {
        const h = new Date().getHours()
        return h < 12 ? t('Bonjour') : h < 18 ? t('Bon après-midi') : t('Bonsoir')
    }
    const stepIndex = dossier ? STATUS_STEPS.indexOf(dossier.status as typeof STATUS_STEPS[number]) : -1
    const stepLabel = stepIndex >= 0
        ? `${t('Étape')} ${stepIndex + 1} ${t('sur')} ${STATUS_STEPS.length}`
        : dossier ? t(STATUS_LABEL[dossier.status] || dossier.status) : ''

    const SHORTCUTS = useMemo(() => ([
        { icon: FolderOpen, label: t('Dossiers'), tone: 'primary' as const, dest: 'Dossier' },
        { icon: MessageSquare, label: t('Messages'), tone: 'accent' as const, badge: unreadMessages, dest: 'Messages' },
        { icon: FileText, label: t('Documents'), tone: 'neutral' as const, dest: 'Signature' },
    ]), [unreadMessages, t])

    const HIGHLIGHTS = useMemo(() => ([
        {
            icon: BadgeCheck, tone: 'primary' as const, dest: 'NationaliteForm',
            title: t('Nationalité béninoise'), desc: t('Constituez votre dossier de reconnaissance.'),
        },
        {
            icon: ShoppingBag, tone: 'accent' as const, dest: 'Boutique',
            title: t('Boutique RGB'), desc: t('Artisanat et objets du patrimoine béninois.'),
        },
    ]), [t])

    const SECONDARY = useMemo(() => ([
        { icon: Calendar, label: t('Rendez-vous'), desc: t('Planifier un entretien'), dest: 'Appointments' },
        { icon: CreditCard, label: t('Paiements'), desc: t('Factures et règlements'), dest: 'Payments' },
        { icon: Headphones, label: t('Support'), desc: t('Assistance dédiée'), dest: 'Messages' },
        { icon: HelpCircle, label: t('Aide & FAQ'), desc: t('Questions fréquentes'), dest: 'FAQ' },
    ]), [t])

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            {/* La tab bar n'est PAS en superposition : elle occupe sa propre
                place dans la mise en page (voir MainTabNavigator, `barOuter`
                sans position absolue) et applique elle-même la marge de la
                barre système. Le contenu s'arrête donc déjà au-dessus d'elle.
                Un `insets.bottom + 72` supplémentaire ajoutait de 96 à 120 px
                de vide sous le dernier élément : le blanc visible en bas de
                l'accueil. Seule reste ici la respiration normale de fin de
                page. Ne pas y réintroduire insets.bottom. */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.lg }}
            >
                {/* ── Liseré tricolore : signature de marque ── */}
                <View style={styles.topFlag}><FlagBar height={6} radiusTop={false} /></View>

                {/* ── En-tête ── */}
                <AnimatedSection delay={0} style={styles.header}>
                    <Pressable
                        onPress={() => navigation.navigate('Profil')}
                        accessibilityRole="button"
                        accessibilityLabel={t('Voir mon profil')}
                        style={styles.headerIdentity}
                        hitSlop={6}
                    >
                        <Text style={styles.greeting}>{getGreeting()},</Text>
                        <Text style={styles.userName} numberOfLines={1}>
                            {profile?.prenom || t('Bienvenue')}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => navigation.navigate('Notifications')}
                        accessibilityRole="button"
                        accessibilityLabel={
                            unreadNotifs > 0
                                ? `${t('Notifications')} : ${unreadNotifs} ${t('non lues')}`
                                : t('Notifications')
                        }
                        style={styles.bellBtn}
                        hitSlop={6}
                    >
                        <Bell size={20} color={colors.text} strokeWidth={1.9} />
                        {unreadNotifs > 0 && <View style={styles.bellDot} />}
                    </Pressable>
                </AnimatedSection>

                {/* ── Suivi : dossier OU rendez-vous ── */}
                <AnimatedSection delay={80} style={styles.section}>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>
                            {dossier ? t('Dossier en cours') : rdv ? t('Votre rendez-vous') : t('Dossier en cours')}
                        </Text>
                        {(dossier || rdv) && (
                            <Pressable
                                onPress={() => navigation.navigate(dossier ? 'Dossier' : 'Appointments')}
                                accessibilityRole="button"
                                hitSlop={8}
                                style={styles.linkRow}
                            >
                                <Text style={styles.linkText}>{t('Voir')}</Text>
                                <ArrowRight size={15} color={colors.primary} strokeWidth={2.2} />
                            </Pressable>
                        )}
                    </View>

                    {dossier ? (
                        <Card flagTop raised onPress={() => navigation.navigate('Dossier')}>
                            <View style={styles.dossierTop}>
                                <View style={styles.typeBadge}>
                                    <FolderOpen size={11} color={colors.primary} strokeWidth={2.5} />
                                    <Text style={styles.typeBadgeText}>{t('DOSSIER')}</Text>
                                </View>
                                <View style={styles.stepBadge}>
                                    <FileCheck2 size={14} color={colors.primary} strokeWidth={2.2} />
                                    <Text style={styles.stepBadgeText}>{stepLabel}</Text>
                                </View>
                            </View>

                            <Text style={styles.dossierTitle} numberOfLines={2}>
                                {dossier.service_type || t('Dossier en cours')}
                            </Text>

                            <View
                                accessible
                                accessibilityRole="progressbar"
                                accessibilityLabel={`${t('Avancement')} ${dossier.progress}%`}
                                style={styles.progressBg}
                            >
                                <Animated.View style={[styles.progressFill, progressBarStyle]} />
                            </View>

                            <Text style={styles.dossierHint}>
                                {t(STATUS_HINT[dossier.status] || STATUS_LABEL[dossier.status] || dossier.status)}
                            </Text>
                        </Card>
                    ) : rdv ? (
                        <Card flagTop raised onPress={() => navigation.navigate('Appointments')}>
                            <View style={styles.dossierTop}>
                                <View style={styles.typeBadgeRdv}>
                                    <Calendar size={11} color={colors.primary} strokeWidth={2.5} />
                                    <Text style={styles.typeBadgeText}>{t('RENDEZ-VOUS')}</Text>
                                </View>
                                <IconTile icon={Calendar} tone="primary" size={44} />
                            </View>

                            <Text style={styles.dossierTitle} numberOfLines={2}>
                                {t(rdvServiceLabel(rdv))}
                            </Text>

                            <View style={styles.rdvMetaRow}>
                                <Clock size={13} color={colors.textMuted} strokeWidth={2} />
                                <Text style={styles.rdvMetaText} numberOfLines={1}>
                                    {rdvWhen(rdv)}{rdv.type ? ` · ${t(RDV_TYPE_LABEL[rdv.type] || rdv.type)}` : ''}
                                </Text>
                            </View>

                            <View style={[styles.rdvStatus, rdv.statut.startsWith('confirm') && styles.rdvStatusOk]}>
                                <View style={[styles.rdvDot, rdv.statut.startsWith('confirm') && styles.rdvDotOk]} />
                                <Text style={[styles.rdvStatusText, rdv.statut.startsWith('confirm') && styles.rdvStatusTextOk]}>
                                    {t(RDV_STATUT_LABEL[rdv.statut] || 'En attente de confirmation')}
                                </Text>
                            </View>
                        </Card>
                    ) : (
                        <Card flagTop onPress={() => navigation.navigate('Services')}>
                            <View style={styles.dossierTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.dossierTitle}>{t('Aucun dossier ouvert')}</Text>
                                    <Text style={styles.dossierHint}>
                                        {t('Choisissez une prestation pour démarrer votre démarche.')}
                                    </Text>
                                </View>
                                <IconTile icon={FolderOpen} tone="neutral" size={48} />
                            </View>
                            <View style={styles.linkRow}>
                                <Text style={styles.linkText}>{t('Voir les prestations')}</Text>
                                <ArrowRight size={15} color={colors.primary} strokeWidth={2.2} />
                            </View>
                        </Card>
                    )}
                </AnimatedSection>

                {/* ── Raccourcis ── */}
                <AnimatedSection delay={160} style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Raccourcis')}</Text>
                    <View style={styles.shortcutRow}>
                        {SHORTCUTS.map((s) => (
                            <Pressable
                                key={s.dest}
                                onPress={() => navigation.navigate(s.dest)}
                                accessibilityRole="button"
                                accessibilityLabel={s.label}
                                style={({ pressed }) => [
                                    styles.shortcut,
                                    shadows.card,
                                    pressed && { transform: [{ scale: 0.97 }] },
                                ]}
                                hitSlop={6}
                            >
                                <View>
                                    <IconTile icon={s.icon} tone={s.tone} size={52} />
                                    {(s as any).badge > 0 && (
                                        <View style={styles.shortcutBadge}>
                                            <Text style={styles.shortcutBadgeText}>
                                                {(s as any).badge > 9 ? '9+' : (s as any).badge}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.shortcutLabel} numberOfLines={1}>{s.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </AnimatedSection>

                {/* ── Prestations mises en avant ── */}
                <AnimatedSection delay={240} style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('À la une')}</Text>
                    {HIGHLIGHTS.map((h) => (
                        <Card key={h.dest} onPress={() => navigation.navigate(h.dest)} style={styles.highlightCard}>
                            <View style={styles.highlightRow}>
                                <IconTile icon={h.icon} tone={h.tone} size={52} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.highlightTitle}>{h.title}</Text>
                                    <Text style={styles.highlightDesc} numberOfLines={2}>{h.desc}</Text>
                                </View>
                                <ChevronRight size={18} color={colors.textFaint} strokeWidth={2} />
                            </View>
                        </Card>
                    ))}
                </AnimatedSection>

                {/* ── Autres services ── */}
                <AnimatedSection delay={320} style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Autres services')}</Text>
                    <View style={[styles.listCard, shadows.card]}>
                        {SECONDARY.map((s, i) => (
                            <Pressable
                                key={s.dest + i}
                                onPress={() => navigation.navigate(s.dest)}
                                accessibilityRole="button"
                                accessibilityLabel={s.label}
                                style={({ pressed }) => [
                                    styles.listRow,
                                    i < SECONDARY.length - 1 && styles.listRowBorder,
                                    pressed && { backgroundColor: colors.surfaceMuted },
                                ]}
                                hitSlop={6}
                            >
                                <IconTile icon={s.icon} tone="neutral" size={42} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.listLabel}>{s.label}</Text>
                                    <Text style={styles.listDesc}>{s.desc}</Text>
                                </View>
                                <ChevronRight size={17} color={colors.textFaint} strokeWidth={2} />
                            </Pressable>
                        ))}
                    </View>
                </AnimatedSection>
                {/* ── Barre d'assistance ──
                Volontairement sans nom de conseiller : l'agent assigné vit dans
                dossier_tracking.agent_assigne, qui n'est pas encore exposé à
                l'app. Afficher un prénom ici serait inventé. Les deux actions
                pointent vers les canaux réels (chat in-app, ligne de l'agence). */}
                <View style={styles.advisorBar}>
                <Image
                    source={require('../../../assets/images/conseillere.webp')}
                    style={styles.advisorAvatar}
                    accessible={false}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.advisorLabel}>
                        {advisor ? t('VOTRE CONSEILLER') : t('ASSISTANCE')}
                    </Text>
                    <Text style={styles.advisorName} numberOfLines={1}>
                        {advisor || t('Équipe RGB')}
                    </Text>
                </View>
                <Pressable
                    onPress={() => navigation.navigate('Messages')}
                    accessibilityRole="button"
                    accessibilityLabel={t('Ouvrir la messagerie')}
                    style={styles.advisorBtnGhost}
                    hitSlop={6}
                >
                    <MessageSquare size={19} color={colors.floatingText} strokeWidth={2} />
                </Pressable>
                <Pressable
                    onPress={() => navigation.navigate("Call", { sujet: "Appel depuis l'accueil" })}
                    accessibilityRole="button"
                    accessibilityLabel={t('Appeler un conseiller')}
                    style={styles.advisorBtnCall}
                    hitSlop={6}
                >
                    <Phone size={19} color={colors.textOnPrimary} strokeWidth={2} />
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    topFlag: {
        marginHorizontal: spacing.gutter,
        marginTop: spacing.sm,
        borderRadius: radius.pill,
        overflow: 'hidden',
    },

    /* ── En-tête ── */
    header: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.lg, paddingBottom: spacing.md,
    },
    headerIdentity: { flex: 1 },
    greeting: { ...typography.overline, color: colors.textFaint },
    userName: { ...typography.h1, color: colors.text, marginTop: spacing.xs },
    bellBtn: {
        width: 48, height: 48, borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.card,
    },
    bellDot: {
        position: 'absolute', top: 11, right: 12,
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: colors.danger,
        borderWidth: 2, borderColor: colors.surface,
    },

    /* ── Sections ── */
    section: { paddingHorizontal: spacing.gutter, marginBottom: spacing.lg },
    sectionRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: spacing.md,
    },
    sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
    linkText: { ...typography.label, color: colors.primary },

    /* ── Carte dossier ── */
    dossierTop: {
        flexDirection: 'row', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: spacing.md,
    },
    stepBadge: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.accentSoft,
        paddingHorizontal: spacing.md, paddingVertical: 9,
        borderRadius: radius.pill, alignSelf: 'flex-start',
    },
    stepBadgeText: { ...typography.label, color: colors.primary },

    /* ── Badges de TYPE (distinction chic Dossier / Rendez-vous) ── */
    typeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primarySoft,
        paddingHorizontal: spacing.md, paddingVertical: 7,
        borderRadius: radius.pill, alignSelf: 'flex-start',
    },
    typeBadgeRdv: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.surface,
        borderWidth: 1.5, borderColor: colors.primary,
        paddingHorizontal: spacing.md, paddingVertical: 6,
        borderRadius: radius.pill, alignSelf: 'flex-start',
    },
    typeBadgeText: { ...typography.label, fontSize: 10, color: colors.primary, letterSpacing: 1.2 },

    /* ── Carte Rendez-vous ── */
    rdvMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.sm },
    rdvMetaText: { ...typography.body, fontSize: 13, color: colors.textMuted, flex: 1 },
    rdvStatus: {
        flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
        backgroundColor: colors.surfaceMuted,
        paddingHorizontal: spacing.md, paddingVertical: 7,
        borderRadius: radius.pill, marginTop: spacing.md,
    },
    rdvStatusOk: { backgroundColor: colors.primarySoft },
    rdvDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
    rdvDotOk: { backgroundColor: colors.primary },
    rdvStatusText: { ...typography.label, fontSize: 12, color: colors.textMuted },
    rdvStatusTextOk: { color: colors.primary },

    dossierTitle: { ...typography.h2, color: colors.text, marginTop: spacing.md },
    progressBg: {
        height: 8, borderRadius: radius.pill, overflow: 'hidden',
        backgroundColor: colors.surfaceMuted, marginTop: spacing.md,
    },
    progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
    dossierHint: { ...typography.body, color: colors.textMuted, marginTop: spacing.md },

    /* ── Raccourcis ── */
    shortcutRow: { flexDirection: 'row', gap: spacing.md },
    shortcut: {
        flex: 1, alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.surface, borderRadius: radius.xl,
        paddingVertical: spacing.lg, paddingHorizontal: spacing.sm,
    },
    shortcutLabel: { ...typography.label, color: colors.text, textAlign: 'center' },
    shortcutBadge: {
        position: 'absolute', top: -4, right: -4,
        minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: radius.pill,
        backgroundColor: colors.danger,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.surface,
    },
    shortcutBadgeText: { ...typography.caption, fontSize: 12, color: colors.textOnPrimary },

    /* ── À la une ── */
    highlightCard: { marginBottom: spacing.md },
    highlightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    highlightTitle: { ...typography.h3, color: colors.text },
    highlightDesc: { ...typography.bodySmall, color: colors.textMuted, marginTop: spacing.xs },

    /* ── Liste ── */
    listCard: {
        backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden',
    },
    listRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    },
    listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    listLabel: { ...typography.label, fontSize: 15, color: colors.text },
    listDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

    /* ── Engagement ── */

    /* ── Barre d'assistance ── */
    advisorBar: {
        marginHorizontal: spacing.gutter,
        marginTop: spacing.sm,
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.floating,
        borderRadius: radius.pill,
        paddingLeft: spacing.sm, paddingRight: spacing.sm, paddingVertical: spacing.sm,
        ...shadows.floating,
    },
    advisorAvatar: { width: 44, height: 44, borderRadius: radius.pill },
    advisorLabel: { ...typography.overline, fontSize: 12, color: colors.floatingMuted },
    advisorName: { ...typography.label, color: colors.floatingText, marginTop: 1 },
    advisorBtnGhost: {
        width: 44, height: 44, borderRadius: radius.pill,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    advisorBtnCall: {
        width: 44, height: 44, borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },

})

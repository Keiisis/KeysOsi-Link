import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert,
} from 'react-native'
import { Clock, HelpCircle, MessageCircle, Send, Users } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'

/* ── Types ── */
interface ChatMessage {
    id: string
    conversation_id: string
    role: 'client' | 'agent'
    content: string
    created_at: string
}

/* ─────────────────────────────────────────────────────────
   Messages Screen — Messagerie temps réel avec l'équipe RGB
   
   Architecture:
   - `messages` table = conversation headers (one per user thread)
   - `chat_messages` table = individual messages within a thread
   
   Flow:
   1. On mount, find or create the user's conversation in `messages`
   2. Load chat history from `chat_messages`
   3. New messages go into `chat_messages`, NOT new rows in `messages`
   4. Realtime listens on `chat_messages` for instant agent replies
───────────────────────────────────────────────────────── */

export default function MessagesScreen() {
    const { profile } = useAuth()
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const { t } = useLang()
    const [loading, setLoading] = useState(true)
    const flatListRef = useRef<FlatList>(null)

    /* ── 1. Find or create the conversation thread ── */
    const findOrCreateConversation = useCallback(async () => {
        if (!profile) return

        // Look for an existing chat conversation for this client
        const { data: existing, error: findErr } = await supabase
            .from('messages')
            .select('id')
            .eq('client_id', profile.id)
            .eq('type', 'chat')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (findErr) {
            console.warn('[Messages] Find conversation error:', findErr.message)
        }

        if (existing) {
            setConversationId(existing.id)
            return existing.id
        }

        // No existing conversation — will be created on first message send
        return null
    }, [profile])

    /* ── 2. Load chat history from chat_messages ── */
    const fetchChatHistory = useCallback(async (convId: string) => {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('id, conversation_id, role, content, created_at')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })
            .limit(200)

        if (!error && data) {
            setChatMessages(data as ChatMessage[])
        } else if (error) {
            console.warn('[Messages] Fetch chat history error:', error.message)
        }
        setLoading(false)
    }, [])

    /* ── Init: find conversation + load history + reset unread badge ── */
    useEffect(() => {
        const init = async () => {
            const convId = await findOrCreateConversation()
            if (convId) {
                await fetchChatHistory(convId)
            } else {
                setLoading(false)
            }
            // Marquer cet écran comme "vu" pour le badge unread du HomeScreen
            if (profile?.id) {
                AsyncStorage.setItem(`@rg_chat_last_seen_${profile.id}`, new Date().toISOString())
                    .catch(() => {})
            }
        }
        init()
    }, [findOrCreateConversation, fetchChatHistory, profile?.id])

    /* ── 3. Realtime: listen for new chat_messages ── */
    useEffect(() => {
        if (!conversationId) return

        const channel = supabase
            .channel(`chat-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const msg = payload.new as ChatMessage
                    setChatMessages(prev => {
                        // Deduplicate (avoid adding if optimistic version exists)
                        if (prev.find(m => m.id === msg.id)) return prev
                        // Replace temp message if it matches content
                        const tempIndex = prev.findIndex(
                            m => m.id.startsWith('temp-') && m.content === msg.content && m.role === msg.role
                        )
                        if (tempIndex >= 0) {
                            const updated = [...prev]
                            updated[tempIndex] = msg
                            return updated
                        }
                        return [...prev, msg]
                    })
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [conversationId])

    /* ── 4. Send a message ── */
    const sendMessage = async () => {
        if (!newMessage.trim() || !profile || sending) return
        const text = newMessage.trim()
        setNewMessage('')
        setSending(true)

        let activeConvId = conversationId

        // If no conversation exists yet, create one in `messages` table
        if (!activeConvId) {
            const { data: convData, error: convErr } = await supabase
                .from('messages')
                .insert({
                    message: text,
                    client_id: profile.id,
                    sender_id: null,
                    recipient_id: null,
                    type: 'chat',
                    nom: profile.nom || '',
                    prenom: profile.prenom || '',
                    email: profile.email || '',
                    telephone: profile.phone || '',
                    sujet: `💬 Chat — ${profile.prenom || ''} ${profile.nom || ''}`.trim(),
                    is_read: false,
                    lu: false,
                })
                .select('id')
                .single()

            if (convErr || !convData) {
                console.warn('[Messages] Create conversation error:', convErr?.message)
                setSending(false)
                Alert.alert(t('Erreur'), t('Impossible de démarrer la conversation.'))
                return
            }

            activeConvId = convData.id
            setConversationId(activeConvId)
        }

        // Optimistic add
        const tempId = `temp-${Date.now()}`
        const tempMsg: ChatMessage = {
            id: tempId,
            conversation_id: activeConvId!,
            role: 'client',
            content: text,
            created_at: new Date().toISOString(),
        }
        setChatMessages(prev => [...prev, tempMsg])
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)

        // Insert the actual message into chat_messages
        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                conversation_id: activeConvId,
                role: 'client',
                content: text,
            })
            .select('id, conversation_id, role, content, created_at')
            .single()

        setSending(false)

        if (error) {
            console.warn('[Messages] Send chat_message error:', error.message, error.code)
            setChatMessages(prev => prev.filter(m => m.id !== tempId))
            Alert.alert(t('Erreur'), t('Impossible d\'envoyer le message. Vérifiez votre connexion.'))
        } else if (data) {
            // Replace optimistic message with the real one
            setChatMessages(prev => prev.map(m => m.id === tempId ? data as ChatMessage : m))
        }
    }

    /* ── Helpers ── */
    const fmtTime = (d: string) =>
        new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
        const isMe = item.role === 'client'
        const isTemp = item.id.startsWith('temp-')
        const showDate = index === 0 ||
            fmtDate(chatMessages[index - 1].created_at) !== fmtDate(item.created_at)

        return (
            <>
                {showDate && (
                    <View style={styles.dateSep}>
                        <View style={styles.dateLine} />
                        <Text style={styles.dateText}>{fmtDate(item.created_at)}</Text>
                        <View style={styles.dateLine} />
                    </View>
                )}
                <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
                    {!isMe && (
                        <View style={styles.agentAvatar}>
                            <Users size={14} color={colors.primary} strokeWidth={1.75} />
                        </View>
                    )}
                    <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                        {!isMe && (
                            <Text style={styles.agentName}>{t('Équipe RGB')}</Text>
                        )}
                        <Text style={[styles.bubbleText, isMe ? styles.myText : styles.theirText]}>
                            {item.content}
                        </Text>
                        <View style={styles.bubbleMeta}>
                            <Text style={[styles.bubbleTime, isMe ? styles.myTime : styles.theirTime]}>
                                {fmtTime(item.created_at)}
                            </Text>
                            {isMe && (
                                isTemp
                                    ? <Clock size={12} color="rgba(255,255,255,0.5)" strokeWidth={1.75} />
                                    : <Ionicons
                                        name="checkmark-done"
                                        size={13}
                                        color="rgba(255,255,255,0.6)"
                                    />
                            )}
                        </View>
                    </View>
                </View>
            </>
        )
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.primaryLine} />
                <View style={styles.headerRow}>
                    <View style={styles.headerAvatarWrap}>
                        <Users size={18} color={colors.primary} strokeWidth={1.75} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>{t('Équipe Retour Gagnant')}</Text>
                        <View style={styles.onlineRow}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>{t('En ligne — répond sous 2h')}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Zone messages */}
            {loading ? (
                <View style={styles.loadingState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={styles.loadingText}>{t('Chargement des messages…')}</Text>
                </View>
            ) : chatMessages.length === 0 ? (
                <View style={styles.empty}>
                    <View style={styles.emptyIconWrap}>
                        <MessageCircle size={40} color={colors.primary} strokeWidth={1.75} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('Démarrez la conversation')}</Text>
                    <Text style={styles.emptyText}>
                        {t('Envoyez un message à notre équipe pour être accompagné dans votre projet de retour au Bénin.')}
                    </Text>
                    {/* Suggestions rapides */}
                    <View style={styles.suggestionsWrap}>
                        {[
                            t('Bonjour, je souhaite des informations sur la nationalité béninoise.'),
                            t('Comment fonctionne le service de recherche ancestrale ?'),
                            t('Quels documents faut-il pour initier un dossier ?'),
                        ].map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.suggestion}
                                onPress={() => setNewMessage(s)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
                                <Text style={styles.suggestionText}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={chatMessages}
                    keyExtractor={i => i.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />
            )}

            {/* Barre d'envoi */}
            <View style={styles.inputBar}>
                <View style={styles.inputWrap}>
                    <TextInput
                        style={styles.input}
                        placeholder={t('Votre message…')}
                        placeholderTextColor={colors.textMuted}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        maxLength={1000}
                        onSubmitEditing={Platform.OS === 'ios' ? sendMessage : undefined}
                    />
                </View>
                <TouchableOpacity
                    style={[
                        styles.sendBtn,
                        (!newMessage.trim() || sending) && styles.sendBtnDisabled,
                    ]}
                    onPress={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    activeOpacity={0.7}
                >
                    {sending ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Send size={18} color="#FFF" strokeWidth={1.75} />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 16,
        paddingHorizontal: spacing.lg,
    },
    primaryLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerAvatarWrap: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: colors.primary + '40',
    },
    headerTitle: { ...typography.label, fontSize: 15, color: colors.textOnDark },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#4ADE80' },
    onlineText: { fontSize: 11, color: colors.primary + 'AA', fontFamily: 'Inter_500Medium' },

    loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { ...typography.bodySmall, color: colors.textSecondary },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
    emptyText: {
        ...typography.bodySmall, color: colors.textSecondary,
        textAlign: 'center', lineHeight: 22, marginBottom: 24,
    },
    suggestionsWrap: { width: '100%', gap: 8 },
    suggestion: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: colors.surface,
        borderRadius: radius.md, padding: 12,
        borderWidth: 1, borderColor: colors.primary + '25',
    },
    suggestionText: {
        ...typography.caption, color: colors.textSecondary,
        flex: 1, lineHeight: 18,
    },

    list: { padding: spacing.md, paddingBottom: 8 },
    dateSep: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginVertical: spacing.md,
    },
    dateLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
    dateText: {
        ...typography.caption, color: colors.textMuted, fontSize: 11,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
    },

    row: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
    rowMe: { justifyContent: 'flex-end' },
    rowThem: { justifyContent: 'flex-start', gap: 8 },
    agentAvatar: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.primary + '30',
    },
    agentName: {
        fontSize: 10, fontFamily: 'Inter_600SemiBold',
        color: colors.primary, marginBottom: 3,
    },

    bubble: {
        maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 18, marginBottom: 0,
    },
    myBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.xs,
    },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    myText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular' },
    theirText: { color: colors.textPrimary, fontFamily: 'Inter_400Regular' },
    bubbleMeta: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        marginTop: 5, justifyContent: 'flex-end',
    },
    bubbleTime: { fontSize: 10, fontFamily: 'Inter_400Regular' },
    myTime: { color: 'rgba(255,255,255,0.65)' },
    theirTime: { color: colors.textMuted },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        paddingBottom: Platform.OS === 'ios' ? 30 : spacing.sm,
        borderTopWidth: 1, borderTopColor: colors.borderLight,
        gap: 10,
    },
    inputWrap: {
        flex: 1, backgroundColor: colors.surfaceElevated,
        borderRadius: 22, borderWidth: 1.5, borderColor: colors.border,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        fontSize: 15, color: colors.textPrimary,
        fontFamily: 'Inter_400Regular',
        maxHeight: 120,
    },
    sendBtn: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.primary,
    },
    sendBtnDisabled: { opacity: 0.35 },
})

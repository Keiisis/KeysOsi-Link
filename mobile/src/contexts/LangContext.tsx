import React, {
    createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ─── Supported languages (same as website) ───────────────────────────────────

export type LangCode = 'fr' | 'en' | 'es' | 'pt' | 'cr' | 'ht'

export interface LangConfig {
    code: LangCode
    label: string
    nativeLabel: string
    flag: string
}

export const SUPPORTED_LANGUAGES: LangConfig[] = [
    { code: 'fr', label: 'Français',         nativeLabel: 'Français',         flag: '🇫🇷' },
    { code: 'en', label: 'Anglais',           nativeLabel: 'English',          flag: '🇬🇧' },
    { code: 'es', label: 'Espagnol',          nativeLabel: 'Español',          flag: '🇪🇸' },
    { code: 'pt', label: 'Portugais',         nativeLabel: 'Português',        flag: '🇧🇷' },
    { code: 'cr', label: 'Créole',            nativeLabel: 'Kréyòl',           flag: '🇬🇵' },
    { code: 'ht', label: 'Créole Haïtien',    nativeLabel: 'Kreyòl Ayisyen',   flag: '🇭🇹' },
]

const DEFAULT_LANG: LangCode = 'fr'
const STORAGE_KEY = '@rg_mobile_lang'
const CACHE_KEY_PREFIX = '@rg_trans_cache_'

// ─── Translation API URL ──────────────────────────────────────────────────────
// Update this to your deployed frontend URL in production
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://retour-gagnant.vercel.app'

// ─── Context type ─────────────────────────────────────────────────────────────

interface LangContextType {
    lang: LangCode
    langConfig: LangConfig
    setLang: (lang: LangCode) => void
    t: (text: string) => string
    isTranslating: boolean
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LangContext = createContext<LangContextType>({
    lang: DEFAULT_LANG,
    langConfig: SUPPORTED_LANGUAGES[0],
    setLang: () => {},
    t: (text) => text,
    isTranslating: false,
})

export const useLang = () => useContext(LangContext)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LangProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG)
    const [cache, setCache] = useState<Map<string, string>>(new Map())
    const [isTranslating, setIsTranslating] = useState(false)

    // Batch queue for translations
    const pendingTexts = useRef<Set<string>>(new Set())
    const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Load persisted language ──
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(stored => {
            if (stored && SUPPORTED_LANGUAGES.find(l => l.code === stored)) {
                setLangState(stored as LangCode)
            }
        }).catch(() => {})
    }, [])

    // ── Load cached translations when lang changes ──
    useEffect(() => {
        if (lang === DEFAULT_LANG) {
            setCache(new Map())
            return
        }
        const cacheKey = `${CACHE_KEY_PREFIX}${lang}`
        AsyncStorage.getItem(cacheKey).then(raw => {
            if (raw) {
                try {
                    const parsed = JSON.parse(raw)
                    setCache(new Map(Object.entries(parsed)))
                } catch {}
            }
        }).catch(() => {})
    }, [lang])

    // ── Persist language choice ──
    const setLang = useCallback((newLang: LangCode) => {
        setLangState(newLang)
        AsyncStorage.setItem(STORAGE_KEY, newLang).catch(() => {})
    }, [])

    // ── Batch API call for translations ──
    const flushBatch = useCallback(async (currentLang: LangCode) => {
        if (currentLang === DEFAULT_LANG || pendingTexts.current.size === 0) return

        const texts = Array.from(pendingTexts.current)
        pendingTexts.current.clear()

        // Filter already cached
        const toTranslate = texts.filter(t => !cache.has(t))
        if (toTranslate.length === 0) return

        setIsTranslating(true)
        try {
            const res = await fetch(`${API_BASE}/api/mobile/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: toTranslate, targetLang: currentLang }),
            })
            if (!res.ok) return
            const data = await res.json()
            const translations: string[] = data.translations || []

            setCache(prev => {
                const next = new Map(prev)
                toTranslate.forEach((text, i) => {
                    if (translations[i]) next.set(text, translations[i])
                })

                // Persist to AsyncStorage
                const cacheKey = `${CACHE_KEY_PREFIX}${currentLang}`
                const obj: Record<string, string> = {}
                next.forEach((v, k) => { obj[k] = v })
                AsyncStorage.setItem(cacheKey, JSON.stringify(obj)).catch(() => {})

                return next
            })
        } catch {
            // Silent fail — show original text
        } finally {
            setIsTranslating(false)
        }
    }, [cache])

    // ── t() function — queues text for translation ──
    const t = useCallback((text: string): string => {
        if (!text) return text
        if (lang === DEFAULT_LANG) return text

        // Return cached translation immediately
        if (cache.has(text)) return cache.get(text)!

        // Queue for batch translation
        pendingTexts.current.add(text)

        // Debounce: flush 120ms after last call
        if (batchTimer.current) clearTimeout(batchTimer.current)
        batchTimer.current = setTimeout(() => flushBatch(lang), 120)

        return text // Return original while translating
    }, [lang, cache, flushBatch])

    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0]

    return (
        <LangContext.Provider value={{ lang, langConfig, setLang, t, isTranslating }}>
            {children}
        </LangContext.Provider>
    )
}

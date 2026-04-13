import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const groqApiKey = process.env.GROQ_API_KEY || ''

const SUPPORTED_LANGS: Record<string, string> = {
    fr: 'French',
    en: 'English',
    es: 'Spanish',
    pt: 'Portuguese (Brazilian)',
    cr: 'Guadeloupean Creole (Antillean Creole)',
    ht: 'Haitian Creole',
}

// POST /api/mobile/translate
// Body: { texts: string[], targetLang: string }
// Returns: { translations: string[] }
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { texts, targetLang } = body

        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return NextResponse.json({ error: 'texts array required' }, { status: 400 })
        }
        if (!targetLang || !SUPPORTED_LANGS[targetLang]) {
            return NextResponse.json({ error: 'unsupported targetLang' }, { status: 400 })
        }

        // French = no translation needed
        if (targetLang === 'fr') {
            return NextResponse.json({ translations: texts })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const groq = new Groq({ apiKey: groqApiKey })

        const results: string[] = new Array(texts.length)
        const toTranslate: { idx: number; text: string; hash: string }[] = []

        // 1) Check Supabase cache
        const hashes = texts.map(t => hashText(t, targetLang))
        const { data: cached } = await supabase
            .from('translations')
            .select('hash, translated')
            .in('hash', hashes)

        const cacheMap = new Map((cached || []).map((r: { hash: string; translated: string }) => [r.hash, r.translated]))

        texts.forEach((text, idx) => {
            const hash = hashes[idx]
            if (cacheMap.has(hash)) {
                results[idx] = cacheMap.get(hash)!
            } else {
                toTranslate.push({ idx, text, hash })
            }
        })

        // 2) Translate uncached texts with Groq in one batch
        if (toTranslate.length > 0) {
            const langName = SUPPORTED_LANGS[targetLang]
            const numbered = toTranslate.map((t, i) => `${i + 1}. ${t.text}`).join('\n')

            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                temperature: 0.1,
                max_tokens: 2048,
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional translator. Translate the following numbered strings from French to ${langName}.
Rules:
- Preserve the exact numbering format "N. text"
- Keep brand names "Retour Gagnant" and "Retour Gagnant Bénin" untranslated
- Keep formatting (capitalization, punctuation) consistent with the original
- Output ONLY the translated numbered list, nothing else`,
                    },
                    { role: 'user', content: numbered },
                ],
            })

            const responseText = completion.choices[0]?.message?.content || ''
            const lines = responseText.split('\n').filter(l => /^\d+\./.test(l.trim()))

            const newCacheRows: { hash: string; source: string; translated: string; lang: string }[] = []

            toTranslate.forEach(({ idx, text, hash }, i) => {
                const line = lines[i] || ''
                const translated = line.replace(/^\d+\.\s*/, '').trim() || text
                results[idx] = translated
                newCacheRows.push({ hash, source: text, translated, lang: targetLang })
            })

            // 3) Store in Supabase cache (ignore conflicts)
            if (newCacheRows.length > 0) {
                await supabase.from('translations').upsert(newCacheRows, { onConflict: 'hash' }).throwOnError()
            }
        }

        return NextResponse.json({ translations: results })
    } catch (e) {
        console.error('[mobile/translate]', e)
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Translation error' },
            { status: 500 }
        )
    }
}

function hashText(text: string, lang: string) {
    let h = 0
    const s = `${lang}:${text}`
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i)
        h |= 0
    }
    return `mob_${Math.abs(h).toString(36)}_${lang}`
}

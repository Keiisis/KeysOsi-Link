const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

export interface NvidiaMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface NvidiaPayload {
    model?: string
    messages: NvidiaMessage[]
    max_tokens?: number
    temperature?: number
    top_p?: number
    stream?: boolean
    enable_thinking?: boolean
}

/**
 * Appel simple (non-stream) à Gemma 4 31B via NVIDIA NIM
 */
export async function fetchGemma(payload: NvidiaPayload): Promise<Response> {
    const apiKey = process.env.NVIDIA_API_KEY
    if (!apiKey) throw new Error('NVIDIA_API_KEY manquante dans les variables d\'environnement')

    const { enable_thinking = true, stream = false, ...rest } = payload

    return fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': stream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemma-4-31b-it',
            max_tokens: 16384,
            temperature: 1.0,
            top_p: 0.95,
            stream,
            chat_template_kwargs: { enable_thinking },
            ...rest,
        }),
    })
}

/**
 * Extrait le texte d'une réponse NVIDIA non-stream
 */
export async function getGemmaText(messages: NvidiaMessage[], systemPrompt?: string): Promise<string> {
    const msgs: NvidiaMessage[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

    const res = await fetchGemma({ messages: msgs, stream: false })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`NVIDIA API error ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
}

// ════════════════════════════════════════════════════════════════
//  🧠 AI PROVIDER — Multi-LLM abstraction (Groq/Anthropic/OpenAI/Google)
//  Interface Groq-compatible : client.chat.completions.create({...})
//  Chargement lazy des SDKs. L'utilisateur choisit provider + modeles
//  via /ai/config. Tokens normalises (prompt_tokens/completion_tokens).
// ════════════════════════════════════════════════════════════════
const aiConfig = require('../ai-config');

// Catalogue des providers disponibles + modeles recommandes
const PROVIDERS = {
    groq: {
        label: 'Groq',
        sdkPackage: 'groq-sdk',
        models: {
            reasoning: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'deepseek-r1-distill-llama-70b'],
            cheap: ['llama-3.1-8b-instant', 'gemma2-9b-it'],
        },
        default: { reasoning: 'llama-3.3-70b-versatile', cheap: 'llama-3.1-8b-instant' },
        docsUrl: 'https://console.groq.com/keys',
    },
    anthropic: {
        label: 'Anthropic Claude',
        sdkPackage: '@anthropic-ai/sdk',
        models: {
            reasoning: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-opus-4-1-20250929', 'claude-3-5-sonnet-20241022'],
            cheap: ['claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022'],
        },
        default: { reasoning: 'claude-opus-4-7', cheap: 'claude-haiku-4-5-20251001' },
        docsUrl: 'https://console.anthropic.com/settings/keys',
    },
    openai: {
        label: 'OpenAI',
        sdkPackage: 'openai',
        models: {
            reasoning: ['gpt-4o', 'gpt-4-turbo', 'o1-preview', 'o1-mini'],
            cheap: ['gpt-4o-mini', 'gpt-3.5-turbo'],
        },
        default: { reasoning: 'gpt-4o', cheap: 'gpt-4o-mini' },
        docsUrl: 'https://platform.openai.com/api-keys',
    },
    google: {
        label: 'Google Gemini',
        sdkPackage: '@google/generative-ai',
        models: {
            reasoning: ['gemini-2.0-flash-exp', 'gemini-1.5-pro'],
            cheap: ['gemini-1.5-flash', 'gemini-2.0-flash-lite'],
        },
        default: { reasoning: 'gemini-1.5-pro', cheap: 'gemini-1.5-flash' },
        docsUrl: 'https://aistudio.google.com/app/apikey',
    },
};

function listProviders() {
    return Object.entries(PROVIDERS).map(([k, p]) => ({
        key: k,
        label: p.label,
        models: p.models,
        default: p.default,
        docsUrl: p.docsUrl,
    }));
}

function _loadSDK(pkg) {
    try { return require(pkg); }
    catch { return null; }
}

// ─── Adaptateur Anthropic → interface Groq-compatible ──────────
function _anthropicClient(apiKey) {
    const Anthropic = _loadSDK('@anthropic-ai/sdk');
    if (!Anthropic) throw new Error('SDK @anthropic-ai/sdk manquant — npm install @anthropic-ai/sdk');
    const sdk = new (Anthropic.default || Anthropic)({ apiKey });

    return {
        chat: {
            completions: {
                async create({ model, messages = [], temperature = 0.2, response_format, max_tokens = 4096 }) {
                    // Extraire system
                    const systemMsgs = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
                    const convo = messages.filter(m => m.role !== 'system').map(m => ({
                        role: m.role === 'assistant' ? 'assistant' : 'user',
                        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                    }));
                    // Force JSON si demande (Anthropic n'a pas json_object natif → prompt + strip fences)
                    let sys = systemMsgs;
                    if (response_format?.type === 'json_object') {
                        sys += '\n\nIMPORTANT: Ta reponse DOIT etre un JSON valide unique, sans texte autour, sans balises markdown. Commence par { et termine par }.';
                    }
                    const res = await sdk.messages.create({
                        model,
                        max_tokens,
                        temperature,
                        system: sys || undefined,
                        messages: convo.length ? convo : [{ role: 'user', content: 'continue' }],
                    });
                    let content = res.content?.map(c => c.text || '').join('') || '';
                    if (response_format?.type === 'json_object') {
                        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
                        const first = content.indexOf('{');
                        const last = content.lastIndexOf('}');
                        if (first >= 0 && last > first) content = content.slice(first, last + 1);
                    }
                    return {
                        choices: [{ message: { role: 'assistant', content }, finish_reason: res.stop_reason }],
                        usage: {
                            prompt_tokens: res.usage?.input_tokens || 0,
                            completion_tokens: res.usage?.output_tokens || 0,
                            total_tokens: (res.usage?.input_tokens || 0) + (res.usage?.output_tokens || 0),
                        },
                        model: res.model,
                    };
                },
            },
        },
    };
}

// ─── Adaptateur OpenAI → interface deja compatible ─────────────
function _openaiClient(apiKey, baseURL) {
    const OpenAI = _loadSDK('openai');
    if (!OpenAI) throw new Error('SDK openai manquant — npm install openai');
    const opts = { apiKey };
    if (baseURL) opts.baseURL = baseURL;
    const sdk = new (OpenAI.default || OpenAI)(opts);
    return {
        chat: {
            completions: {
                create: (params) => sdk.chat.completions.create(params),
            },
        },
    };
}

// ─── Adaptateur Google Gemini ──────────────────────────────────
function _googleClient(apiKey) {
    const pkg = _loadSDK('@google/generative-ai');
    if (!pkg) throw new Error('SDK @google/generative-ai manquant — npm install @google/generative-ai');
    const { GoogleGenerativeAI } = pkg;
    const genAI = new GoogleGenerativeAI(apiKey);

    return {
        chat: {
            completions: {
                async create({ model, messages = [], temperature = 0.2, response_format }) {
                    const systemInstruction = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
                    const contents = messages.filter(m => m.role !== 'system').map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
                    }));
                    const generationConfig = { temperature };
                    if (response_format?.type === 'json_object') {
                        generationConfig.responseMimeType = 'application/json';
                    }
                    const gModel = genAI.getGenerativeModel({
                        model,
                        systemInstruction: systemInstruction || undefined,
                        generationConfig,
                    });
                    const res = await gModel.generateContent({ contents });
                    const text = res.response?.text() || '';
                    const u = res.response?.usageMetadata || {};
                    return {
                        choices: [{ message: { role: 'assistant', content: text } }],
                        usage: {
                            prompt_tokens: u.promptTokenCount || 0,
                            completion_tokens: u.candidatesTokenCount || 0,
                            total_tokens: u.totalTokenCount || 0,
                        },
                        model,
                    };
                },
            },
        },
    };
}

// ─── Groq (interface native deja compatible) ───────────────────
function _groqClient(apiKey) {
    const Groq = _loadSDK('groq-sdk');
    if (!Groq) throw new Error('SDK groq-sdk manquant');
    return new (Groq.default || Groq)({ apiKey });
}

// ─── Factory principale ────────────────────────────────────────
function createClient({ provider, apiKey, baseURL } = {}) {
    const p = provider || 'groq';
    if (!apiKey) throw new Error(`Cle API manquante pour ${p}`);
    switch (p) {
        case 'groq':      return _groqClient(apiKey);
        case 'anthropic': return _anthropicClient(apiKey);
        case 'openai':    return _openaiClient(apiKey, baseURL);
        case 'google':    return _googleClient(apiKey);
        default:          throw new Error(`Provider inconnu: ${p}`);
    }
}

// Retourne { client, models: { reasoning, cheap }, provider } selon config active
async function getActive() {
    const cfg = await aiConfig.load();
    const active = cfg.active || 'groq';
    const entry = cfg.providers?.[active];
    if (!entry?.apiKey) {
        // Fallback legacy : GROQ_API_KEY en env
        if (active === 'groq' && process.env.GROQ_API_KEY) {
            const groq = PROVIDERS.groq;
            return {
                provider: 'groq',
                client: createClient({ provider: 'groq', apiKey: process.env.GROQ_API_KEY }),
                models: { reasoning: groq.default.reasoning, cheap: groq.default.cheap },
            };
        }
        throw new Error(`Aucune cle API pour ${active}. Configure via /ai/config.`);
    }
    const defaults = PROVIDERS[active]?.default || { reasoning: '', cheap: '' };
    return {
        provider: active,
        client: createClient({ provider: active, apiKey: entry.apiKey, baseURL: entry.baseURL }),
        models: {
            reasoning: entry.models?.reasoning || defaults.reasoning,
            cheap: entry.models?.cheap || defaults.cheap,
        },
    };
}

// Test rapide — verifie que la cle marche en envoyant un tiny ping
async function testProvider({ provider, apiKey, model }) {
    try {
        const client = createClient({ provider, apiKey });
        const useModel = model || PROVIDERS[provider]?.default?.cheap || PROVIDERS[provider]?.default?.reasoning;
        const res = await client.chat.completions.create({
            model: useModel,
            temperature: 0,
            messages: [{ role: 'user', content: 'Reponds "ok" et rien d\'autre.' }],
            max_tokens: 10,
        });
        const out = (res.choices?.[0]?.message?.content || '').trim().toLowerCase();
        return {
            ok: out.includes('ok') || out.length > 0,
            provider, model: useModel,
            response: out.slice(0, 60),
            usage: res.usage,
        };
    } catch (e) {
        return { ok: false, error: e.message, provider };
    }
}

module.exports = { PROVIDERS, listProviders, createClient, getActive, testProvider };

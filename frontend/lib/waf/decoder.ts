// ══════════════════════════════════════════════════════════════
// 🔍 WAF DECODER — Normalisation multi-couches des entrées
// Reproduit le moteur de décodage de ModSecurity :
// URL, double-URL, HTML entities, Unicode, null bytes, commentaires
// ══════════════════════════════════════════════════════════════

function removeNullBytes(input: string): string {
    return input.replace(/\x00/g, '').replace(/%00/gi, '')
}

function decodeUrl(input: string): string {
    try {
        return decodeURIComponent(input.replace(/\+/g, ' '))
    } catch {
        return input.replace(/%([0-9a-fA-F]{2})/g, (_, hex) => {
            try { return String.fromCharCode(parseInt(hex, 16)) } catch { return _ }
        })
    }
}

const HTML_ENTITIES: Record<string, string> = {
    '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"',
    '&apos;': "'", '&#x3C;': '<', '&#x3E;': '>', '&#x22;': '"',
    '&#x27;': "'", '&#x2F;': '/', '&#60;': '<', '&#62;': '>',
    '&#34;': '"', '&#39;': "'", '&#47;': '/',
    '&nbsp;': ' ', '&ensp;': ' ', '&emsp;': ' ',
}

function decodeHtmlEntities(input: string): string {
    let result = input
    for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
        result = result.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), char)
    }
    result = result.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    result = result.replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    return result
}

function removeComments(input: string): string {
    return input
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/--[^\r\n]*/g, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/#[^\r\n]*/g, ' ')
}

function normalizeUnicode(input: string): string {
    return input
        .replace(/\uFF1C/g, '<').replace(/\uFF1E/g, '>').replace(/\uFF07/g, "'")
        .replace(/\uFF02/g, '"').replace(/\uFF03/g, '#')
        .replace(/\u2018/g, "'").replace(/\u2019/g, "'")
        .replace(/\u201C/g, '"').replace(/\u201D/g, '"')
        .replace(/\u00AB/g, '"').replace(/\u00BB/g, '"')
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        .replace(/\u0009|\u000A|\u000D/g, ' ')
}

function collapseWhitespace(input: string): string {
    return input.replace(/\s+/g, ' ').trim()
}

function decodeBase64Fragments(input: string): string {
    return input.replace(/[A-Za-z0-9+/]{20,}={0,2}/g, (match) => {
        try {
            const decoded = Buffer.from(match, 'base64').toString('utf8')
            if (/^[\x20-\x7E]+$/.test(decoded)) return decoded
        } catch { /* ignore */ }
        return match
    })
}

function normalizePaths(input: string): string {
    return input
        .replace(/\.\.\//g, '').replace(/\.\.%2F/gi, '')
        .replace(/\.\.%5C/gi, '').replace(/%2e%2e%2f/gi, '')
        .replace(/%2e%2e\//gi, '')
}

function removeSqlEvasions(input: string): string {
    return input
        .replace(/\/\*!\s*\d*\s*/g, '')
        .replace(/\|\|/g, ' OR ').replace(/&&/g, ' AND ')
        .replace(/\bUNION\s+ALL\s+SELECT/gi, 'UNION SELECT')
        .replace(/0x[0-9a-f]+/gi, (hex) => {
            try { return Buffer.from(hex.slice(2), 'hex').toString('ascii') } catch { return hex }
        })
}

// ── Pipeline de décodage complet ──────────────────────────────
export interface DecodedInput {
    original:   string
    normalized: string
    layers:     string[]
}

export function decode(input: string): DecodedInput {
    const layers: string[] = [input]
    let s = removeNullBytes(input); layers.push(s)
    s = normalizeUnicode(s); layers.push(s)
    s = decodeHtmlEntities(s); layers.push(s)
    let prev = ''
    let count = 0
    while (s !== prev && count < 3) { prev = s; s = decodeUrl(s); count++ }
    layers.push(s)
    s = decodeBase64Fragments(s); layers.push(s)
    s = removeComments(s); layers.push(s)
    s = removeSqlEvasions(s); layers.push(s)
    s = normalizePaths(s); layers.push(s)
    s = collapseWhitespace(s); layers.push(s)
    s = s.toLowerCase(); layers.push(s)
    return { original: input, normalized: s, layers }
}

// ══════════════════════════════════════════════════════════════
// RequestParts — SÉPARATION STRICTE path / query / body
// CRITIQUE : ne jamais mélanger le path URL avec les query params
// pour éviter les faux positifs sur les routes REST (/create, /update)
// ══════════════════════════════════════════════════════════════
export interface RequestParts {
    // Parties individuelles (décodées)
    urlPath:    string   // chemin seul ex: /admin/evenements/create
    query:      string   // query string décodée ex: name=foo&type=bar
    userAgent:  string
    referer:    string
    cookie:     string
    body:       string

    // Agrégats pour les règles multi-cibles
    // NE CONTIENT PAS urlPath — évite les faux positifs sur mots-clés REST
    dataDecoded: string  // query + cookie + referer + body
    // Contient tout SAUF le path URL
    allDecoded:  string  // urlPath + query + ua + referer + cookie + body (usage interne seulement)
}

export function decodeRequest(
    pathname: string,
    searchParams: string,
    headers: Headers,
    rawBody?: string
): RequestParts {
    const urlPath   = decode(pathname).normalized
    const query     = decode(searchParams).normalized
    const userAgent = decode(headers.get('user-agent') || '').normalized
    const referer   = decode(headers.get('referer') || '').normalized
    const cookie    = decode(headers.get('cookie') || '').normalized
    const body      = rawBody ? decode(rawBody).normalized : ''

    // dataDecoded : PAS de urlPath → empêche /admin/evenements/create de matcher SQLi
    const dataDecoded = [query, cookie, referer, body].filter(Boolean).join(' ')
    // allDecoded : tout (pour règles qui nécessitent vraiment tout)
    const allDecoded  = [urlPath, query, userAgent, referer, cookie, body].filter(Boolean).join(' ')

    return { urlPath, query, userAgent, referer, cookie, body, dataDecoded, allDecoded }
}

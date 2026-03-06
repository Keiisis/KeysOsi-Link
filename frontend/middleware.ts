import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ═══════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE — Route Protection (Server-Side)
// Protège les routes /agent/* et /admin/* côté serveur
// ═══════════════════════════════════════════════════════

// In-memory rate limiting store
const loginAttempts = new Map<string, { count: number; lastReset: number }>()

const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10

const isRateLimited = (ip: string): boolean => {
    const now = Date.now()
    const entry = loginAttempts.get(ip)

    if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
        loginAttempts.set(ip, { count: 1, lastReset: now })
        return false
    }

    entry.count++
    return entry.count > MAX_LOGIN_ATTEMPTS
}

export async function middleware(request: NextRequest) {
    const response = NextResponse.next({
        request: { headers: request.headers },
    })

    // ─── Security Headers ───
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(self), geolocation=()'
    )

    const pathname = request.nextUrl.pathname

    // ─── Rate Limiting on Login POST requests ───
    if (
        (pathname === '/agent/login' || pathname === '/admin/login') &&
        request.method === 'POST'
    ) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown'

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
                { status: 429 }
            )
        }
    }

    // ─── Skip login and reset-password pages (no auth needed) ───
    if (
        pathname === '/agent/login' ||
        pathname === '/admin/login' ||
        pathname === '/admin/reset-password'
    ) {
        return response
    }

    // ─── Only protect /agent/* and /admin/* routes ───
    const isAgentRoute = pathname.startsWith('/agent')
    const isAdminRoute = pathname.startsWith('/admin')

    if (!isAgentRoute && !isAdminRoute) {
        return response
    }

    // ─── Auth Check ───
    let supabaseResponse = response

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => request.cookies.getAll(),
                    setAll: (cookiesToSet) => {
                        // Mettre à jour la req courante
                        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))

                        // Mettre à jour la réponse
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        // Restaurer les security headers !
                        supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
                        supabaseResponse.headers.set('X-Frame-Options', 'DENY')
                        supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')
                        supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
                        supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()')

                        cookiesToSet.forEach(({ name, value, options }) => {
                            supabaseResponse.cookies.set(name, value, {
                                ...options,
                                httpOnly: true,
                                secure: process.env.NODE_ENV === 'production',
                                sameSite: 'lax',
                            })
                        })
                    },
                },
            }
        )

        // Supabase SSR recommande d'utiliser getUser() plutôt que getSession()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        // Helper function to redirect keeping possible refreshed cookies
        const redirectTo = (url: URL) => {
            const redirectRes = NextResponse.redirect(url)
            // Transférer les cookies nouvellement définis par Supabase
            supabaseResponse.cookies.getAll().forEach(cookie => {
                redirectRes.cookies.set(cookie.name, cookie.value, cookie)
            })
            return redirectRes
        }

        if (userError || !user) {
            // Pas d'utilisateur authentifié → rediriger vers login
            const loginUrl = isAdminRoute ? '/admin/login' : '/agent/login'
            return redirectTo(new URL(loginUrl, request.url))
        }

        const userId = user.id

        // Vérifier le rôle avec la Service Key (contourne les RLS)
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceKey) {
            // Pas de service key → on laisse passer (le layout côté client vérifiera)
            console.warn('Middleware: SUPABASE_SERVICE_ROLE_KEY manquante, vérification de rôle ignorée')
            return supabaseResponse
        }

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
        )

        const { data: profile, error: profileError } = await adminSupabase
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            // Profil introuvable — laisser passer, le layout côté client gèrera
            console.warn('Middleware: Profil non trouvé pour', userId, '— passage autorisé')
            return supabaseResponse
        }

        // STRICT ROLE CHECK : Agent ≠ Admin
        if (isAgentRoute && profile.role !== 'agent' && profile.role !== 'admin') {
            return redirectTo(new URL('/agent/login?error=unauthorized', request.url))
        }

        if (isAdminRoute && profile.role !== 'admin') {
            return redirectTo(new URL('/admin/login?error=unauthorized', request.url))
        }

        return supabaseResponse
    } catch (err: unknown) {
        // En caso d'erreur réseau/timeout, NE PAS bloquer l'accès
        // Le layout côté client fera sa propre vérification
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('Middleware catch:', message)

        // Si le middleware crash, on laisse passer plutôt que de boucler
        return response
    }
}

export const config = {
    matcher: [
        '/agent/:path*',
        '/admin/:path*',
    ],
}

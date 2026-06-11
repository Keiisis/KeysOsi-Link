import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Upsert to avoid duplicates
        const { error } = await supabase
            .from('newsletter_subscribers')
            .upsert(
                { email: email.toLowerCase().trim(), subscribed_at: new Date().toISOString() },
                { onConflict: 'email' }
            )

        if (error) {
            console.error('Newsletter subscribe error:', error)
            return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}

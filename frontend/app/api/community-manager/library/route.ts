import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/community-manager/library
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('content_library')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data || [])
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
    }
}

// POST /api/community-manager/library — Sauvegarder un contenu
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { platform, content_type = 'post', text, hashtags = [], style_inspiration, viral_score = 0 } = body
        if (!text?.trim()) return NextResponse.json({ error: 'Le texte est obligatoire.' }, { status: 400 })

        const { data, error } = await supabaseAdmin
            .from('content_library')
            .insert({ platform, content_type, text: text.trim(), hashtags, style_inspiration, viral_score })
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
    }
}

// PATCH /api/community-manager/library — Toggle favori
export async function PATCH(request: NextRequest) {
    try {
        const { id, is_favorite } = await request.json()
        if (!id) return NextResponse.json({ error: 'ID manquant.' }, { status: 400 })

        const { error } = await supabaseAdmin
            .from('content_library')
            .update({ is_favorite })
            .eq('id', id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
    }
}

// DELETE /api/community-manager/library?id=xxx
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID manquant.' }, { status: 400 })

        const { error } = await supabaseAdmin.from('content_library').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
    }
}

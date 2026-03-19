import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const ref = url.searchParams.get('ref')

    try {
        let query = supabase
            .from('nationality_applications')
            .select('*')
            .order('created_at', { ascending: false })

        if (ref) {
            query = query.eq('application_ref', ref)
        }

        const { data: apps, error } = await query.limit(1)

        if (error || !apps || apps.length === 0) {
            return NextResponse.json({ error: 'No data found' }, { status: 404 })
        }

        const app = apps[0]

        // Parse documents safely
        let docs = []
        try {
            if (typeof app.documents_uploaded === 'string') {
                docs = JSON.parse(app.documents_uploaded)
            } else if (Array.isArray(app.documents_uploaded)) {
                docs = app.documents_uploaded
            }
        } catch (e) {
            console.error('Cant parse documents')
        }

        const formattedDocs = docs.map((d: any, i: number) => ({
            nom: d.name || d.nom || `Document Justificatif ${i + 1}`,
            url: d.url || '#'
        }))

        // Formatting ancestors based on DB columns (we use ancestor1/2 as Grandparents pattern)
        const formatName = (p: string | null, n: string | null, fallback: string) => {
            const name = `${p || ''} ${n || ''}`.trim()
            return name.length > 0 ? name : fallback
        }

        const responseData = {
            client: { prenom: app.prenom, nom: app.nom },
            pere: { nom: formatName(app.pere_prenom, app.pere_nom, "Père (Inconnu)") },
            mere: { nom: formatName(app.mere_prenom, app.mere_nom, "Mère (Inconnue)") },
            gpPaternel: { nom: formatName(app.ancestor1_prenom, app.ancestor1_nom, "Lignée Paternelle") },
            gmPaternel: { nom: 'Racine Paternelle' },
            gpMaternel: { nom: formatName(app.ancestor2_prenom, app.ancestor2_nom, "Lignée Maternelle") },
            gmMaternel: { nom: 'Racine Maternelle' },
            documents: formattedDocs
        }

        return NextResponse.json(responseData)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

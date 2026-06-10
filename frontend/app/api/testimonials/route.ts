import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Variables Supabase manquantes');
    return createClient(supabaseUrl, supabaseServiceKey);
}

// POST /api/testimonials — public submission from frontend
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabase();
        const data = await request.json();

        const { name, role, location, text, service, rating, photo_url } = data;

        if (!name || !text) {
            return NextResponse.json(
                { error: "Nom et témoignage sont requis." },
                { status: 400 }
            );
        }

        // Insert using service role key (bypasses RLS)
        const { data: inserted, error: supabaseError } = await supabase
            .from('testimonials')
            .insert([{
                name,
                role: role || null,
                location: location || null,
                text,
                service: service || null,
                rating: rating ?? 5,
                photo_url: photo_url || null,
                approved: false, // Admin must approve
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (supabaseError) {
            console.error("Supabase insert error:", supabaseError);
            throw supabaseError;
        }

        return NextResponse.json(
            { success: true, testimonial: inserted },
            { status: 201 }
        );
    } catch (error) {
        console.error("Testimonial submission error:", error);
        return NextResponse.json(
            { error: "Erreur lors de l'envoi du témoignage." },
            { status: 500 }
        );
    }
}

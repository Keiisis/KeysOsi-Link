import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nom, email, question } = body;

        if (!nom || !question) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, serviceKey);

        // 1. Créer la session dans `support_sessions`
        //    (table dédiée au live chat, voir SQL ci-dessous)
        const { data: sessionData, error: sessionError } = await supabase
            .from('support_sessions')
            .insert({
                email: (email || 'anonyme@livechat.com').toLowerCase().trim(),
                name: nom.trim(),
                status: 'open',
            })
            .select('id')
            .single();

        if (sessionError) {
            // Fallback: la table support_sessions n'existe pas encore
            // → on génère un UUID côté serveur et on l'insère directement
            // dans chat_messages comme "message fantôme" de session
            console.error('[start_live] support_sessions error:', sessionError.message);
            return NextResponse.json({
                error: `Table support_sessions manquante. Exécutez le SQL de migration.\n${sessionError.message}`
            }, { status: 500 });
        }

        const sessionId = sessionData.id;

        // 2. Insérer le premier message dans `chat_messages`
        const { error: msgError } = await supabase
            .from('chat_messages')
            .insert({
                conversation_id: sessionId,
                role: 'client',
                content: question.trim(),
            });

        if (msgError) {
            console.error('[start_live] chat_messages error:', msgError.message);
            // On retourne quand même le sessionId — le message sera renvoyé via send_message
        }

        return NextResponse.json({ sessionId });
    } catch (error) {
        console.error("Live Chat Start Error:", error);
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

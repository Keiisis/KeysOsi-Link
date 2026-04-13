import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ sessionId: null });
        }

        const supabase = createClient(supabaseUrl, serviceKey);

        // Cherche la session live ouverte la plus récente pour cet email
        const { data } = await supabase
            .from('support_sessions')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            return NextResponse.json({ sessionId: data[0].id });
        }

        return NextResponse.json({ sessionId: null });
    } catch (error) {
        console.error('Check session error:', error);
        return NextResponse.json({ sessionId: null });
    }
}

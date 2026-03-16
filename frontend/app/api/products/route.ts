import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Products fetch error:', error)
            return NextResponse.json({ products: [] })
        }

        const products = (data || []).map((item: Record<string, unknown>) => ({
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            long_description: item.description || '',
            price: item.base_price || 0,
            sale_price: null,
            currency: 'XOF',
            images: item.images || [],
            category: item.category || 'general',
            stock: item.current_stock || 0,
            is_active: item.is_published ?? true,
            is_featured: false,
        }))

        return NextResponse.json({ products })
    } catch {
        return NextResponse.json({ products: [] })
    }
}

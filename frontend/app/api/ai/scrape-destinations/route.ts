import { NextResponse } from 'next/server'
import axios from 'axios'

const serperApiKeys = [
    process.env.SERPER_API_KEY_1,
    process.env.SERPER_API_KEY_2,
    process.env.SERPER_API_KEY_3,
].filter(Boolean) as string[]

async function callSerperWithRetry(keys: string[], query: string, type: 'search' | 'maps' | 'images' = 'maps') {
    const shuffled = [...keys].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(shuffled.length, 3); i++) {
        try {
            const res = await axios.post(
                `https://google.serper.dev/${type}`,
                { q: query, gl: 'bj', hl: 'fr', num: 15 },
                { headers: { 'X-API-KEY': shuffled[i], 'Content-Type': 'application/json' }, timeout: 15000 }
            )
            if (type === 'maps') return res.data.places || []
            if (type === 'images') return res.data.images || []
            return res.data.organic || []
        } catch (err) {
            console.warn(`Serper key ${i + 1} failed:`, err instanceof Error ? err.message : '')
            if (i === Math.min(shuffled.length, 3) - 1) return []
        }
    }
    return []
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { destination, activities } = body

        if (!destination) {
            return NextResponse.json({ error: 'Destination requise' }, { status: 400 })
        }

        const activityQuery = activities ? `${activities} ${destination} Benin` : `activités tourisme ${destination} Benin`

        // Scraping en parallèle — 5 catégories
        const [hotels, restaurants, activities_results, transport, images] = await Promise.all([
            callSerperWithRetry(serperApiKeys, `meilleur hotel hébergement ${destination} Benin`, 'maps'),
            callSerperWithRetry(serperApiKeys, `restaurant gastronomie ${destination} Benin`, 'maps'),
            callSerperWithRetry(serperApiKeys, activityQuery, 'search'),
            callSerperWithRetry(serperApiKeys, `location voiture chauffeur VIP ${destination} Benin`, 'maps'),
            callSerperWithRetry(serperApiKeys, `${destination} Benin tourisme paysage`, 'images'),
        ])

        // Normaliser chaque résultat
        interface SerperPlace { title?: string; address?: string; rating?: number; ratingCount?: number; thumbnailUrl?: string; position?: number }
        interface SerperOrganic { title?: string; snippet?: string; link?: string; imageUrl?: string; position?: number }
        interface SerperImage { title?: string; imageUrl?: string; thumbnailUrl?: string; link?: string }

        const normalize = (items: SerperPlace[], category: string) => items.slice(0, 12).map((item: SerperPlace, i: number) => ({
            id: `${category}-${i}`,
            category,
            title: item.title || 'Sans titre',
            address: item.address || '',
            rating: item.rating || 0,
            reviews: item.ratingCount || 0,
            image_url: item.thumbnailUrl || null,
            selected: false,
        }))

        const normalizeOrganic = (items: SerperOrganic[], category: string) => items.slice(0, 10).map((item: SerperOrganic, i: number) => ({
            id: `${category}-${i}`,
            category,
            title: item.title || 'Sans titre',
            address: item.snippet || '',
            rating: 0,
            reviews: 0,
            image_url: item.imageUrl || null,
            url: item.link || null,
            selected: false,
        }))

        const normalizeImages = (items: SerperImage[]) => items.slice(0, 20).map((item: SerperImage, i: number) => ({
            id: `image-${i}`,
            title: item.title || '',
            url: item.imageUrl || item.thumbnailUrl || '',
            thumbnail: item.thumbnailUrl || item.imageUrl || '',
            source: item.link || '',
        }))

        return NextResponse.json({
            success: true,
            destination,
            categories: {
                hotels: normalize(hotels, 'hotel'),
                restaurants: normalize(restaurants, 'restaurant'),
                activities: normalizeOrganic(activities_results, 'activity'),
                transport: normalize(transport, 'transport'),
            },
            images: normalizeImages(images),
        })

    } catch (err) {
        console.error('Erreur API Scrape:', err)
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur interne' }, { status: 500 })
    }
}

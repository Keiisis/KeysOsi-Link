'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, ArrowUpRight, ShoppingCart, Heart } from 'lucide-react'
import { useCart } from '@/lib/store/cartStore'
import { useWishlist } from '@/lib/store/wishlistStore'
import { Price } from '@/components/ui/Price'
import { CurrencyCode } from '@/lib/currency'
import { T, useTranslation } from '@/lib/translation'

export interface Product {
    id: string
    title: string
    description: string
    price: number
    sale_price?: number | null
    currency: string
    images: string[]
    category: string
    stock: number
    is_active: boolean
    is_featured: boolean
}

export function ProductCard({ product, index }: { product: Product, index: number }) {
    const { t } = useTranslation()
    const { addItem } = useCart()
    const { toggleItem, isInWishlist } = useWishlist()
    const [heartBounce, setHeartBounce] = useState(false)
    const isFav = isInWishlist(product.id)

    const hasDiscount = product.sale_price && product.sale_price < product.price
    const displayPrice = hasDiscount ? product.sale_price : product.price
    const isOutOfStock = product.stock <= 0

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setHeartBounce(true)
        setTimeout(() => setHeartBounce(false), 400)
        toggleItem({
            id: product.id,
            title: product.title,
            price: product.price,
            sale_price: product.sale_price ?? undefined,
            currency: product.currency,
            image_url: product.images?.[0],
            category: product.category,
        })
    }

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault()
        if (isOutOfStock) return

        addItem({
            id: product.id,
            title: product.title,
            price: product.price,
            sale_price: product.sale_price || undefined,
            currency: product.currency,
            image_url: product.images?.[0],
            max_stock: product.stock
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(5px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7, delay: (index % 12) * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="group h-full"
        >
            <Link href={`/boutique/${product.id}`} className="block h-full relative outline-none focus-visible:ring-2 focus-visible:ring-[#008751] rounded-3xl">
                {/* Glow behind the card on hover */}
                <div className="absolute -inset-[2px] rounded-[2rem] bg-gradient-to-br from-[#008751]/0 via-[#FCD116]/0 to-[#E8112D]/0 group-hover:from-[#008751]/20 group-hover:via-[#FCD116]/15 group-hover:to-[#E8112D]/20 blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />

                <div className="relative h-full flex flex-col bg-white border border-gray-200 group-hover:border-gray-300 rounded-3xl overflow-hidden transition-all duration-500 will-change-transform shadow-sm group-hover:shadow-xl z-10">

                    {/* Image area */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 w-full">
                        {product.images && product.images.length > 0 ? (
                            <>
                                <Image
                                    src={product.images[0]}
                                    alt={t(product.title)}
                                    fill
                                    className="object-cover transform group-hover:scale-110 transition-transform duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)]"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                    rel="preload"
                                />
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-700" />
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center relative bg-gray-50">
                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center shadow-inner">
                                    <ShoppingBag size={32} className="text-gray-300" />
                                </div>
                            </div>
                        )}

                        {/* Top badges */}
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                            <div className="flex flex-col gap-2">
                                {hasDiscount && (
                                    <span className="px-3 py-1 rounded-xl bg-[#E8112D] text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">
                                        <T>Promo</T>
                                    </span>
                                )}
                                {product.is_featured && (
                                    <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#FCD116] to-[#E5BD14] text-black text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">
                                        <T>Vedette</T>
                                    </span>
                                )}
                                {isOutOfStock && (
                                    <span className="px-3 py-1 rounded-xl bg-gray-800 text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">
                                        <T>Rupture</T>
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <motion.button
                                    onClick={handleToggleWishlist}
                                    animate={heartBounce ? { scale: [1, 1.4, 1] } : {}}
                                    transition={{ duration: 0.4 }}
                                    className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 pointer-events-auto ${isFav
                                        ? 'bg-[#E8112D]/90 border-[#E8112D]/50 text-white shadow-lg shadow-[#E8112D]/30'
                                        : 'bg-white/70 border-white/50 text-gray-600 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0'
                                        } ${isFav ? 'opacity-100 translate-x-0' : ''}`}
                                    title={isFav ? t('Retirer des favoris') : t('Ajouter aux favoris')}
                                >
                                    <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                                </motion.button>
                                <div className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/50 flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-500 ease-out">
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Add to Cart Overlay */}
                        {!isOutOfStock && (
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <button
                                    onClick={handleAddToCart}
                                    className="flex items-center gap-2 bg-[#008751] text-white font-black uppercase tracking-widest text-[10px] sm:text-xs px-6 py-3 rounded-full hover:bg-[#006a40] hover:scale-105 transition-all shadow-xl"
                                >
                                    <ShoppingCart size={16} /> <T>Ajouter</T>
                                </button>
                            </div>
                        )}

                        {/* Image Gradient Mask */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    </div>

                    {/* Info */}
                    <div className="p-6 sm:p-7 flex flex-col flex-1 relative z-20 -mt-6">
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-2">
                                <div className="h-[2px] w-4 bg-[#008751]" />
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-[#008751]">
                                    {t(product.category)}
                                </span>
                            </div>

                            <h3 className="text-lg sm:text-xl font-black text-gray-900 group-hover:text-[#008751] transition-colors line-clamp-2 font-heading tracking-tight leading-tight">
                                {t(product.title)}
                            </h3>

                            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed font-light">
                                {t(product.description)}
                            </p>
                        </div>

                        {/* Price Area */}
                        <div className="mt-6 pt-5 border-t border-gray-100 flex items-end justify-between">
                            <div className="flex flex-col">
                                {hasDiscount && (
                                    <span className="text-xs sm:text-sm text-gray-400 line-through font-medium mb-1">
                                        <Price amount={product.price} currency={product.currency as CurrencyCode} />
                                    </span>
                                )}
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl sm:text-3xl font-black text-gray-900 font-heading tracking-tighter">
                                        <Price amount={displayPrice!} currency={product.currency as CurrencyCode} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}

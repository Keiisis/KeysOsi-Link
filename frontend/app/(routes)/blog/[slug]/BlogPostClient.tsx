'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Clock, Eye, Share2, BookOpen, Tag } from 'lucide-react'
import { useTranslation, T } from '@/lib/translation'

interface BlogPost {
    id: string
    title: string
    slug: string
    excerpt: string
    content: string
    cover_image: string
    category: string
    author: string
    views: number
    created_at: string
    tags: string[]
}

export default function BlogPostClient({ slug }: { slug: string }) {
    const { t } = useTranslation()
    const [post, setPost] = useState<BlogPost | null>(null)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!slug) return
        const fetchPost = async () => {
            const { data } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single()

            if (data) {
                setPost(data as BlogPost)
                // Increment views
                await supabase.from('blog_posts').update({ views: (data.views || 0) + 1 }).eq('id', data.id)
            }
            setLoading(false)
        }
        fetchPost()
    }, [slug])

    const formatDate = (val: string) => {
        if (!mounted || !val) return '—'
        const d = new Date(val)
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    // Markdown to HTML renderer
    const renderMarkdown = (text: string): string => {
        if (!text) return ''

        let html = text

        // Restore HTML video tags before escaping
        const videoPlaceholders: string[] = []
        html = html.replace(/<video[^>]*>.*?<\/video>/gi, (match) => {
            videoPlaceholders.push(match)
            return `__VIDEO_${videoPlaceholders.length - 1}__`
        })

        // Escape HTML
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')

        // Restore video placeholders
        videoPlaceholders.forEach((v, i) => {
            html = html.replace(`__VIDEO_${i}__`, v)
        })

        // Headers (process in order: h3, h2, h1)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

        // Horizontal rule
        html = html.replace(/^---$/gm, '<hr />')

        // Bold & Italic (order matters)
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

        // Code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

        // Blockquotes
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

        // Images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="width:100%;border-radius:12px;margin:16px 0" loading="lazy" />')

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

        // Ordered lists
        html = html.replace(/^(\d+)\. (.+)$/gm, '<li value="$1">$2</li>')

        // Unordered lists
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>')

        // Wrap consecutive <li> in <ul>
        html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
            const isOrdered = match.includes('value=')
            return isOrdered ? `<ol>${match}</ol>` : `<ul>${match}</ul>`
        })

        // Paragraphs - wrap remaining text lines
        html = html.replace(/\n\n/g, '</p><p>')
        html = '<p>' + html + '</p>'
        html = html.replace(/<p><\/p>/g, '')
        html = html.replace(/<p>(<h[123]>)/g, '$1')
        html = html.replace(/(<\/h[123]>)<\/p>/g, '$1')
        html = html.replace(/<p>(<hr \/>)<\/p>/g, '$1')
        html = html.replace(/<p>(<ul>)/g, '$1')
        html = html.replace(/(<\/ul>)<\/p>/g, '$1')
        html = html.replace(/<p>(<ol>)/g, '$1')
        html = html.replace(/(<\/ol>)<\/p>/g, '$1')
        html = html.replace(/<p>(<blockquote>)/g, '$1')
        html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')

        return html
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        )
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center text-white text-center p-8">
                <div>
                    <BookOpen className="mx-auto mb-4 text-gray-600" size={48} />
                    <h1 className="text-2xl font-bold mb-2"><T>Article introuvable</T></h1>
                    <Link href="/blog" className="text-emerald-400 text-sm hover:underline">← <T>Retour au blog</T></Link>
                </div>
            </div>
        )
    }

    const postTags = Array.isArray(post.tags) ? post.tags : []
    const readingTime = Math.max(1, Math.ceil((post.content || '').split(/\s+/).length / 200))

    return (
        <div className="min-h-screen bg-[#0a0f14]">
            {/* Hero Cover */}
            <div className="relative h-64 md:h-96 overflow-hidden">
                {post.cover_image ? (
                    <Image src={post.cover_image} alt={post.title || ''} fill className="object-cover" priority />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-900/40 to-yellow-900/40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f14] via-[#0a0f14]/60 to-transparent" />
                <div className="absolute top-4 left-4">
                    <Link href="/blog" className="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 transition-all">
                        <ArrowLeft size={14} /> <T>Blog</T>
                    </Link>
                </div>
            </div>

            {/* Article Content */}
            <article className="max-w-3xl mx-auto px-4 -mt-20 md:-mt-32 relative z-10 pb-20">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                        {t(post.category || 'Général')}
                    </span>

                    <h1 className="text-3xl md:text-4xl font-black text-white mt-4 mb-4 leading-tight">{post.title}</h1>

                    {post.excerpt && (
                        <p className="text-base text-gray-400 mb-6 leading-relaxed italic border-l-2 border-emerald-500/30 pl-4">
                            {post.excerpt}
                        </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-8 pb-6 border-b border-white/5 flex-wrap">
                        <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(post.created_at)}</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {post.views} {t("vues")}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {readingTime} min {t("de lecture")}</span>
                        <span>{t("Par")} {post.author || 'Retour Gagnant'}</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(window.location.href)}
                            className="ml-auto flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            <Share2 size={12} /> <T>Partager</T>
                        </button>
                    </div>

                    {/* Article body */}
                    <div
                        className="prose prose-invert prose-emerald max-w-none
                            prose-headings:font-black prose-headings:text-white
                            prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
                            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-l-2 prose-h2:border-emerald-500 prose-h2:pl-4
                            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                            prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-[15px]
                            prose-li:text-gray-300 prose-li:text-[15px]
                            prose-strong:text-white prose-strong:font-bold
                            prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
                            prose-hr:border-white/10
                            prose-em:text-gray-400
                            prose-blockquote:border-l-emerald-500 prose-blockquote:bg-emerald-500/5 prose-blockquote:rounded-r-xl prose-blockquote:py-2 prose-blockquote:px-4
                            prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#FCD116]
                            prose-img:rounded-2xl"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content || '') }}
                    />

                    {/* Tags */}
                    {postTags.length > 0 && (
                        <div className="mt-10 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag size={14} className="text-gray-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest"><T>Tags</T></span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {postTags.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#FCD116]/10 text-[#FCD116] border border-[#FCD116]/20 hover:bg-[#FCD116]/20 transition-colors"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    <div className="mt-12 p-6 bg-gradient-to-br from-emerald-900/20 to-yellow-900/20 border border-emerald-500/10 rounded-2xl text-center">
                        <h3 className="text-lg font-bold text-white mb-2"><T>Prêt à passer à l&apos;action ?</T></h3>
                        <p className="text-sm text-gray-400 mb-4"><T>Notre équipe vous accompagne dans chaque étape de votre projet.</T></p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <Link href="/rendez-vous" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all">
                                <T>Prendre rendez-vous</T>
                            </Link>
                            <Link href="/contact" className="bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-6 py-3 rounded-xl border border-white/10 transition-all">
                                <T>Nous contacter</T>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </article>
        </div>
    )
}

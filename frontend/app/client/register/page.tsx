'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, User, Phone } from 'lucide-react'

export default function ClientRegisterPage() {
    const [form, setForm] = useState({ nom: '', prenom: '', email: '', phone: '', password: '', confirm: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [linkedDocs, setLinkedDocs] = useState(0)
    const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const emailParam = params.get('email')
            if (emailParam) setForm(f => ({ ...f, email: decodeURIComponent(emailParam) }))
        }
    }, [])

    const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (form.password !== form.confirm) {
            setError('Les mots de passe ne correspondent pas.')
            return
        }
        if (form.password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.')
            return
        }

        setIsLoading(true)

        try {
            // 1. Inscription Supabase Auth
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: form.email.trim().toLowerCase(),
                password: form.password,
                options: {
                    data: { nom: form.nom, prenom: form.prenom }
                }
            })

            if (signUpError) throw new Error(signUpError.message)
            if (!authData.user) throw new Error('Erreur lors de la création du compte.')

            // 2. Créer profil + lier documents existants
            const res = await fetch('/api/client/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: authData.user.id,
                    email: form.email.trim().toLowerCase(),
                    nom: form.nom,
                    prenom: form.prenom,
                    phone: form.phone,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Erreur lors de la configuration du compte.')

            setLinkedDocs(json.linked?.documents || 0)
            setSuccess(true)

            if (authData.session) {
                // Email confirmation désactivée → redirection directe
                const from = new URLSearchParams(window.location.search).get('from')
                setTimeout(() => { window.location.href = from || '/client/dashboard' }, 1800)
            } else {
                // Email confirmation requise → informer l'utilisateur
                setNeedsEmailConfirm(true)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-nexus-deep flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-50 bg-[radial-gradient(circle,rgba(59,130,246,0.12)_0%,transparent_70%)]" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-40 bg-[radial-gradient(circle,rgba(99,102,241,0.1)_0%,transparent_70%)]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 32, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[460px] relative z-10"
            >
                <div className="text-center mb-7">
                    <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="inline-flex items-center justify-center w-[68px] h-[68px] rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[2px] mb-4 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
                        <div className="w-full h-full bg-nexus-deep rounded-[14px] flex items-center justify-center">
                            <User size={30} className="text-blue-400" />
                        </div>
                    </motion.div>
                    <h1 className="text-2xl font-black text-white">CRÉER MON <span className="text-blue-400">COMPTE</span></h1>
                    <p className="text-gray-500 mt-1.5 uppercase tracking-[0.3em] text-[9px] font-bold">Retour Gagnant Bénin — Espace Client</p>
                </div>

                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                            <div className="w-16 h-16 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} className="text-blue-400" />
                            </div>
                            <h2 className="text-xl font-black text-white mb-2">Compte créé !</h2>
                            <p className="text-gray-400 text-sm mb-4">
                                Bienvenue, <strong className="text-white">{form.prenom || form.nom}</strong> !
                            </p>
                            {linkedDocs > 0 && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
                                    <p className="text-blue-300 text-sm font-bold">
                                        🎉 {linkedDocs} document{linkedDocs > 1 ? 's' : ''} retrouvé{linkedDocs > 1 ? 's' : ''} et lié{linkedDocs > 1 ? 's' : ''} à votre compte.
                                    </p>
                                </div>
                            )}
                            {needsEmailConfirm ? (
                                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <p className="text-blue-300 text-sm font-bold mb-1">Vérifiez votre email</p>
                                    <p className="text-gray-400 text-xs">Un lien de confirmation a été envoyé à <strong className="text-white">{form.email}</strong>. Cliquez dessus pour activer votre compte.</p>
                                    <Link href="/client/login" className="inline-flex items-center gap-1 mt-3 text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors">
                                        <ArrowRight size={12} /> Aller à la connexion
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <p className="text-gray-500 text-xs">Redirection vers votre espace...</p>
                                    <div className="mt-4">
                                        <Loader2 className="animate-spin text-blue-400 mx-auto" size={20} />
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/8 border border-red-500/15">
                                            <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-red-400 text-[12px]">{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Nom</label>
                                        <input type="text" required value={form.nom} onChange={e => update('nom', e.target.value)}
                                            placeholder="Dupont" className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none text-[13px] transition-colors" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Prénom</label>
                                        <input type="text" value={form.prenom} onChange={e => update('prenom', e.target.value)}
                                            placeholder="Marie" className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none text-[13px] transition-colors" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
                                        <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                                            placeholder="votre@email.com" autoComplete="email"
                                            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none text-[13px] transition-colors" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Téléphone (optionnel)</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
                                        <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                                            placeholder="+33 6 12 34 56 78"
                                            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none text-[13px] transition-colors" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Mot de passe</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
                                            <input type={showPassword ? 'text' : 'password'} required minLength={8} value={form.password} onChange={e => update('password', e.target.value)}
                                                placeholder="Min. 8 car."
                                                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 rounded-xl py-3 pl-11 pr-10 text-white placeholder:text-gray-600 focus:outline-none text-[13px] transition-colors" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-400 transition-colors" tabIndex={-1}>
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Confirmer</label>
                                        <input type={showPassword ? 'text' : 'password'} required value={form.confirm} onChange={e => update('confirm', e.target.value)}
                                            placeholder="Confirmer"
                                            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none text-[13px] transition-colors" />
                                    </div>
                                </div>

                                <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 group relative overflow-hidden shadow-[0_4px_20px_rgba(59,130,246,0.3)] mt-2">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            <span className="tracking-[0.1em] text-[12px]">CRÉER MON COMPTE</span>
                                            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </motion.button>
                            </form>

                            <div className="mt-5 pt-5 border-t border-white/[0.06] text-center">
                                <p className="text-[12px] text-gray-500">
                                    Déjà un compte ?{' '}
                                    <Link href="/client/login" className="text-blue-400 font-bold hover:text-blue-300 transition-colors">Se connecter</Link>
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-center mt-5 text-gray-600 text-[10px]">
                    © {new Date().getFullYear()} Retour Gagnant Bénin — Vos données sont protégées
                </p>
            </motion.div>
        </div>
    )
}

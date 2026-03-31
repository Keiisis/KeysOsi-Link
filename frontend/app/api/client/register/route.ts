import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

// Service role — bypass RLS pour créer le profil, lier les documents, et ignorer la limite/logique SMTP par défaut
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { email, password, nom, prenom, phone, pays, ville } = body

        if (!email || !password) {
            return NextResponse.json({ error: 'email et mot de passe requis' }, { status: 400 })
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.retourgagnantbenin.bj'
        const loginUrl = `${siteUrl}/client/login`

        // 1. Créer le compte avec email_confirm: true — auto-confirmation côté serveur,
        //    aucun lien de redirection envoyé par Supabase, aucun problème de localhost.
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email: email.toLowerCase().trim(),
            password,
            email_confirm: true,
            user_metadata: { nom: nom || '', prenom: prenom || '', phone: phone || '' },
        })

        if (createError) {
            throw new Error(`Erreur inscription: ${createError.message}`)
        }

        const user_id = userData.user.id
        let emailSent = false

        // 2. Envoyer un email de bienvenue via notre SMTP — compte déjà actif, lien direct vers login
        try {
            const { data: settingsData } = await supabase.from('settings').select('key, value').in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_email', 'smtp_from_name'])
            const settings: Record<string, string> = {}
            for (const s of settingsData || []) settings[s.key] = s.value

            if (settings.smtp_host) {
                const transporter = nodemailer.createTransport({
                    host: settings.smtp_host,
                    port: Number(settings.smtp_port) || 465,
                    secure: Number(settings.smtp_port) === 465,
                    auth: { user: settings.smtp_user, pass: settings.smtp_pass },
                    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
                })

                const fromString = `"${settings.smtp_from_name || 'Retour Gagnant Bénin'}" <${settings.smtp_from_email || settings.smtp_user}>`

                // Essayer d'utiliser le template HTML existant avec le lien de connexion
                let htmlContent = `<p>Bienvenue ${prenom || ''} ! Votre compte est activé. <a href="${loginUrl}">Se connecter</a></p>`
                try {
                    const templatePath = path.join(process.cwd(), 'public', 'email_confirm_template.html')
                    const rawTemplate = fs.readFileSync(templatePath, 'utf8')
                    // Remplacer le placeholder de confirmation par le lien de connexion direct
                    htmlContent = rawTemplate
                        .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, loginUrl)
                        .replace(/Confirmez votre (email|inscription|adresse)/gi, 'Accéder à mon espace client')
                        .replace(/Confirmer/gi, 'Se connecter')
                } catch {
                    // fallback inline si template absent
                }

                await transporter.sendMail({
                    from: fromString,
                    to: email,
                    subject: "Bienvenue — Votre compte Retour Gagnant Bénin est activé",
                    html: htmlContent
                })
                emailSent = true
            }
        } catch (mailErr) {
            console.error('Erreur envoi email bienvenue :', mailErr)
        }

        // 3. Créer le profil client
        const { error: profileError } = await supabase
            .from('client_profiles')
            .upsert({
                id: user_id,
                email: email.toLowerCase().trim(),
                nom: nom || null,
                prenom: prenom || null,
                phone: phone || null,
                pays: pays || 'France',
                ville: ville || null,
            }, { onConflict: 'id' })

        if (profileError) {
            throw new Error(`Erreur création profil: ${profileError.message}`)
        }

        // 4. Lier les documents_financiers ayant le même client_email
        const { error: docError } = await supabase
            .from('documents_financiers')
            .update({ client_id: user_id })
            .eq('client_email', email.toLowerCase().trim())
            .is('client_id', null)

        if (docError) {
            console.warn('Liaison documents:', docError.message)
        }

        // 5. Lier les dossiers de suivi ayant le même client_email
        const { error: dossierError } = await supabase
            .from('dossier_tracking')
            .update({ client_id: user_id })
            .eq('client_email', email.toLowerCase().trim())
            .is('client_id', null)

        if (dossierError) {
            console.warn('Liaison dossiers:', dossierError.message)
        }

        // 6. Compter ce qui a été lié
        const { count: docsCount } = await supabase
            .from('documents_financiers')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', user_id)

        const { count: dossiersCount } = await supabase
            .from('dossier_tracking')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', user_id)

        return NextResponse.json({
            success: true,
            linked: {
                documents: docsCount || 0,
                dossiers: dossiersCount || 0,
            },
            needsEmailConfirm: false, // compte déjà confirmé côté serveur, connexion directe possible
            emailSent
        })

    } catch (err) {
        console.error('Erreur API client/register:', err)
        const message = err instanceof Error ? err.message : 'Erreur interne'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

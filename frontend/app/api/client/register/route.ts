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

        // Toujours utiliser NEXT_PUBLIC_SITE_URL pour le redirectTo des emails — jamais le header origin
        // (en dev, origin = localhost:3000 → les liens email pointeraient vers localhost)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.retourgagnantbenin.bj'

        // 1. Créer le compte et générer le lien de confirmation (Bypass SMTP Supabase)
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'signup',
            email: email.toLowerCase().trim(),
            password: password,
            options: {
                data: { nom: nom || '', prenom: prenom || '', phone: phone || '' },
                redirectTo: `${siteUrl}/auth/callback?next=/client/auth-confirm`
            }
        })

        if (linkError) {
            // Si l'utilisateur existe déjà, l'erreur correspond sera levée
            throw new Error(`Erreur inscription: ${linkError.message}`)
        }

        const user_id = linkData.user.id
        const actionLink = linkData.properties?.action_link
        let emailSent = false

        // 2. Envoyer l'email via notre propre SMTP (Nodemailer) avec le template HTML
        try {
            const { data: settingsData } = await supabase.from('settings').select('key, value').in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_email', 'smtp_from_name'])
            const settings: Record<string, string> = {}
            for (const s of settingsData || []) settings[s.key] = s.value

            if (settings.smtp_host && actionLink) {
                const transporter = nodemailer.createTransport({
                    host: settings.smtp_host,
                    port: Number(settings.smtp_port) || 465,
                    secure: Number(settings.smtp_port) === 465, // true for 465, false for other ports
                    auth: { user: settings.smtp_user, pass: settings.smtp_pass },
                    tls: { rejectUnauthorized: false }
                })
                
                const fromString = `"${settings.smtp_from_name || 'Retour Gagnant Bénin'}" <${settings.smtp_from_email || settings.smtp_user}>`
                let htmlContent = `<a href="${actionLink}">Confirmer l'inscription</a>`
                
                try {
                    const templatePath = path.join(process.cwd(), 'public', 'email_confirm_template.html')
                    const rawTemplate = fs.readFileSync(templatePath, 'utf8')
                    htmlContent = rawTemplate.replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, actionLink)
                } catch (readErr) {
                    console.warn("Impossible de lire email_confirm_template.html", readErr)
                }

                await transporter.sendMail({
                    from: fromString,
                    to: email,
                    subject: "Confirmez votre inscription — Retour Gagnant Bénin",
                    html: htmlContent
                })
                emailSent = true
            }
        } catch (mailErr) {
            console.error('Erreur lors de l\'envoi de l\'email de confirmation :', mailErr)
            // On ne bloque pas si l'email échoue, mais on veut quand même alerter s'il faut
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
            needsEmailConfirm: true, // we tell the client we need email confirmation
            emailSent
        })

    } catch (err) {
        console.error('Erreur API client/register:', err)
        const message = err instanceof Error ? err.message : 'Erreur interne'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

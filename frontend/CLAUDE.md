# RETOUR GAGNANT — Mémoire Frontend (Next.js)

> Sous-mémoire dédiée au site web Next.js.
> Lire CLAUDE.md à la racine pour le contexte projet complet.

---

## 🌐 STACK

| Technologie | Détail |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **UI** | Tailwind CSS + shadcn/ui + Framer Motion |
| **Fonts** | Outfit (corps) + Playfair Display (titres) |
| **BDD** | Supabase (supabase-js v2, service role pour API routes) |
| **Auth** | Supabase Auth (email/password, OTP, magic link) |
| **Paiement** | Kkiapay SDK (CDN `k.js`) |
| **Traduction** | Groq LLaMA 3 (traduction live, 6 langues) |
| **Hébergement** | Vercel |
| **Domaine** | https://www.retourgagnantbenin.bj |

---

## 📁 STRUCTURE ROUTES PUBLIQUES

```
app/(routes)/
├── a-propos/          ← Page À Propos
├── blog/              ← Articles/blog
├── contact/           ← Formulaire contact
├── devenir-partenaire/← Partenariat
├── evenements/        ← Événements communautaires
├── mon-compte/        ← Espace client
├── nationalite/       ← Dossier nationalité béninoise
├── partenaires/       ← Liste partenaires
├── patrimoine/        ← Patrimoine culturel
├── rendez-vous/       ← Prise de RDV
├── services/          ← Catalogue services
│   ├── [slug]/        ← Détail d'un service (dynamique)
│   ├── autres/        ← Services complémentaires
│   ├── nationalite-vip/← Nationalité VIP
│   └── recherche-ancestrale/ ← Recherche généalogique
├── simulateur/        ← Simulateur de coûts
└── suivi-dossier/     ← Suivi de dossier client
```

---

## 🔑 ROUTES API CRITIQUES (40+)

### Services
- `GET /api/services/[slug]` — Détail service (fallback FALLBACK_SERVICES si pas en DB)
- `GET/POST/PATCH /api/admin/services` — CRUD admin

### Mobile
- `GET /api/mobile/dossiers?client_id=X` — Liste dossiers du client
- `POST /api/mobile/dossiers` — Créer un dossier (après paiement mobile)

### Paiement
- `POST /api/checkout` — Initier un paiement Kkiapay
- `POST /api/webhooks/kkiapay` — Webhook de confirmation
- Page `/mobile-payment` — Interface Kkiapay pour le mobile (charge `k.js`)

### Auth
- `POST /api/client/register` — Inscription client
- `POST /api/client/resend-confirmation` — Renvoyer email de confirmation

### Paramètres
- `GET /api/settings/frontend` — Paramètres dynamiques (feature flags, hero content)

### Traduction
- `POST /api/translate` — Traduction via Groq (batch, cache navigateur)

---

## 🌍 TRADUCTION (6 langues)

| Code | Langue | Drapeau |
|------|--------|---------|
| `fr` | Français (défaut) | 🇫🇷 |
| `en` | Anglais | 🇬🇧 |
| `es` | Espagnol | 🇪🇸 |
| `pt` | Portugais (BR) | 🇧🇷 |
| `cr` | Créole Guadeloupéen | 🇬🇵 |
| `ht` | Créole Haïtien | 🇭🇹 |

**Architecture** :
- `<TranslationProvider>` → wrap toute l'app
- `<T>texte en français</T>` → composant de traduction inline
- `const { t, lang } = useTranslation()` → hook
- Cache : `localStorage` avec hash du texte source
- API : `POST /api/translate` → Groq batch de 20 textes max

---

## 🏛️ COMPOSANTS HOME IMPORTANTS

| Composant | Fichier | Rôle |
|-----------|---------|------|
| `HeroSection` | `components/home/HeroSection.tsx` | Vidéo hero + slogan tricolore Bénin |
| `ServicesGrid` | `components/home/ServicesGrid.tsx` | Grille des 9 services |
| `PricingCalculator3D` | `components/services/PricingCalculator3D.tsx` | Calculateur tarifs interactif |
| `GoldenIcon` | `components/ui/GoldenIcon.tsx` | Icônes SVG dorées |

---

## ⚠️ RÈGLE DE SYNCHRONISATION

**Quand tu modifies les services sur le web, tu DOIS aussi les mettre à jour dans :**
1. `mobile/src/screens/main/ServicesScreen.tsx` → `SERVICES_DATA`
2. `mobile/src/screens/main/ServiceDetailsScreen.tsx` (si structure change)

**Quand tu modifies la traduction :**
1. Les langues supportées sont dans `lib/translation/constants.ts`
2. Le mobile aura le même fichier dans `mobile/src/config/languages.ts` (à créer si besoin)

---

*Dernière mise à jour : 2026-04-13 15:22*

# 🧠 RETOUR GAGNANT — MÉMOIRE PERSISTANTE CLAUDE CODE v3.0

> **⚡ CE FICHIER EST TON CERVEAU.** Tu le lis EN PREMIER, AUTOMATIQUEMENT, à chaque nouvelle session.
> **DERNIÈRE MISE À JOUR** : 2026-04-13 15:45
> **PROTOCOLE** : Diary + Planning-with-Files + Context-Save/Restore

---

## 🚨 PROTOCOLE AUTONOME — 5 RÈGLES D'OR

### RÈGLE 1 — AUTO-RESTORE (Début de session)
Quand l'utilisateur dit **"continue"**, **"reprends"**, **"on continue"** ou n'importe quelle variante :
1. **LIS** `CLAUDE.md` (ce fichier)
2. **LIS** la section `ÉTAT ACTUEL` pour trouver la tâche `⏳ EN COURS` ou la première `⬜`
3. **DIS EN 1 PHRASE** ce que tu vas faire : "Je reprends à [tâche X]. C'est parti."
4. **CODE** immédiatement, sans demander confirmation
5. **NE REFAIS JAMAIS** ce qui est marqué ✅

### RÈGLE 2 — AUTO-SAVE (Fin de session / Limite atteinte)
**AVANT de terminer** (tu sens que ta réponse sera longue ou que tu approches de la limite) :
1. **METS À JOUR** la section `ÉTAT ACTUEL` de ce fichier
2. Coche ✅ ce que tu as terminé
3. Marque ⏳ ce qui est en cours avec **contexte exact** (fichier, ligne, erreur)
4. Ajoute de nouvelles ⬜ si des tâches ont été découvertes
5. Met à jour le `JOURNAL DE BORD` avec un résumé de ta session
6. **DIS** : "✅ Mémoire sauvegardée. Dis 'continue' pour reprendre."

### RÈGLE 3 — RÈGLE DES 2 ACTIONS
> Après chaque 2 actions majeures (éditions de fichier, commandes), **sauvegarde mentalement** ton progrès.
> Si tu sens que tu approches de la limite, **STOPPE et SAUVE immédiatement** ce fichier.

### RÈGLE 4 — LECTURE AVANT DÉCISION
Avant toute décision architecturale majeure, **relis ce fichier** pour t'assurer d'être aligné avec :
- Le design system (Or/Ivoire/Bleu Nuit)
- Les conventions (FR, TypeScript strict, pas de noir pur)
- Les pièges connus

### RÈGLE 5 — AUTONOMIE TOTALE
Tu es un **agent autonome**. Tu ne demandes PAS "Voulez-vous que je...?" ou "Dois-je...?"
Tu FAIS. Tu codes. Tu testes. Tu corriges. Tu avances.
La seule exception : si tu dois prendre une décision business (supprimer un service, changer de provider paiement, etc.)

---

## 📍 ÉTAT ACTUEL

### 🎯 OBJECTIF PRINCIPAL
**Parité totale Mobile ↔ Web + Application productionready**
L'app mobile Expo doit être une copie fidèle et fonctionnelle du site web Next.js, connectée en temps réel à Supabase.

### ✅ TERMINÉ (ne pas refaire)

#### Synchronisation des données
- ✅ `ServicesScreen.tsx` — 9 services synchronisés avec le web (titres, desc, features, prix, pricing_options)
- ✅ `ServiceDetailsScreen.tsx` — Refonte complète : pricing_options grid, Pack VIP Passeport 3 étapes, CTA "Prêt à démarrer ?"
- ✅ `AboutScreen.tsx` — Contenu identique au web : "Notre Histoire", 4 valeurs (Excellence, Engagement, Proximité, Confiance), 4 équipes, URLs corrigées → retourgagnantbenin.bj
- ✅ `FAQScreen.tsx` — Email corrigé → contact@retourgagnantbenin.bj

#### Navigation & Types
- ✅ `AppNavigator.tsx` — Types route étendus (subtitle, fullDescription, pricing_options, documents, features)

#### Paiement Kkiapay
- ✅ `KkiapayModal.tsx` — Paiement réel via `Linking.openURL()` (pas WebView = compatible Expo Go)
- ✅ `mobile-payment/page.tsx` (web) — Gateway : charge Kkiapay SDK k.js → deep link retour
- ✅ `App.tsx` — Deep link handler : écoute `payment-success`, `payment-failed`, `payment-canceled` + Alert

#### Configuration
- ✅ `app.json` — Deep links : scheme `retourgagnant://`, intentFilters Android, associatedDomains iOS
- ✅ TypeScript : 0 erreur de compilation (vérifié `npx tsc --noEmit`)
- ✅ Expo démarre OK sur localhost:8081

#### Corrections techniques
- ✅ `PaymentsScreen.tsx` — Corrections TypeScript
- ✅ `AppointmentsScreen.tsx` — Corrections TypeScript
- ✅ `DossierScreen.tsx` — Upload documents (camera/gallery/files) connecté Supabase

#### Mémoire & Continuité
- ✅ `CLAUDE.md` racine — Système de mémoire persistante v3 (ce fichier)
- ✅ `mobile/CLAUDE.md` — Sous-mémoire mobile
- ✅ `frontend/CLAUDE.md` — Sous-mémoire frontend
- ✅ `.claude/commands/` — Commandes `/continue`, `/save`, `/status`

### ⬜ TODO — Dans l'ordre de priorité

1. ⬜ **[P1] Traduction mobile** — Port du système multi-langues du web (6 langues : FR, EN, ES, PT, CR, HT)
   - Créer `mobile/src/contexts/LangContext.tsx` amélioré avec cache AsyncStorage
   - Composant `<T>` pour traduction inline (comme le web)
   - Hook `useLang()` dans chaque écran
   - API : `POST /api/translate` → Groq batch

2. ⬜ **[P1] HomeScreen.tsx** — Vérifier parité complète avec le hero du site web
   - Comparer avec `frontend/components/home/HeroSection.tsx`
   - Vérifier le slogan, les stats, les CTA

3. ⬜ **[P2] Audit RLS Supabase** — Row Level Security sur tables critiques
   - `dossiers` : un client ne voit que SES dossiers
   - `client_profiles` : un client ne voit que SON profil
   - `messages` : isolation par conversation

4. ⬜ **[P2] Test paiement Kkiapay sandbox** — Flux complet end-to-end
   - Service → KkiapayModal → navigateur → paiement sandbox → deep link retour → Alert → POST /api/mobile/dossiers

5. ⬜ **[P2] Upload documents Supabase** — Tester bucket `dossier-documents`
   - Vérifier les permissions du bucket (public/private)
   - Tester upload réel depuis DossierScreen

6. ⬜ **[P3] Notifications push** — Connecter expo-notifications aux events Supabase
   - Écouter `dossiers.status` via Supabase Realtime
   - Envoyer une notification locale quand le statut change

7. ⬜ **[P3] MessagesScreen** — Vérifier le système de messagerie temps réel
   - Supabase Realtime subscription sur `messages`
   - Envoi de messages depuis le mobile

8. ⬜ **[P4] Git commit** — Commiter les 22 fichiers modifiés
   - `git add -A && git commit -m "feat(mobile): sync complète web↔mobile + deep links + mémoire"`

9. ⬜ **[P4] Audit visuel** — Tester tous les 15 écrans sur device réel

---

## 📌 IDENTITÉ DU PROJET

| Clé | Valeur |
|-----|--------|
| **Nom** | Retour Gagnant Bénin |
| **URL** | https://www.retourgagnantbenin.bj |
| **Mission** | Accompagnement diaspora béninoise/afro-descendante (passeport, nationalité, immobilier, business) |
| **Workspace** | `c:\Users\HP\Desktop\RETOUR GAGNANT TEMPLATE` |
| **Frontend** | Next.js 15 App Router — `frontend/` |
| **Mobile** | Expo SDK 52 React Native — `mobile/` |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **Paiement** | Kkiapay (Mobile Money MTN/Moov + Carte bancaire) |
| **Traduction** | Groq LLaMA 3 (batch, cache localStorage/AsyncStorage) |
| **Hébergement** | Vercel |
| **OS Dev** | Windows 11 — PowerShell |
| **Domaine email** | contact@retourgagnantbenin.bj |

---

## 🏗️ ARCHITECTURE COMPLÈTE

```
RETOUR GAGNANT TEMPLATE/
│
├── CLAUDE.md                    ← 🧠 CE FICHIER — Mémoire maître
│
├── frontend/                    ← Next.js 15 App Router
│   ├── CLAUDE.md                ← Sous-mémoire frontend
│   ├── app/
│   │   ├── (routes)/            ← Pages publiques (services, a-propos, contact...)
│   │   ├── admin/               ← Dashboard administrateur
│   │   ├── agent/               ← Espace agent terrain
│   │   ├── client/              ← Espace client web (dashboard, messages, dossier)
│   │   ├── ceo/                 ← Dashboard CEO
│   │   ├── api/                 ← 40+ API Routes
│   │   │   ├── admin/           ← CRUD admin (services, users, waf)
│   │   │   ├── checkout/        ← Paiement Kkiapay/FedaPay/PayPal
│   │   │   ├── client/          ← Register, login, profil
│   │   │   ├── mobile/          ← API dédiée mobile (dossiers)
│   │   │   ├── translate/       ← Traduction Groq batch
│   │   │   └── webhooks/        ← Callbacks Kkiapay/FedaPay
│   │   └── mobile-payment/      ← Gateway paiement pour l'app mobile
│   ├── components/              ← UI components (200+)
│   ├── lib/                     ← Supabase client, email, traduction, utils
│   └── public/                  ← Assets statiques
│
├── mobile/                      ← Expo React Native (SDK 52)
│   ├── CLAUDE.md                ← Sous-mémoire mobile
│   ├── App.tsx                  ← Entry point + deep links + fonts
│   ├── app.json                 ← Config Expo + scheme + plugins + permissions
│   ├── src/
│   │   ├── screens/
│   │   │   ├── auth/            ← Login, Register, ForgotPassword, SplashScreen
│   │   │   └── main/            ← 15 écrans principaux
│   │   ├── components/          ← KkiapayModal, LanguagePicker
│   │   ├── config/              ← theme.ts, supabase.ts
│   │   ├── contexts/            ← AuthContext, LangContext
│   │   └── navigation/          ← AppNavigator, MainTabNavigator
│   └── .env                     ← Variables Supabase + API URL
│
├── .claude/
│   ├── settings.json            ← Permissions Claude Code
│   ├── settings.local.json      ← Permissions locales (auto-générées)
│   └── commands/                ← Commandes slash personnalisées
│       ├── continue.md          ← /continue — Reprendre le travail
│       ├── save.md              ← /save — Sauvegarder l'état
│       └── status.md            ← /status — Rapport complet
│
└── diary/                       ← Journal de développement (auto-créé)
    └── 2026/04/                 ← Logs par mois
```

---

## 🔑 VARIABLES D'ENVIRONNEMENT

### Mobile (`mobile/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://ywvsfhqdtkgzavxsumnk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EXPO_PUBLIC_API_URL=https://retourgagnantbenin.bj
```

### Frontend (`frontend/.env.local`) — Clés critiques
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY         ← SERVEUR UNIQUEMENT, jamais côté client
NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY    ← Clé publique Kkiapay
NEXT_PUBLIC_KKIAPAY_SANDBOX       ← true = mode test, false = production
GROQ_API_KEY                      ← Pour traduction IA
```

---

## 🎨 DESIGN SYSTEM — "Pro Max Ivoire/Or/Bleu Nuit"

### Palette de couleurs

| Token | Hex | Usage | ⚠️ Règle |
|-------|-----|-------|----------|
| `gold` | `#C9A84C` | Primaire, CTA, accents | Utilisation principale |
| `goldLight` | `#D4B85A` | Texte sur fond sombre | |
| `background` | `#FAF8F4` | Fond ivoire chaud | JAMAIS #FFF pur |
| `surface` | `#FFFFFF` | Cartes, modales | |
| `surfaceWarm` | `#F5F0E8` | Sections alternées | |
| `headerBg` / `navy` | `#1B2A4A` | Headers bleu nuit | |
| `textPrimary` | `#1B2A4A` | Texte principal | JAMAIS #000 |
| `textSecondary` | `#6B7280` | Texte secondaire | |
| Bénin Vert | `#008751` | Services, succès, CTA | Drapeau |
| Bénin Jaune | `#FCD116` | Badges, highlights | Drapeau |
| Bénin Rouge | `#E8112D` | Alertes, labels | Drapeau |

### Typographie
- **Titres** : Playfair Display (700 Bold)
- **Corps** : Inter (400 Regular → 700 Bold)
- **Icônes mobile** : Ionicons
- **Icônes web** : Lucide React

### Règles NON NÉGOCIABLES
- ❌ **JAMAIS** de noir pur `#000000`
- ❌ **JAMAIS** de fond blanc pur `#FFFFFF` pour le background principal
- ❌ **JAMAIS** de couleurs génériques (red, blue, green natifs)
- ✅ TOUJOURS le trio Or/Ivoire/Bleu Nuit

---

## 📦 LES 9 SERVICES — Source de vérité unique

| # | Slug | Titre | Prix base | Icône mobile |
|---|------|-------|-----------|-------------|
| 1 | `passeport` | Passeport & Documents Officiels | 50 000 FCFA | `document-text` |
| 2 | `logement` | Acheter ou Louer un Bien | 25 000 FCFA | `home` |
| 3 | `business` | Création d'Entreprise | 150 000 FCFA | `briefcase` |
| 4 | `culture` | Tourisme & Culture | 80 000 FCFA/pers | `earth` |
| 5 | `construction` | Suivi de Chantier | 50 000 FCFA | `construct` |
| 6 | `investissement` | Investissement | 50 000 FCFA | `trending-up` |
| 7 | `nationalite-vip` | Nationalité VIP | 150 000 FCFA | `ribbon` |
| 8 | `recherche-ancestrale` | Recherche Ancestrale | 250 € | `people` |
| 9 | `autres` | Autres Services | Nous contacter | `apps` |

### ⚠️ FICHIERS JUMELÉS — Modifier les 2 en même temps !
| Source | Fichier |
|--------|---------|
| **Web** (maître) | `frontend/app/(routes)/services/[slug]/page.tsx` → `FALLBACK_SERVICES` |
| **Mobile** | `mobile/src/screens/main/ServicesScreen.tsx` → `SERVICES_DATA` |

---

## 💳 FLUX PAIEMENT KKIAPAY (Architecture complète)

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION MOBILE                            │
│  ServiceDetailsScreen → KkiapayModal                            │
│    │                      │                                     │
│    │ Sélection service    │ Linking.openURL()                   │
│    │ + options prix       │ ──────────────────────┐             │
│    ▼                      ▼                       │             │
│                                                   │             │
│  ◄──────────────────────────── Deep Link ──────── │             │
│  retourgagnant://payment-success?transactionId=X  │             │
│  retourgagnant://payment-failed                   │             │
│  retourgagnant://payment-canceled                 │             │
│    │                                              │             │
│    ▼ Alert.alert()                                │             │
│    │ POST /api/mobile/dossiers                    │             │
│    ▼ Création dossier Supabase                    │             │
└───────────────────────────────────────────────────│─────────────┘
                                                    │
┌───────────────────────────────────────────────────▼─────────────┐
│                    SITE WEB (Next.js)                            │
│  /mobile-payment?amount=X&service=Y&name=Z                     │
│    │                                                            │
│    ▼ Charge Kkiapay SDK (k.js CDN)                             │
│    │                                                            │
│    ▼ openKkiapayWidget({ amount, key, sandbox })               │
│    │                                                            │
│    ├── successCallback → window.location = deep link success    │
│    ├── failedCallback  → window.location = deep link failed     │
│    └── closeCallback   → window.location = deep link canceled   │
└─────────────────────────────────────────────────────────────────┘
```

**⚠️ CONTRAINTES TECHNIQUES :**
- ❌ PAS de `expo-web-browser` (crash Expo Go)
- ❌ PAS de WebView (Kkiapay SDK incompatible)
- ✅ `Linking.openURL()` → navigateur système → deep link retour

---

## 🗄️ TABLES SUPABASE

| Table | Colonnes clés | Usage |
|-------|---------------|-------|
| `services` | id, slug, title, description, price, features, pricing_options | Catalogue services |
| `dossiers` | id, client_id, service_type, status, progress, created_at | Dossiers client |
| `dossier_documents` | id, dossier_id, file_url, file_type, uploaded_at | Documents attachés |
| `client_profiles` | id, user_id, first_name, last_name, phone, address | Profil client |
| `messages` | id, sender_id, receiver_id, content, read, created_at | Messagerie interne |
| `notifications` | id, user_id, title, message, read, type | Notifications |
| `appointments` | id, client_id, date, time, type, status, notes | Rendez-vous |
| `events` | id, title, date, location, description, image_url | Événements communautaires |
| `settings` | key, value, category | Paramètres dynamiques |
| `products` | id, name, price, stock, image_url, category | Boutique |
| `orders` | id, client_id, total, status, payment_method | Commandes boutique |
| `page_sections` | id, page_slug, section_key, content | Contenu dynamique pages |

### Statuts de dossier
```
'pending' → 'in_progress' → 'review' → 'approved' → 'completed'
                                     → 'rejected'
```

---

## 📱 15 ÉCRANS MOBILE — Registre complet

| # | Écran | Fichier | Tab | Statut Sync |
|---|-------|---------|-----|-------------|
| 1 | Accueil | `HomeScreen.tsx` | Home | ⬜ À vérifier |
| 2 | Services | `ServicesScreen.tsx` | Home | ✅ |
| 3 | Détail service | `ServiceDetailsScreen.tsx` | — | ✅ |
| 4 | Mon Dossier | `DossierScreen.tsx` | Dossier | ✅ |
| 5 | Messages | `MessagesScreen.tsx` | Messages | ⬜ À vérifier |
| 6 | Événements | `EventsScreen.tsx` | Events | ✅ |
| 7 | Détail event | `EventDetailScreen.tsx` | — | ✅ |
| 8 | Profil | `ProfilScreen.tsx` | Profil | ✅ |
| 9 | Modifier profil | `EditProfilScreen.tsx` | — | ✅ |
| 10 | Paiements | `PaymentsScreen.tsx` | — | ✅ |
| 11 | Rendez-vous | `AppointmentsScreen.tsx` | — | ✅ |
| 12 | Notifications | `NotificationsScreen.tsx` | — | ✅ |
| 13 | Sécurité | `SecurityScreen.tsx` | — | ✅ |
| 14 | FAQ | `FAQScreen.tsx` | — | ✅ |
| 15 | À Propos | `AboutScreen.tsx` | — | ✅ |

---

## 🔗 MAP DES FICHIERS CRITIQUES

| Rôle | Fichier | Notes |
|------|---------|-------|
| **Entry point mobile** | `mobile/App.tsx` | Deep links + fonts + providers |
| **Config Expo** | `mobile/app.json` | Scheme + plugins + permissions |
| **Navigation** | `mobile/src/navigation/AppNavigator.tsx` | Stack navigator + types |
| **Tabs** | `mobile/src/navigation/MainTabNavigator.tsx` | 5 tabs bottom |
| **Auth** | `mobile/src/contexts/AuthContext.tsx` | Supabase Auth session |
| **Lang** | `mobile/src/contexts/LangContext.tsx` | Sélecteur langue |
| **Theme** | `mobile/src/config/theme.ts` | Design tokens complets |
| **Supabase** | `mobile/src/config/supabase.ts` | Client Supabase init |
| **Paiement** | `mobile/src/components/KkiapayModal.tsx` | Modal + Linking |
| **Gateway web** | `frontend/app/mobile-payment/page.tsx` | Charge SDK Kkiapay |
| **API dossiers** | `frontend/app/api/mobile/dossiers/route.ts` | GET/POST dossiers mobile |
| **Services web** | `frontend/app/(routes)/services/[slug]/page.tsx` | Source de vérité services |
| **Traduction web** | `frontend/lib/translation/TranslationProvider.tsx` | Provider + composant T |

---

## ⚠️ PIÈGES CONNUS — Ne JAMAIS reproduire

| # | Piège | Impact | Solution |
|---|-------|--------|----------|
| 1 | `expo-web-browser` / WebView | 💥 CRASH Expo Go | `Linking.openURL()` uniquement |
| 2 | `SUPABASE_SERVICE_ROLE_KEY` côté client | 🔒 Faille sécurité critique | Uniquement dans API Routes serveur |
| 3 | `Alert.prompt()` sur Android | 💥 N'existe pas | Modal custom avec TextInput |
| 4 | Polices non chargées au render | 💥 Crash silencieux | `useFonts()` + SplashScreen dans App.tsx |
| 5 | Params navigation non typés | ❌ Erreur TS | Déclarer dans `RootStackParamList` |
| 6 | URL `retour-gagnant.com` | ❌ Mauvais domaine | `retourgagnantbenin.bj` |
| 7 | Email `contact@retour-gagnant.com` | ❌ Mauvais email | `contact@retourgagnantbenin.bj` |
| 8 | `npm install` avec peer deps | ⚠️ Conflits | `--legacy-peer-deps` si nécessaire |
| 9 | Supabase `from()` sans `.select()` | ⚠️ Renvoie rien | Toujours `.select('*')` |
| 10 | Modifier un service sans l'autre | 🐛 Désynchronisation | **TOUJOURS** modifier web ET mobile ensemble |

---

## 📐 CONVENTIONS DE CODE

### Style
- **Langue UI** : Français
- **Langue code** : Anglais (noms de variables, fonctions)
- **Commentaires** : Français
- **TypeScript** : Mode strict, tout typer (jamais `any` sauf exception documentée)

### Mobile
- **Styles** : `StyleSheet.create({})` — jamais de styles inline
- **Navigation** : React Navigation 6 (Stack + Tab)
- **State** : Hooks React (`useState`, `useEffect`, `useContext`)
- **API** : `supabase.from('table').select()` avec try/catch + données fallback

### Web
- **CSS** : Tailwind CSS
- **Components** : shadcn/ui + Radix
- **Animations** : Framer Motion
- **API** : Next.js API Routes (`app/api/`)

### Git
- **Messages** : `feat(scope): description` / `fix(scope): description`
- **Scopes** : `mobile`, `frontend`, `api`, `supabase`, `config`

---

## 🚀 COMMANDES RAPIDES

```powershell
# ── FRONTEND ──
cd "c:\Users\HP\Desktop\RETOUR GAGNANT TEMPLATE\frontend"
npm run dev                    # Serveur dev → localhost:3000
npm run build                  # Build production
npx tsc --noEmit               # Type check

# ── MOBILE ──
cd "c:\Users\HP\Desktop\RETOUR GAGNANT TEMPLATE\mobile"
npx expo start --clear         # Expo Go avec cache vidé
npx tsc --noEmit               # Type check mobile

# ── GIT ──
cd "c:\Users\HP\Desktop\RETOUR GAGNANT TEMPLATE"
git diff --stat HEAD            # Fichiers modifiés
git add -A                      # Stage tout
git commit -m "feat(mobile): sync complète web↔mobile"
git push                        # Push sur remote
```

---

## 📔 JOURNAL DE BORD

> **Format** : `[Date] [Heure] — Résumé de session`
> **Règle** : Mis à jour AUTOMATIQUEMENT par Claude Code à chaque fin de session.

### 2026-04-13 15:45 — Session 3 (Mémoire Ultra v3)
- Création du système de mémoire v3 fusionnant diary + planning-with-files + context-save/restore
- Commandes slash : `/continue`, `/save`, `/status`
- Script auto-scan `prepare_session.ps1`
- Sous-mémoires frontend + mobile

### 2026-04-13 14:00 — Session 2 (Synchronisation suite)
- `AboutScreen.tsx` synchronisé avec le web
- `FAQScreen.tsx` email corrigé
- `app.json` deep links (Android intentFilters + iOS associatedDomains)
- `App.tsx` deep link handler (payment-success/failed/canceled)
- 0 erreur TypeScript

### 2026-04-13 10:00 — Session 1 (Synchronisation initiale)
- `ServicesScreen.tsx` — 9 services alignés
- `ServiceDetailsScreen.tsx` — Refonte complète avec pricing_options
- `AppNavigator.tsx` — Types de route étendus
- `KkiapayModal.tsx` — Paiement réel via Linking
- `DossierScreen.tsx` — Upload documents

---

## 🧪 TEST — 5 questions de contrôle

Si tu peux répondre à ces 5 questions, ta mémoire est intacte :

| # | Question | Où trouver la réponse |
|---|----------|----------------------|
| 1 | Où en suis-je ? | Section `ÉTAT ACTUEL` → tâche `⏳` ou première `⬜` |
| 2 | Quel est l'objectif ? | `OBJECTIF PRINCIPAL` |
| 3 | Qu'est-ce que j'ai déjà fait ? | Section `✅ TERMINÉ` |
| 4 | Quels pièges éviter ? | Section `PIÈGES CONNUS` |
| 5 | Quel fichier modifier ? | Section `MAP DES FICHIERS CRITIQUES` |

---

*Ce fichier est lu automatiquement par Claude Code VS Code à chaque ouverture du projet.*
*Pattern : Diary + Planning-with-Files + Context-Save/Restore fusionnés.*
*Taille optimisée pour tenir dans la fenêtre de contexte tout en étant exhaustif.*

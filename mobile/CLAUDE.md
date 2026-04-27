# RETOUR GAGNANT — Mémoire Application Mobile

> Sous-mémoire dédiée à l'application mobile Expo (React Native).
> Lire CLAUDE.md à la racine pour le contexte projet complet.

---

## 📱 STACK TECHNIQUE MOBILE

| Technologie | Version | Usage |
|---|---|---|
| Expo | SDK 54 | Framework React Native |
| React Native | 0.81.5 | UI natif |
| React | 19.1.0 | UI |
| TypeScript | 5.9.x | Typage strict |
| @supabase/supabase-js | 2.x | Backend/Auth/Storage |
| @react-navigation/native | 7.x | Navigation (Stack + Tabs) |
| **lucide-react-native** | 1.x | Icônes principales (migration depuis Ionicons) |
| @expo/vector-icons (Ionicons) | 15.x | Fallback / icônes Services |
| expo-document-picker | 14.x | Upload fichiers |
| expo-image-picker | 17.x | Galerie + Caméra |
| expo-linking | (intégré) | Deep Links |
| expo-notifications | 0.32.x | Notifications push |
| expo-secure-store | 15.x | Stockage sécurisé credentials |
| @kkiapay-org/react-native-sdk | 0.1.x | Paiement Mobile Money / Carte (in-app) |
| react-native-webview | 13.x | Dépendance interne du SDK Kkiapay |
| @react-native-async-storage | 2.x | Stockage local (onboarding flag, etc.) |

> ⚠️ **Build : dev build obligatoire** (`expo-dev-client` actif). Plus de support Expo Go car le SDK Kkiapay nécessite des modules natifs.

---

## 🎨 DESIGN SYSTEM = NEXUS EMERALD
**Le mobile adopte officiellement la charte « Nexus Emerald » (Mode Sombre, accents Vert Émeraude / Teal)** héritée du site web.
Le fichier de référence est `mobile/src/config/theme.ts`.

---

## 🧭 NAVIGATION

```
AppNavigator (Stack)
├── OnboardingScreen (première ouverture uniquement)
├── LoginScreen / RegisterScreen / ForgotPasswordScreen (si pas connecté)
└── MainTabNavigator (si connecté)
    ├── Tab "Accueil"     → HomeScreen
    ├── Tab "Services"    → ServicesScreen
    ├── Tab "Dossier"     → DossierScreen
    ├── Tab "Événements"  → EventsScreen
    └── Tab "Profil"      → ProfilScreen
    
    + Stack screens (poussés par-dessus les tabs) :
    ├── ServiceDetails ← Depuis ServicesScreen
    ├── EventDetail    ← Depuis EventsScreen
    ├── EditProfil     ← Depuis ProfilScreen
    ├── Security       ← Depuis ProfilScreen
    ├── Notifications  ← Depuis HomeScreen
    ├── Payments       ← Depuis HomeScreen
    ├── Appointments   ← Depuis HomeScreen
    ├── FAQ            ← Depuis ProfilScreen
    └── About          ← Depuis ProfilScreen
```

---

## 🔄 SYNCHRONISATION WEB ↔ MOBILE

### Règle fondamentale
**Le site web est la SOURCE DE VÉRITÉ.** Le mobile doit TOUJOURS refléter les mêmes données.

### Fichiers jumeaux (à modifier EN PAIRE)

| Web | Mobile | Données |
|-----|--------|---------|
| `frontend/app/(routes)/services/[slug]/page.tsx` → `FALLBACK_SERVICES` | `mobile/src/screens/main/ServicesScreen.tsx` → `SERVICES_DATA` | 9 services complets |
| `frontend/components/home/HeroSection.tsx` | `mobile/src/screens/main/HomeScreen.tsx` | Contenu accueil |
| `frontend/app/mobile-payment/page.tsx` | `mobile/src/components/KkiapayModal.tsx` | Flux paiement |
| `frontend/lib/translation/constants.ts` | `mobile/src/components/LanguagePicker.tsx` | Langues supportées |

### Données synchronisées par service

Chaque service dans `SERVICES_DATA` doit avoir :
- `id` (slug) — identique au web
- `title` — identique
- `subtitle` — identique
- `desc` — court, pour les cartes
- `fullDescription` — long, identique au web
- `features[]` — liste identique au web
- `documents[]` — liste des pièces à fournir
- `pricing_options[]` — `{ label, price }` identique au web
- `price` — prix affiché (identique au web)
- `color` — couleur du service
- `icon` — nom Ionicons

---

## 💳 PAIEMENT : ARCHITECTURE DÉTAILLÉE

**Évolution v1 → v2** : on est passés de `Linking.openURL()` (qui ouvre le navigateur vers `/mobile-payment`) à un **widget natif in-app** via le SDK officiel Kkiapay React Native. Plus user-friendly, retour instantané.

```
┌──────────────────────────┐                    ┌─────────────────┐
│  Mobile App (dev build)  │                    │  Kkiapay API    │
│                          │                    │                 │
│  KkiapayProvider         │                    │                 │
│   └─ KkiapayModal        │                    │                 │
│       └─ openKkiapayWidget()  ───────────────▶│  Widget natif   │
│           sandbox / api_key                   │  (in-app)       │
│           depuis settings    ◀────────────────│  Mobile Money   │
│       └─ addSuccessListener  ◀────────────────│  /Carte         │
│           via useRef (no leak)                │                 │
│                          │                    │                 │
│  onSuccess(transactionId)│                    │                 │
│   └─ POST /api/mobile/dossiers                │                 │
│       (cree dossier DB)  │                    │                 │
└──────────────────────────┘                    └─────────────────┘
```

### Configuration Supabase `settings`
| Clé | Valeur | Effet |
|-----|--------|-------|
| `kkiapay_public_key` | string | Clé API publique Kkiapay |
| `kkiapay_sandbox` | `'true'` / `'false'` | Mode test (`true`) ou prod (`false`) |

### Contraintes techniques (v2)
- ✅ **Dev build obligatoire** (Expo Go non supporté car SDK Kkiapay = module natif)
- ✅ Listeners `addSuccessListener` / `addFailedListener` enregistrés **une seule fois** au mount, callbacks accessibles via `useRef` pour éviter les listeners orphelins (le SDK n'expose pas de removeListener)
- ✅ Le mode sandbox/prod est **lu depuis Supabase**, pas hardcodé

---

## 📊 STATUTS DE DOSSIER

```
soumis → verifie → traitement → validation → termine
                                            ↘ annule
```

| Status | Label | Couleur |
|--------|-------|---------|
| `soumis` | Dossier soumis | `info` (#3B82C4) |
| `verifie` | En cours de vérification | Violet (#7C5CCA) |
| `traitement` | En traitement | `gold` (#C9A84C) |
| `validation` | En validation | Orange (#E07B54) |
| `termine` | Terminé | `success` (#2D9F63) |
| `annule` | Annulé | `danger` (#D94452) |

---

## 🐛 BUGS RÉSOLUS (ne pas réintroduire)

| Bug | Cause | Solution |
|-----|-------|----------|
| Listeners Kkiapay doublés au remount | `addSuccessListener` dans useEffect avec deps `[]` capturait `onSuccess` en stale closure | Ref `onSuccessRef` mise à jour à chaque render, listener enregistré une seule fois |
| Numéro WhatsApp placeholder `22990000000` | Valeur de dev oubliée | Remplacé par numéro agence `2290160322121` |
| API_BASE divergent (avec/sans `www.`) | 5 fichiers, 2 conventions différentes | Standardisé `https://www.retourgagnantbenin.bj` partout |
| Sandbox Kkiapay hardcodé `false` | Pas de toggle pour les tests | Lu depuis `settings.kkiapay_sandbox` Supabase |
| TS2345 sur dates | `null` pas accepté par `Date()` | Vérification `if (date)` avant formatage |
| TS7006 implicit any | Callback `Alert.prompt` | Typage explicite du paramètre |
| Services différents web/mobile | Données hardcodées différentes | Synchronisation manuelle SERVICES_DATA |

---

## 🔧 CHECKLIST PRÉ-COMMIT

- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] Les 9 services sont identiques web et mobile
- [ ] Les `pricing_options` sont présentes sur chaque service
- [ ] Le `KkiapayModal` utilise `Linking` (pas WebView)
- [ ] Pas d'import de modules natifs incompatibles Expo Go
- [ ] Les types dans `RootStackParamList` matchent les params passés

---

*Dernière mise à jour : 2026-04-13 15:20*

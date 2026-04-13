# RETOUR GAGNANT — Mémoire Application Mobile

> Sous-mémoire dédiée à l'application mobile Expo (React Native).
> Lire CLAUDE.md à la racine pour le contexte projet complet.

---

## 📱 STACK TECHNIQUE MOBILE

| Technologie | Version | Usage |
|---|---|---|
| Expo | SDK 52 | Framework React Native |
| React Native | 0.76+ | UI natif |
| TypeScript | 5.3+ | Typage strict |
| @supabase/supabase-js | 2.x | Backend/Auth/Storage |
| @react-navigation/native | 7.x | Navigation (Stack + Tabs) |
| @expo/vector-icons (Ionicons) | 14.x | Icônes |
| expo-document-picker | 1.x | Upload fichiers |
| expo-image-picker | 16.x | Galerie + Caméra |
| expo-linking | 7.x | Ouverture URLs + Deep Links |
| @react-native-async-storage | 2.x | Stockage local |

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

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  Mobile App     │    │  Site Web (Next.js)  │    │  Kkiapay API    │
│                 │    │                      │    │                 │
│ KkiapayModal    │───▶│ /mobile-payment      │───▶│ Widget SDK      │
│ (Linking.openURL)│   │ (charge k.js)       │    │ (paiement)      │
│                 │◀───│ deep link retour     │◀───│ callback        │
│                 │    │                      │    │                 │
│ handleSuccess() │───▶│ /api/mobile/dossiers │───▶│                 │
│ (POST dossier)  │   │ (crée dossier DB)    │    │                 │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
```

### Contraintes techniques
- ❌ PAS de `react-native-webview` (crash Expo Go)
- ❌ PAS de `expo-web-browser` (module natif, crash Expo Go)
- ✅ `Linking.openURL()` uniquement (natif, toujours disponible)

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
| `Cannot find native module` | `react-native-webview` en Expo Go | Remplacé par `Linking.openURL()` |
| TS2345 sur dates | `null` pas accepté par `Date()` | Vérification `if (date)` avant formatage |
| TS7006 implicit any | Callback `Alert.prompt` | Typage explicite du paramètre |
| Plugin crash app.json | `expo-web-browser` plugin | Retiré de `app.json` plugins |
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

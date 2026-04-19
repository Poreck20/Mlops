# FretoMatch 🚛

**Marketplace de transport de marchandises** — Le BlaBlaCar du fret.

FretoMatch met en relation des **expéditeurs** (chargeurs) qui veulent envoyer des marchandises et des **transporteurs** qui ont de la capacité disponible sur leur trajet. Moins cher, plus écologique, transparent.

---

## Aperçu des pages

| URL | Description |
|---|---|
| `/` | Page d'accueil publique |
| `/register` | Inscription (shipper ou carrier) |
| `/login` | Connexion |
| `/annonces` | Liste de toutes les annonces |
| `/annonces/carte` | Vue carte interactive |
| `/shipper` | Dashboard expéditeur |
| `/shipper/nouvelle-demande` | Publier une demande de transport |
| `/carrier` | Dashboard transporteur |
| `/carrier/nouvelle-offre` | Publier un trajet disponible |
| `/bookings/[id]` | Détail réservation + messagerie |
| `/admin` | Panel d'administration |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Carte | **Leaflet + OpenStreetMap** (100% gratuit, sans clé) |
| Géocodage | **Nominatim / OSM** (100% gratuit, sans clé) |
| Routing | **OSRM public** (100% gratuit, sans clé) |
| Paiements | Stripe + Stripe Connect |
| Formulaires | React Hook Form + Zod |
| État global | Zustand |
| Icons | Lucide React |

---

## Prérequis

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm** (inclus avec Node.js)
- Un compte **Supabase** (gratuit) — [supabase.com](https://supabase.com)
- Un compte **Stripe** (gratuit en mode test) — [stripe.com](https://stripe.com)

> La carte, le géocodage et le calcul d'itinéraires utilisent OpenStreetMap/Nominatim/OSRM : **aucune clé API, aucun compte** nécessaire.

---

## Installation pas à pas

### Étape 1 — Cloner le projet

```bash
git clone https://github.com/VOTRE_USERNAME/fretomatch.git
cd fretomatch
npm install
```

---

### Étape 2 — Créer le projet Supabase

1. Allez sur [supabase.com](https://supabase.com) → **New project**
2. Donnez un nom (ex: `fretomatch`), choisissez une région (ex: **West EU Ireland**)
3. Attendez ~2 minutes que le projet soit prêt
4. Allez dans **Settings → API**
5. Notez :
   - **Project URL** → `https://XXXX.supabase.co`
   - **anon public** → clé JWT longue
   - **service_role** → clé secrète (ne jamais exposer côté client)

---

### Étape 3 — Configurer les variables d'environnement

Créez le fichier `.env.local` à la racine du projet :

```bash
cp .env.example .env.local
```

Remplissez `.env.local` avec vos vraies clés :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...

# Stripe (mode test)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Stripe** : dans [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers → API keys**. Activez le mode **Test**.

---

### Étape 4 — Créer le schéma de base de données

1. Dans votre projet Supabase → menu gauche **SQL Editor**
2. Cliquez **New query**
3. Copiez-collez **tout le contenu** du fichier `supabase/schema.sql`
4. Cliquez **Run** (ou `Ctrl+Enter`)
5. Vous devez voir `Success. No rows returned`

Le schéma crée automatiquement :
- 13 tables (users, carrier_profiles, vehicles, documents, shipment_requests, carrier_offers, bookings, conversations, messages, reviews, notifications, incidents, transactions)
- Les politiques RLS (sécurité par ligne)
- Les triggers (profil auto-créé à l'inscription)
- Les index pour les requêtes géographiques

---

### Étape 5 — Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## Structure du projet

```
fretomatch/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Pages login / register
│   │   ├── (main)/                  # Pages avec navbar
│   │   │   ├── annonces/            # Liste + carte
│   │   │   │   └── carte/           # Vue carte interactive
│   │   │   ├── shipper/             # Dashboard expéditeur
│   │   │   ├── carrier/             # Dashboard transporteur
│   │   │   └── bookings/[id]/       # Détail réservation
│   │   ├── admin/                   # Panel admin
│   │   └── api/                     # API Routes
│   │       ├── geocode/             # Géocodage Nominatim
│   │       ├── pricing/             # Calcul du prix
│   │       ├── matching/            # Algorithme de matching
│   │       ├── shipments/           # CRUD demandes
│   │       ├── offers/              # CRUD offres
│   │       └── bookings/            # Workflow + Stripe
│   ├── components/
│   │   ├── ui/                      # Button, Input, Card, Badge...
│   │   ├── map/                     # Carte Leaflet
│   │   ├── forms/                   # AddressInput avec autocomplétion
│   │   └── layout/                  # Navbar + Footer
│   ├── lib/
│   │   ├── supabase/                # Clients Supabase
│   │   ├── mapbox.ts                # Géocodage + routing (OSM/OSRM)
│   │   ├── pricing.ts               # Moteur de calcul de prix
│   │   └── utils.ts                 # Helpers + constantes labels
│   ├── store/auth.ts                # Zustand auth store
│   └── types/index.ts               # Types TypeScript
├── supabase/
│   └── schema.sql                   # Schéma complet PostgreSQL + RLS
├── .env.example                     # Variables d'environnement template
└── README.md
```

---

## Logique de pricing

```
Prix HT = (distance × 1.20 €/km
         + [si poids > 100 kg] poids × 0.008 × distance
         + [si volume > 1 m³]  volume × 0.05 × distance)
         × [urgent ? × 1.3]
         × [fragile ? × 1.15]
         × [réfrigéré ? × 1.4]
         + détour_km × 0.60 €

Minimum : 30 €
Commission plateforme : 10 % (chargeur)
Payout transporteur : Prix HT
```

---

## Algorithme de matching

Pour une demande donnée, `/api/matching` :

1. Filtre les offres compatibles (date, poids, volume, type marchandise)
2. Calcule la distance Haversine entre chaque offre et la demande
3. Vérifie que l'origine ET la destination sont dans le rayon `detour_max_km`
4. Calcule un score 0–100 :

| Critère | Poids |
|---|---|
| Proximité géographique | 35% |
| Efficacité du détour | 30% |
| Note transporteur | 15% |
| Taux de complétion | 10% |
| Taux de réponse | 10% |

5. Retourne les 20 meilleurs matchs triés par score

---

## Workflow réservation + paiement

```
Chargeur demande
      ↓
[PENDING] — Paiement séquestré Stripe (capture manuelle)
      ↓ Carrier accepte
[CONFIRMED]
      ↓ Chargeur paie
[PAID]
      ↓ Carrier confirme prise en charge (photo)
[IN_TRANSIT]
      ↓ Carrier confirme livraison (photo)
[DELIVERED]
      ↓ Chargeur confirme (ou 48h auto)
[COMPLETED] — Fonds libérés au transporteur (- 10% commission)
```

---

## Rôles

| Rôle | Capacités |
|---|---|
| `SHIPPER` | Publier demandes, voir matchs, réserver, payer, suivre, noter |
| `CARRIER` | Publier offres, accepter réservations, déclarer transport, recevoir paiement |
| `ADMIN` | Valider documents, modérer annonces, gérer litiges, voir KPIs |

---

## Déploiement production

### Vercel (recommandé pour Next.js)

```bash
npm install -g vercel
vercel --prod
```

Ajoutez toutes les variables de `.env.local` dans **Vercel → Settings → Environment Variables**.

### Supabase

Déjà hébergé — aucune action supplémentaire.

### Stripe Webhooks (production)

Dans [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers → Webhooks** :
- Endpoint URL : `https://votre-domaine.com/api/webhooks/stripe`
- Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`

---

## Scripts disponibles

```bash
npm run dev        # Serveur de développement (localhost:3000)
npm run build      # Build de production
npm run start      # Serveur de production
npm run lint       # Lint ESLint
npx tsc --noEmit   # Vérification TypeScript
```

---

## Variables d'environnement — référence

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service Supabase (backend) |
| `STRIPE_SECRET_KEY` | ✅ | Clé secrète Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Clé publique Stripe |
| `STRIPE_WEBHOOK_SECRET` | ✅ prod | Secret webhook Stripe |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL de l'app (`http://localhost:3000` en dev) |

---

## Roadmap

- [x] Auth + rôles (shipper / carrier / admin)
- [x] Formulaires annonces (demande + offre)
- [x] Carte interactive (Leaflet + OpenStreetMap)
- [x] Géocodage adresses (Nominatim)
- [x] Calcul d'itinéraire (OSRM)
- [x] Moteur de matching géospatial
- [x] Calcul de prix automatique
- [x] Workflow réservation complet
- [x] Paiement sécurisé (Stripe séquestre + Connect)
- [x] Messagerie par réservation
- [x] Système d'avis
- [x] Dashboards shipper / carrier
- [x] Admin panel
- [ ] Notifications push (Firebase FCM)
- [ ] Géolocalisation live du transporteur
- [ ] Pricing ML (XGBoost)
- [ ] Matching ML (re-ranking)
- [ ] Application mobile (PWA / React Native)
- [ ] API partenaires (TMS/ERP)

---

## Licence

MIT

---

## Auteur

**Alpha DIALLO** — Université Paris 1 Panthéon-Sorbonne, 2025

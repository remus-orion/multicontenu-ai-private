# MultiContenu AI

Application Next.js + Supabase + Anthropic + Stripe pour transformer un contenu source en contenus adaptés à plusieurs plateformes.

Cette version inclut une protection anti-spam serveur : quotas journaliers par utilisateur, cooldown entre deux générations, limite horaire par IP hashée et journalisation des blocages.

## Installation

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Ordre de mise en place

1. Créer le projet Supabase.
2. Exécuter `supabase-schema.sql` dans le SQL Editor Supabase.
3. Renseigner `.env.local`.
4. Générer une valeur longue pour `RATE_LIMIT_SALT`.
5. Créer un produit Stripe + un prix mensuel, puis placer l'identifiant `price_...` dans `STRIPE_PRICE_PRO_MONTHLY`.
6. Configurer le webhook Stripe vers `/api/stripe/webhook`.
7. Déployer sur Vercel ou serveur Node compatible Next.js.

## Variables anti-spam

```env
RATE_LIMIT_SALT=change_me_with_a_long_random_secret
FREE_DAILY_GENERATION_LIMIT=10
PRO_DAILY_GENERATION_LIMIT=100
ENTERPRISE_DAILY_GENERATION_LIMIT=1000
GENERATION_COOLDOWN_SECONDS=10
IP_HOURLY_GENERATION_LIMIT=60
MAX_SOURCE_CHARACTERS=20000
```

Recommandation : génère `RATE_LIMIT_SALT` avec une valeur longue et imprévisible, puis garde-la côté serveur uniquement.

Exemple :

```bash
openssl rand -base64 48
```

## Webhook Stripe

Événements à écouter :

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Vérification post-déploiement

- Créer un compte test via `/login`.
- Lancer une génération sur `/dashboard`.
- Vérifier qu'une génération rapide répétée renvoie une erreur 429 de cooldown.
- Vérifier qu'un utilisateur Pro ne peut pas dépasser `PRO_DAILY_GENERATION_LIMIT`.
- Tester le paiement Stripe en mode test.
- Vérifier dans Supabase que `subscriptions.current_period_end` se remplit après un paiement réussi.
- Vérifier que `/admin` affiche les blocages anti-spam.

## Pages principales

- `/login` : connexion par magic link.
- `/dashboard` : création de contenu multi-plateformes.
- `/pricing` : abonnement Stripe.
- `/account` : compte utilisateur.
- `/settings` : réglages du profil.
- `/admin` : tableau admin réservé.

## Sécurité

- Les clés serveur restent côté serveur.
- Les paiements sont synchronisés via webhook Stripe avec signature vérifiée sur le corps brut.
- La version d'API Stripe est épinglée dans `lib/stripe.ts`.
- Les données utilisateur sont protégées par RLS Supabase.
- Les identifiants Stripe internes ne sont pas exposés côté client authentifié.
- La génération IA est protégée par un garde serveur avant tout appel Anthropic.
- Les IP sont hashées avec `RATE_LIMIT_SALT` avant stockage.
- La fonction SQL anti-spam `reserve_generation_guard` est réservée au rôle serveur `service_role`.

## Limites connues

- Cette version utilise un rate limit Supabase/Postgres, suffisant pour MVP et petit lancement.
- Pour très fort trafic, ajouter ensuite un rate limiter Redis externe type Upstash devant `/api/generate`.
- Les quotas ne remplacent pas une surveillance des coûts Anthropic côté console fournisseur.

# MultiContenu AI - Intégralité des fichiers sécurisés anti-spam

Cette annexe contient tous les fichiers texte de la livraison.

## `.env.local.example`

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase public client
NEXT_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta_cle_anon

# Supabase server only, never expose in browser
SUPABASE_SERVICE_ROLE_KEY=ta_cle_service_role

# Anthropic server only
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Stripe server only
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Admin access, comma separated emails
ADMIN_EMAILS=ton-email@example.com

# Anti-spam / cost guard
# Generate a long random value and keep it secret. Example: openssl rand -base64 48
RATE_LIMIT_SALT=change_me_with_a_long_random_secret
FREE_DAILY_GENERATION_LIMIT=10
PRO_DAILY_GENERATION_LIMIT=100
ENTERPRISE_DAILY_GENERATION_LIMIT=1000
GENERATION_COOLDOWN_SECONDS=10
IP_HOURLY_GENERATION_LIMIT=60
MAX_SOURCE_CHARACTERS=20000
```

## `.gitignore`

```gitignore
node_modules
.next
out
.env*.local
.env
.DS_Store
*.log
.vercel
```

## `README.md`

```md
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
```

## `app/account/page.tsx`

```tsx
import Link from "next/link";
import { getProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createSupabaseServerClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,plan,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="page">
      <span className="badge">Compte utilisateur</span>
      <h1 className="title" style={{ fontSize: "3.4rem" }}>Ton compte</h1>

      <section className="grid two">
        <article className="card kpi">
          <span className="label">Email</span>
          <strong style={{ fontSize: "1.25rem" }}>{profile?.email || user.email}</strong>
        </article>
        <article className="card kpi">
          <span className="label">Plan</span>
          <strong>{profile?.plan || "free"}</strong>
        </article>
        <article className="card kpi">
          <span className="label">Crédits restants</span>
          <strong>{profile?.credits_remaining ?? 0}</strong>
        </article>
        <article className="card kpi">
          <span className="label">Abonnement Stripe</span>
          <strong style={{ fontSize: "1.4rem" }}>{subscription?.status || "inactive"}</strong>
          {subscription?.current_period_end ? (
            <span className="subtitle">Fin période : {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}</span>
          ) : null}
        </article>
      </section>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn" href="/settings">Modifier mes réglages</Link>
        <Link className="btn secondary" href="/pricing">Gérer mon plan</Link>
      </div>
    </main>
  );
}
```

## `app/admin/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { emailIsAdmin, getProfile, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (profile?.role !== "admin" && !emailIsAdmin(user.email)) {
    notFound();
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const [profiles, projects, generations, subscriptions, blockedGenerations] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("projects").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("generations").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("security_events").select("id", { count: "exact", head: true }).eq("event_type", "generation_blocked")
  ]);

  const { data: latestUsers } = await supabaseAdmin
    .from("profiles")
    .select("email,plan,credits_remaining,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: latestSecurityEvents } = await supabaseAdmin
    .from("security_events")
    .select("event_type,reason,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="page">
      <span className="badge">Admin panel</span>
      <h1 className="title" style={{ fontSize: "3.4rem" }}>Pilotage</h1>
      <p className="subtitle">Vue serveur uniquement. Les données sensibles passent par la service role côté serveur, jamais côté navigateur.</p>

      <section className="grid">
        <article className="card kpi"><span className="label">Utilisateurs</span><strong>{profiles.count ?? 0}</strong></article>
        <article className="card kpi"><span className="label">Projets</span><strong>{projects.count ?? 0}</strong></article>
        <article className="card kpi"><span className="label">Générations</span><strong>{generations.count ?? 0}</strong></article>
        <article className="card kpi"><span className="label">Abonnements actifs</span><strong>{subscriptions.count ?? 0}</strong></article>
        <article className="card kpi"><span className="label">Blocages anti-spam</span><strong>{blockedGenerations.count ?? 0}</strong></article>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Derniers utilisateurs</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {latestUsers?.map((item) => (
            <div className="notice" key={item.email || item.created_at}>
              <strong>{item.email || "Email inconnu"}</strong>
              <br />
              <span>Plan {item.plan} • crédits {item.credits_remaining} • {new Date(item.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Derniers événements sécurité</h2>
        {!latestSecurityEvents?.length ? <p className="subtitle">Aucun blocage anti-spam pour le moment.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {latestSecurityEvents?.map((item) => (
            <div className="notice" key={`${item.created_at}-${item.reason}`}>
              <strong>{item.reason}</strong>
              <br />
              <span>{item.event_type} • {new Date(item.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
```

## `app/api/generate/route.ts`

```ts
import { NextResponse } from "next/server";
import { getAnthropic, getAnthropicModel } from "@/lib/anthropic";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPlatform, isPlan, MAX_PLATFORMS_PER_GENERATION, PLATFORM_LABELS, type Platform } from "@/lib/plans";
import {
  buildRateLimitMessage,
  getClientIp,
  getGenerationLimitsForPlan,
  hashRateLimitIdentifier,
  type GenerationGuardDecision
} from "@/lib/rate-limit";

export const runtime = "nodejs";

type GenerateRequest = {
  title?: string;
  source_content?: string;
  platforms?: string[];
};

function extractTextFromClaudeResponse(message: { content: Array<{ type: string; text?: string }> }) {
  return message.content
    .map((block) => (block.type === "text" ? block.text || "" : ""))
    .join("\n")
    .trim();
}

function buildPrompt(title: string, sourceContent: string, platform: Platform) {
  return `Tu es un assistant éditorial francophone expert en adaptation multi-plateformes.

Objectif : transformer le contenu source en publication optimisée pour ${PLATFORM_LABELS[platform]}.

Contraintes :
- langue : français
- ton : clair, professionnel, moderne, naturel
- aucune invention factuelle non présente dans la source
- conserve l'intention originale
- adapte la structure à la plateforme
- ajoute un appel à l'action uniquement s'il est cohérent
- ne mets pas d'explication autour, retourne seulement le contenu final

Titre du projet : ${title}

Contenu source :
${sourceContent}`;
}

function normalizePlatforms(values: string[] | undefined) {
  if (!Array.isArray(values)) {
    return [] as Platform[];
  }

  return [...new Set(values.filter(isPlatform))];
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult.user) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }

    const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
    if (Number.isFinite(contentLength) && contentLength > 120000) {
      return NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 });
    }

    let payload: GenerateRequest;
    try {
      payload = (await request.json()) as GenerateRequest;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const title = String(payload.title || "").trim();
    const sourceContent = String(payload.source_content || "").trim();
    const platforms = normalizePlatforms(payload.platforms);

    if (!title || title.length > 160) {
      return NextResponse.json({ error: "Titre invalide." }, { status: 400 });
    }

    if (!platforms.length) {
      return NextResponse.json({ error: "Sélectionne au moins une plateforme." }, { status: 400 });
    }

    if (platforms.length > MAX_PLATFORMS_PER_GENERATION) {
      return NextResponse.json({ error: "Trop de plateformes sélectionnées." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,plan,credits_remaining")
      .eq("id", userResult.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    if (!isPlan(profile.plan)) {
      return NextResponse.json({ error: "Plan utilisateur invalide. Contacte le support." }, { status: 403 });
    }

    const limits = getGenerationLimitsForPlan(profile.plan);

    if (!sourceContent || sourceContent.length > limits.maxSourceCharacters) {
      return NextResponse.json({ error: `Contenu source invalide. Maximum : ${limits.maxSourceCharacters} caractères.` }, { status: 400 });
    }

    let anthropic: ReturnType<typeof getAnthropic>;
    let model: string;

    try {
      anthropic = getAnthropic();
      model = getAnthropicModel();
    } catch {
      return NextResponse.json(
        { error: "Configuration IA manquante côté serveur. Contacte le support." },
        { status: 500 }
      );
    }

    let ipHash: string;
    try {
      ipHash = hashRateLimitIdentifier(getClientIp(request));
    } catch {
      return NextResponse.json(
        { error: "Protection anti-spam mal configurée : RATE_LIMIT_SALT manquant." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: guardData, error: guardError } = await supabaseAdmin.rpc("reserve_generation_guard", {
      p_user_id: userResult.user.id,
      p_plan: profile.plan,
      p_daily_limit: limits.dailyLimit,
      p_cooldown_seconds: limits.cooldownSeconds,
      p_ip_hash: ipHash,
      p_ip_hourly_limit: limits.ipHourlyLimit
    });

    if (guardError || !guardData) {
      return NextResponse.json(
        { error: "Protection anti-spam indisponible. Génération bloquée par sécurité." },
        { status: 503 }
      );
    }

    const guard = guardData as GenerationGuardDecision;

    if (guard.allowed !== true) {
      return NextResponse.json(
        {
          error: buildRateLimitMessage(guard),
          reason: guard.reason || "unknown",
          retry_after_seconds: guard.retry_after_seconds || null
        },
        { status: 429 }
      );
    }

    if (profile.plan === "free") {
      const { data: creditConsumed, error: creditError } = await supabase.rpc("consume_credit", {
        p_user_id: userResult.user.id
      });

      if (creditError || creditConsumed !== true) {
        return NextResponse.json({ error: "Crédits insuffisants. Passe au plan Pro pour continuer." }, { status: 402 });
      }
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: userResult.user.id,
        title,
        source_content: sourceContent
      })
      .select("id")
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Impossible de créer le projet." }, { status: 500 });
    }

    const generations = [] as Array<{ platform: Platform; content: string }>;

    for (const platform of platforms) {
      const { data: generationRow } = await supabase
        .from("generations")
        .insert({
          project_id: project.id,
          platform,
          status: "processing"
        })
        .select("id")
        .single();

      try {
        const message = await anthropic.messages.create({
          model,
          max_tokens: 1200,
          temperature: 0.7,
          messages: [
            {
              role: "user",
              content: buildPrompt(title, sourceContent, platform)
            }
          ]
        });

        const content = extractTextFromClaudeResponse(message);
        generations.push({ platform, content });

        if (generationRow?.id) {
          await supabase
            .from("generations")
            .update({
              content,
              status: "completed",
              tokens_used: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0) || null
            })
            .eq("id", generationRow.id);
        }
      } catch (generationError) {
        generations.push({ platform, content: "" });

        if (generationRow?.id) {
          await supabase
            .from("generations")
            .update({
              status: "error",
              error_message: generationError instanceof Error ? generationError.message : "Erreur IA inconnue."
            })
            .eq("id", generationRow.id);
        }
      }
    }

    await supabase.from("usage_events").insert({
      user_id: userResult.user.id,
      event_type: "generation",
      metadata: {
        project_id: project.id,
        platforms,
        daily_limit: guard.daily_limit || limits.dailyLimit,
        remaining_today: guard.remaining_today ?? null
      }
    });

    return NextResponse.json({
      project_id: project.id,
      generations,
      quota: {
        remaining_today: guard.remaining_today ?? null,
        daily_limit: guard.daily_limit || limits.dailyLimit
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 }
    );
  }
}
```

## `app/api/stripe/create-checkout/route.ts`

```ts
import { NextResponse } from "next/server";
import { getAppUrl, requireEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult.user) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const stripe = getStripe();
    const supabaseAdmin = createSupabaseAdminClient();
    const priceId = requireEnv("STRIPE_PRICE_PRO_MONTHLY");
    const appUrl = getAppUrl();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email,full_name")
      .eq("id", userResult.user.id)
      .single();

    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userResult.user.id)
      .maybeSingle();

    let customerId = existingSubscription?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || userResult.user.email || undefined,
        name: profile?.full_name || undefined,
        metadata: {
          user_id: userResult.user.id
        }
      });

      customerId = customer.id;

      await supabaseAdmin.from("subscriptions").upsert({
        user_id: userResult.user.id,
        stripe_customer_id: customerId,
        status: "inactive",
        plan: "free"
      }, { onConflict: "user_id" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      client_reference_id: userResult.user.id,
      metadata: {
        user_id: userResult.user.id,
        plan: "pro"
      },
      subscription_data: {
        metadata: {
          user_id: userResult.user.id,
          plan: "pro"
        }
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`
    });

    await supabaseAdmin.from("usage_events").insert({
      user_id: userResult.user.id,
      event_type: "checkout_started",
      metadata: {
        stripe_session_id: session.id
      }
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe n'a pas retourné d'URL de paiement." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur Stripe." },
      { status: 500 }
    );
  }
}
```

## `app/api/stripe/webhook/route.ts`

```ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function unixToIso(value: number | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function extractCurrentPeriodEnd(subscription: Stripe.Subscription): number | null {
  const firstItem = subscription.items?.data?.[0];

  if (firstItem && typeof firstItem.current_period_end === "number") {
    return firstItem.current_period_end;
  }

  const legacyValue = (subscription as unknown as { current_period_end?: number }).current_period_end;
  return typeof legacyValue === "number" ? legacyValue : null;
}

async function updateSubscriptionRows(userId: string, customerId: string, subscription: Stripe.Subscription, plan: "free" | "pro") {
  const supabaseAdmin = createSupabaseAdminClient();
  const status = subscription.status;
  const periodEnd = unixToIso(extractCurrentPeriodEnd(subscription));

  await supabaseAdmin.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status,
    plan,
    current_period_end: periodEnd
  }, { onConflict: "user_id" });

  await supabaseAdmin
    .from("profiles")
    .update({
      plan,
      credits_remaining: plan === "pro" ? 999999 : 10
    })
    .eq("id", userId);

  await supabaseAdmin.from("usage_events").insert({
    user_id: userId,
    event_type: status === "canceled" ? "subscription_deleted" : "subscription_updated",
    metadata: {
      stripe_subscription_id: subscription.id,
      status,
      plan
    }
  });
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabaseAdmin = createSupabaseAdminClient();
  const userId = subscription.metadata.user_id;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const status = subscription.status;
  const isPaid = status === "active" || status === "trialing";
  const plan = isPaid ? "pro" : "free";

  if (!userId) {
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (!existing?.user_id) {
      return;
    }

    await updateSubscriptionRows(existing.user_id, customerId, subscription, plan);
    return;
  }

  await updateSubscriptionRows(userId, customerId, subscription, plan);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook invalide." },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de traitement webhook." },
      { status: 500 }
    );
  }
}
```

## `app/auth/callback/route.ts`

```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${requestUrl.origin}/login?message=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
```

## `app/dashboard/page.tsx`

```tsx
import Link from "next/link";
import ProjectGenerator from "@/components/ProjectGenerator";
import { getProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createSupabaseServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id,title,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <span className="badge">Dashboard</span>
          <h1 className="title" style={{ fontSize: "3.4rem" }}>Création multi-contenu</h1>
          <p className="subtitle">Plan : {profile?.plan || "free"} • Crédits : {profile?.credits_remaining ?? 0}</p>
        </div>
        <Link className="btn secondary" href="/pricing">Améliorer le plan</Link>
      </div>

      <ProjectGenerator />

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Derniers projets</h2>
        {!projects?.length ? <p className="subtitle">Aucun projet pour le moment.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {projects?.map((project) => (
            <div className="notice" key={project.id}>
              <strong>{project.title}</strong>
              <br />
              <span>{new Date(project.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
```

## `app/globals.css`

```css
:root {
  --bg: #f7f7f4;
  --panel: #ffffff;
  --ink: #141414;
  --muted: #696969;
  --line: #e7e2d8;
  --accent: #b87333;
  --accent-dark: #7d461e;
  --success: #127a3a;
  --danger: #a62323;
  --radius: 22px;
  --shadow: 0 20px 60px rgba(20, 20, 20, 0.08);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: radial-gradient(circle at top left, rgba(184, 115, 51, 0.14), transparent 34%), var(--bg);
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea,
select {
  font: inherit;
}

.page {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 42px 0 80px;
}

.header {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  font-weight: 900;
  letter-spacing: -0.04em;
  font-size: 1.3rem;
}

.nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--muted);
}

.nav a:hover {
  color: var(--ink);
}

.hero {
  padding: 68px 0 42px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 28px;
  align-items: center;
}

.hero h1,
.title {
  font-size: clamp(2.4rem, 6vw, 5rem);
  line-height: 0.94;
  margin: 0 0 22px;
  letter-spacing: -0.07em;
}

.subtitle {
  color: var(--muted);
  font-size: 1.08rem;
  line-height: 1.65;
  margin: 0 0 26px;
}

.card,
.panel {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.card {
  padding: 28px;
}

.panel {
  padding: 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.grid.two {
  grid-template-columns: repeat(2, 1fr);
}

.btn {
  border: 0;
  border-radius: 999px;
  background: var(--ink);
  color: white;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn.secondary {
  background: white;
  color: var(--ink);
  border: 1px solid var(--line);
}

.btn.accent {
  background: var(--accent);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.field {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.label {
  color: var(--muted);
  font-weight: 700;
  font-size: 0.9rem;
}

.input,
.textarea,
.select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: white;
  color: var(--ink);
  padding: 13px 14px;
  outline: none;
}

.textarea {
  min-height: 180px;
  resize: vertical;
}

.badge {
  display: inline-flex;
  border: 1px solid var(--line);
  background: white;
  border-radius: 999px;
  padding: 7px 10px;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.kpi {
  display: grid;
  gap: 8px;
}

.kpi strong {
  font-size: 2rem;
  letter-spacing: -0.05em;
}

.notice {
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  background: white;
  color: var(--muted);
}

.notice.success {
  border-color: rgba(18, 122, 58, 0.25);
  color: var(--success);
}

.notice.error {
  border-color: rgba(166, 35, 35, 0.25);
  color: var(--danger);
}

pre.output {
  white-space: pre-wrap;
  word-break: break-word;
  background: #171717;
  color: #f8f8f8;
  border-radius: 18px;
  padding: 18px;
  overflow: auto;
}

.footer-note {
  color: var(--muted);
  text-align: center;
  margin-top: 18px;
}

@media (max-width: 850px) {
  .hero,
  .grid,
  .grid.two {
    grid-template-columns: 1fr;
  }

  .header {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

## `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "MultiContenu AI",
  description: "Transforme un contenu source en publications multi-plateformes avec IA."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
```

## `app/login/actions.ts`

```ts
"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/env";

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    redirect("/login?message=email-required");
  }

  const supabase = await createSupabaseServerClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") || getAppUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`
    }
  });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=check-email");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
```

## `app/login/page.tsx`

```tsx
import { signInWithEmail } from "@/app/login/actions";

const messages: Record<string, string> = {
  "check-email": "Magic link envoyé. Va voir ta boîte mail.",
  "email-required": "Entre une adresse email pour te connecter."
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const message = params.message;
  const readableMessage = message ? messages[message] || decodeURIComponent(message) : null;

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <span className="badge">Connexion</span>
        <h1 className="title" style={{ fontSize: "3rem" }}>Entre dans l’atelier.</h1>
        <p className="subtitle">Connexion sans mot de passe par magic link Supabase. Simple, propre, pas de serrure rouillée.</p>

        <form action={signInWithEmail}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required placeholder="toi@example.com" />
          </div>
          <button className="btn" type="submit">Recevoir mon lien</button>
        </form>

        {readableMessage ? <p className="notice" style={{ marginTop: 16 }}>{readableMessage}</p> : null}
      </div>
    </main>
  );
}
```

## `app/page.tsx`

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <span className="badge">MultiContenu AI</span>
          <h1>Un contenu. Cinq formats. Une fusée éditoriale.</h1>
          <p className="subtitle">
            Colle ton idée, ton article, ton script ou ton résumé. L'application le transforme en contenus adaptés pour LinkedIn, X/Twitter, Instagram, TikTok et newsletter.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn" href="/dashboard">Créer un contenu</Link>
            <Link className="btn secondary" href="/pricing">Voir les tarifs</Link>
          </div>
        </div>
        <div className="card">
          <h2>Pipeline intégré</h2>
          <p className="subtitle">
            Auth Supabase, génération Anthropic, paiement Stripe, compte utilisateur, réglages et admin panel. Le petit atelier devient une machine propre.
          </p>
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 10 }}>
            <span className="badge">Login sécurisé</span>
            <span className="badge">Crédits gratuits</span>
            <span className="badge">Abonnement Pro</span>
            <span className="badge">Historique projets</span>
          </div>
        </div>
      </section>
    </main>
  );
}
```

## `app/pricing/page.tsx`

```tsx
import PricingCheckoutButton from "@/components/PricingCheckoutButton";

export default function PricingPage() {
  return (
    <main className="page">
      <section style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 28px" }}>
        <span className="badge">Tarifs</span>
        <h1 className="title">Tarifs simples et transparents</h1>
        <p className="subtitle">Un plan gratuit pour tester. Un plan Pro pour produire régulièrement avec des limites anti-abus claires.</p>
      </section>

      <section className="grid two" style={{ maxWidth: 940, margin: "0 auto" }}>
        <article className="card">
          <span className="badge">Free</span>
          <h2>0 € / mois</h2>
          <p className="subtitle">Pour tester le moteur.</p>
          <ul>
            <li>10 crédits offerts</li>
            <li>5 plateformes</li>
            <li>Historique projets</li>
            <li>Connexion sécurisée</li>
          </ul>
        </article>

        <article className="card" style={{ borderColor: "rgba(184, 115, 51, 0.45)" }}>
          <span className="badge">Pro</span>
          <h2 style={{ fontSize: "3rem", margin: "12px 0" }}>19 € <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/ mois</span></h2>
          <p className="subtitle">Pour publier régulièrement et industrialiser ton contenu.</p>
          <ul>
            <li>Quota Pro généreux</li>
            <li>Protection anti-spam incluse</li>
            <li>Toutes les plateformes + IA</li>
            <li>Historique + templates</li>
            <li>Support prioritaire</li>
          </ul>
          <PricingCheckoutButton />
          <p className="footer-note">Paiement sécurisé par Stripe • Annule à tout moment</p>
        </article>
      </section>
    </main>
  );
}
```

## `app/settings/actions.ts`

```ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function updateProfileSettings(formData: FormData) {
  const user = await requireUser();
  const fullName = String(formData.get("full_name") || "").trim().slice(0, 120);
  const avatarUrl = String(formData.get("avatar_url") || "").trim().slice(0, 500);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      avatar_url: avatarUrl || null
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/settings?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?message=saved");
}
```

## `app/settings/page.tsx`

```tsx
import { updateProfileSettings } from "@/app/settings/actions";
import { getProfile, requireUser } from "@/lib/auth";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const params = await searchParams;
  const message = params.message === "saved" ? "Réglages enregistrés." : params.message;

  return (
    <main className="page">
      <section className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
        <span className="badge">Settings</span>
        <h1 className="title" style={{ fontSize: "3.2rem" }}>Réglages</h1>
        <p className="subtitle">Ici on garde les champs sensibles verrouillés. Le plan, les crédits et le rôle sont gérés côté serveur.</p>

        <form action={updateProfileSettings}>
          <div className="field">
            <label className="label" htmlFor="full_name">Nom affiché</label>
            <input className="input" id="full_name" name="full_name" defaultValue={profile?.full_name || ""} />
          </div>
          <div className="field">
            <label className="label" htmlFor="avatar_url">Avatar URL</label>
            <input className="input" id="avatar_url" name="avatar_url" defaultValue={profile?.avatar_url || ""} />
          </div>
          <button className="btn" type="submit">Enregistrer</button>
        </form>

        {message ? <p className="notice success" style={{ marginTop: 16 }}>{decodeURIComponent(message)}</p> : null}
      </section>
    </main>
  );
}
```

## `app/success/page.tsx`

```tsx
import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="page">
      <section className="card" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <span className="badge">Paiement validé</span>
        <h1 className="title" style={{ fontSize: "3rem" }}>Abonnement activé</h1>
        <p className="subtitle">Stripe a validé le paiement. Le webhook synchronise ton plan côté Supabase.</p>
        <Link className="btn" href="/dashboard">Retour au dashboard</Link>
      </section>
    </main>
  );
}
```

## `components/Header.tsx`

```tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function Header() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <header className="header">
      <Link className="brand" href="/">MultiContenu AI</Link>
      <nav className="nav">
        <Link href="/pricing">Tarifs</Link>
        {user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/account">Compte</Link>
            <Link href="/settings">Settings</Link>
            <SignOutButton />
          </>
        ) : (
          <Link className="btn secondary" href="/login">Connexion</Link>
        )}
      </nav>
    </header>
  );
}
```

## `components/PricingCheckoutButton.tsx`

```tsx
"use client";

import { useState } from "react";

export default function PricingCheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const payload = await response.json();

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Impossible de créer la session Stripe.");
      }

      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn accent" onClick={handleCheckout} disabled={loading} type="button">
        {loading ? "Redirection..." : "S'abonner maintenant"}
      </button>
      {error ? <p className="notice error" style={{ marginTop: 12 }}>{error}</p> : null}
    </div>
  );
}
```

## `components/ProjectGenerator.tsx`

```tsx
"use client";

import { useMemo, useState } from "react";
import { PLATFORM_LABELS, PLATFORM_OPTIONS, type Platform } from "@/lib/plans";

type GenerationResult = {
  platform: Platform;
  content: string;
};

type QuotaResult = {
  remaining_today: number | null;
  daily_limit: number | null;
};

export default function ProjectGenerator() {
  const [title, setTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["linkedin", "twitter", "instagram"]);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [quota, setQuota] = useState<QuotaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && sourceContent.trim().length > 0 && platforms.length > 0 && !loading;
  }, [title, sourceContent, platforms, loading]);

  function togglePlatform(platform: Platform) {
    setPlatforms((current) => {
      if (current.includes(platform)) {
        return current.filter((item) => item !== platform);
      }
      return [...current, platform];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setQuota(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          source_content: sourceContent,
          platforms
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "La génération a échoué.");
      }

      setResults(payload.generations || []);
      setQuota(payload.quota || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid two">
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="title">Titre du projet</label>
          <input
            id="title"
            className="input"
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Exemple : lancement de mon offre IA"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="source_content">Contenu source</label>
          <textarea
            id="source_content"
            className="textarea"
            maxLength={20000}
            value={sourceContent}
            onChange={(event) => setSourceContent(event.target.value)}
            placeholder="Colle ici ton idée, ton article, ton script ou ton résumé..."
          />
        </div>

        <div className="field">
          <span className="label">Plateformes</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {PLATFORM_OPTIONS.map((platform) => (
              <label className="badge" key={platform} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={platforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                  style={{ marginRight: 8 }}
                />
                {PLATFORM_LABELS[platform]}
              </label>
            ))}
          </div>
        </div>

        <button className="btn" disabled={!canSubmit} type="submit">
          {loading ? "Génération..." : "Générer les contenus"}
        </button>

        {error ? <p className="notice error" style={{ marginTop: 16 }}>{error}</p> : null}
        {quota ? (
          <p className="notice success" style={{ marginTop: 16 }}>
            Quota restant aujourd'hui : {quota.remaining_today ?? "?"} / {quota.daily_limit ?? "?"}
          </p>
        ) : null}
      </form>

      <section className="card">
        <h2>Résultat</h2>
        {!results.length && !loading ? (
          <p className="subtitle">Les contenus générés apparaîtront ici. Le chaudron éditorial est prêt.</p>
        ) : null}
        {loading ? <p className="notice">Génération en cours...</p> : null}
        <div style={{ display: "grid", gap: 14 }}>
          {results.map((item) => (
            <article key={item.platform}>
              <span className="badge">{PLATFORM_LABELS[item.platform]}</span>
              {item.content ? (
                <pre className="output">{item.content}</pre>
              ) : (
                <p className="notice error" style={{ marginTop: 10 }}>
                  Échec de la génération pour cette plateforme. Réessaie.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
```

## `components/SignOutButton.tsx`

```tsx
import { signOut } from "@/app/login/actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="btn secondary" type="submit">Déconnexion</button>
    </form>
  );
}
```

## `lib/anthropic.ts`

```ts
import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "@/lib/env";

export function getAnthropic() {
  return new Anthropic({
    apiKey: requireEnv("ANTHROPIC_API_KEY")
  });
}

export function getAnthropicModel() {
  return requireEnv("ANTHROPIC_MODEL");
}
```

## `lib/auth.ts`

```ts
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,credits_remaining,plan,role,created_at")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export function emailIsAdmin(email: string | null | undefined) {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) || [];
  return Boolean(email && adminEmails.includes(email.toLowerCase()));
}
```

## `lib/env.ts`

```ts
export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
```

## `lib/plans.ts`

```ts
export const PLATFORM_OPTIONS = ["linkedin", "twitter", "instagram", "tiktok", "newsletter"] as const;
export type Platform = (typeof PLATFORM_OPTIONS)[number];

export const PLAN_OPTIONS = ["free", "pro", "enterprise"] as const;
export type Plan = (typeof PLAN_OPTIONS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  instagram: "Instagram",
  tiktok: "TikTok",
  newsletter: "Newsletter"
};

export const MAX_PLATFORMS_PER_GENERATION = PLATFORM_OPTIONS.length;

export function isPlatform(value: string): value is Platform {
  return PLATFORM_OPTIONS.includes(value as Platform);
}

export function isPlan(value: string | null | undefined): value is Plan {
  return PLAN_OPTIONS.includes(value as Plan);
}

export function planAllowsUnlimited(plan: string | null | undefined) {
  return plan === "pro" || plan === "enterprise";
}
```

## `lib/rate-limit.ts`

```ts
import { createHash } from "crypto";
import { requireEnv } from "@/lib/env";
import type { Plan } from "@/lib/plans";

export type GenerationGuardDecision = {
  allowed: boolean;
  reason?: "cooldown" | "daily_limit" | "ip_hourly_limit" | "invalid_limit" | "unknown";
  retry_after_seconds?: number;
  remaining_today?: number;
  daily_limit?: number;
};

export type GenerationLimits = {
  dailyLimit: number;
  cooldownSeconds: number;
  ipHourlyLimit: number;
  maxSourceCharacters: number;
};

function getPositiveIntegerEnv(name: string, fallback: number, minimum: number, maximum: number) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, minimum), maximum);
}

export function getGenerationLimitsForPlan(plan: Plan): GenerationLimits {
  const cooldownSeconds = getPositiveIntegerEnv("GENERATION_COOLDOWN_SECONDS", 10, 1, 3600);
  const ipHourlyLimit = getPositiveIntegerEnv("IP_HOURLY_GENERATION_LIMIT", 60, 1, 10000);
  const maxSourceCharacters = getPositiveIntegerEnv("MAX_SOURCE_CHARACTERS", 20000, 500, 50000);

  if (plan === "enterprise") {
    return {
      dailyLimit: getPositiveIntegerEnv("ENTERPRISE_DAILY_GENERATION_LIMIT", 1000, 1, 100000),
      cooldownSeconds,
      ipHourlyLimit,
      maxSourceCharacters
    };
  }

  if (plan === "pro") {
    return {
      dailyLimit: getPositiveIntegerEnv("PRO_DAILY_GENERATION_LIMIT", 100, 1, 100000),
      cooldownSeconds,
      ipHourlyLimit,
      maxSourceCharacters
    };
  }

  return {
    dailyLimit: getPositiveIntegerEnv("FREE_DAILY_GENERATION_LIMIT", 10, 1, 1000),
    cooldownSeconds,
    ipHourlyLimit,
    maxSourceCharacters
  };
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || vercelForwardedFor || realIp || cloudflareIp || "unknown";
}

export function hashRateLimitIdentifier(value: string) {
  const salt = requireEnv("RATE_LIMIT_SALT");

  return createHash("sha256")
    .update(`${salt}:${value}`)
    .digest("hex");
}

export function buildRateLimitMessage(decision: GenerationGuardDecision) {
  if (decision.reason === "cooldown") {
    const seconds = Math.max(decision.retry_after_seconds || 10, 1);
    return `Limite temporaire atteinte. Réessaie dans ${seconds} seconde${seconds > 1 ? "s" : ""}.`;
  }

  if (decision.reason === "daily_limit") {
    return "Limite quotidienne atteinte. Réessaie demain ou contacte le support si tu penses qu'il s'agit d'une erreur.";
  }

  if (decision.reason === "ip_hourly_limit") {
    return "Trop de requêtes depuis cette connexion. Réessaie dans quelques minutes.";
  }

  return "Protection anti-spam activée. Réessaie dans quelques minutes.";
}
```

## `lib/stripe.ts`

```ts
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

// Version d'API épinglée pour éviter une dérive silencieuse du comportement Stripe.
// À mettre à jour volontairement après tests, jamais implicitement.
const STRIPE_API_VERSION = "2024-12-18.acacia" as const;

export function getStripe() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: STRIPE_API_VERSION
  });
}
```

## `lib/supabase/admin.ts`

```ts
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}
```

## `lib/supabase/client.ts`

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase browser environment variables.");
  }

  return createBrowserClient(url, anonKey);
}
```

## `lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignoré dans les Server Components où l'écriture de cookies n'est pas disponible.
          }
        }
      }
    }
  );
}
```

## `middleware.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/account", "/settings", "/admin"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { data } = await supabase.auth.getUser();
  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtected && !data.user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)"
  ]
};
```

## `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  eslint: {
    ignoreDuringBuilds: false
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;
```

## `package.json`

```json
{
  "name": "multicontenu-ai",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "stripe": "^17.4.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.16.0",
    "eslint-config-next": "^15.0.0",
    "typescript": "^5.7.0"
  }
}
```

## `public/.gitkeep`

```

```

## `supabase-schema.sql`

```sql
-- MultiContenu AI - Schéma final optimisé anti-spam
-- À exécuter dans Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tables principales
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  credits_remaining INTEGER NOT NULL DEFAULT 10 CHECK (credits_remaining >= 0),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  source_content TEXT NOT NULL CHECK (char_length(source_content) BETWEEN 1 AND 20000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'tiktok', 'newsletter')),
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  tokens_used INTEGER CHECK (tokens_used IS NULL OR tokens_used >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'trialing', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('generation', 'checkout_started', 'subscription_updated', 'subscription_deleted')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tables anti-spam / anti-coût IA
CREATE TABLE IF NOT EXISTS public.generation_daily_limits (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  generation_count INTEGER NOT NULL DEFAULT 0 CHECK (generation_count >= 0),
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  ip_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ip_hash, window_start)
);

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('generation_blocked', 'rate_limit_error')),
  reason TEXT NOT NULL,
  ip_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_project_id ON public.generations(project_id);
CREATE INDEX IF NOT EXISTS idx_generations_platform ON public.generations(platform);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON public.usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON public.usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_daily_limits_date ON public.generation_daily_limits(usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_window ON public.ip_rate_limits(window_start DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);

-- Fonctions utilitaires
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  INSERT INTO public.subscriptions (user_id, status, plan)
  VALUES (NEW.id, 'inactive', 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_credits INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT plan, credits_remaining
  INTO v_plan, v_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_plan IN ('pro', 'enterprise') THEN
    RETURN TRUE;
  END IF;

  IF v_credits <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - 1
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- Réservation atomique anti-spam.
-- À appeler uniquement depuis le serveur avec la service role Supabase.
CREATE OR REPLACE FUNCTION public.reserve_generation_guard(
  p_user_id UUID,
  p_plan TEXT,
  p_daily_limit INTEGER,
  p_cooldown_seconds INTEGER,
  p_ip_hash TEXT,
  p_ip_hourly_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_window_start TIMESTAMPTZ := DATE_TRUNC('hour', NOW());
  v_user_limit public.generation_daily_limits%ROWTYPE;
  v_ip_count INTEGER;
  v_new_count INTEGER;
  v_retry_after INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_daily_limit IS NULL OR p_daily_limit < 1 OR p_cooldown_seconds IS NULL OR p_cooldown_seconds < 1 OR p_ip_hourly_limit IS NULL OR p_ip_hourly_limit < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_limit', 'retry_after_seconds', 60);
  END IF;

  INSERT INTO public.ip_rate_limits (ip_hash, window_start, request_count, last_request_at)
  VALUES (COALESCE(p_ip_hash, 'unknown'), v_window_start, 1, v_now)
  ON CONFLICT (ip_hash, window_start)
  DO UPDATE SET
    request_count = public.ip_rate_limits.request_count + 1,
    last_request_at = EXCLUDED.last_request_at,
    updated_at = v_now
  RETURNING request_count INTO v_ip_count;

  IF v_ip_count > p_ip_hourly_limit THEN
    INSERT INTO public.security_events (user_id, event_type, reason, ip_hash, metadata)
    VALUES (
      p_user_id,
      'generation_blocked',
      'ip_hourly_limit',
      p_ip_hash,
      jsonb_build_object('plan', p_plan, 'ip_hourly_limit', p_ip_hourly_limit, 'ip_count', v_ip_count)
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ip_hourly_limit',
      'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 hour' - v_now))::INTEGER),
      'daily_limit', p_daily_limit
    );
  END IF;

  INSERT INTO public.generation_daily_limits (user_id, usage_date, generation_count, last_generated_at)
  VALUES (p_user_id, v_today, 0, NULL)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT * INTO v_user_limit
  FROM public.generation_daily_limits
  WHERE user_id = p_user_id AND usage_date = v_today
  FOR UPDATE;

  IF v_user_limit.last_generated_at IS NOT NULL AND v_now < v_user_limit.last_generated_at + MAKE_INTERVAL(secs => p_cooldown_seconds) THEN
    v_retry_after := GREATEST(
      1,
      EXTRACT(EPOCH FROM (v_user_limit.last_generated_at + MAKE_INTERVAL(secs => p_cooldown_seconds) - v_now))::INTEGER
    );

    INSERT INTO public.security_events (user_id, event_type, reason, ip_hash, metadata)
    VALUES (
      p_user_id,
      'generation_blocked',
      'cooldown',
      p_ip_hash,
      jsonb_build_object('plan', p_plan, 'cooldown_seconds', p_cooldown_seconds, 'retry_after_seconds', v_retry_after)
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'retry_after_seconds', v_retry_after,
      'remaining_today', GREATEST(p_daily_limit - v_user_limit.generation_count, 0),
      'daily_limit', p_daily_limit
    );
  END IF;

  IF v_user_limit.generation_count >= p_daily_limit THEN
    INSERT INTO public.security_events (user_id, event_type, reason, ip_hash, metadata)
    VALUES (
      p_user_id,
      'generation_blocked',
      'daily_limit',
      p_ip_hash,
      jsonb_build_object('plan', p_plan, 'daily_limit', p_daily_limit, 'generation_count', v_user_limit.generation_count)
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (((v_today + 1)::TIMESTAMPTZ) - v_now))::INTEGER),
      'remaining_today', 0,
      'daily_limit', p_daily_limit
    );
  END IF;

  UPDATE public.generation_daily_limits
  SET
    generation_count = generation_count + 1,
    last_generated_at = v_now,
    updated_at = v_now
  WHERE user_id = p_user_id AND usage_date = v_today
  RETURNING generation_count INTO v_new_count;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'remaining_today', GREATEST(p_daily_limit - v_new_count, 0),
    'daily_limit', p_daily_limit
  );
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS set_generation_daily_limits_updated_at ON public.generation_daily_limits;
DROP TRIGGER IF EXISTS set_ip_rate_limits_updated_at ON public.ip_rate_limits;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_generation_daily_limits_updated_at
BEFORE UPDATE ON public.generation_daily_limits
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_ip_rate_limits_updated_at
BEFORE UPDATE ON public.ip_rate_limits
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_public_fields" ON public.profiles;
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
DROP POLICY IF EXISTS "generations_select_own" ON public.generations;
DROP POLICY IF EXISTS "generations_insert_own" ON public.generations;
DROP POLICY IF EXISTS "generations_update_own" ON public.generations;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
DROP POLICY IF EXISTS "usage_events_select_own" ON public.usage_events;
DROP POLICY IF EXISTS "usage_events_insert_own" ON public.usage_events;
DROP POLICY IF EXISTS "generation_daily_limits_select_own" ON public.generation_daily_limits;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_update_own_public_fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "projects_select_own"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_own"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "generations_select_own"
ON public.generations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = generations.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "generations_insert_own"
ON public.generations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = generations.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "generations_update_own"
ON public.generations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = generations.project_id
    AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = generations.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "subscriptions_select_own"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "usage_events_select_own"
ON public.usage_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "usage_events_insert_own"
ON public.usage_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "generation_daily_limits_select_own"
ON public.generation_daily_limits FOR SELECT
USING (auth.uid() = user_id);

-- Droits fins côté client Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.projects FROM anon, authenticated;
REVOKE ALL ON public.generations FROM anon, authenticated;
REVOKE ALL ON public.subscriptions FROM anon, authenticated;
REVOKE ALL ON public.usage_events FROM anon, authenticated;
REVOKE ALL ON public.generation_daily_limits FROM anon, authenticated;
REVOKE ALL ON public.ip_rate_limits FROM anon, authenticated;
REVOKE ALL ON public.security_events FROM anon, authenticated;

GRANT SELECT ON public.profiles, public.projects, public.generations, public.usage_events TO authenticated;
GRANT SELECT (id, status, plan, current_period_end) ON public.subscriptions TO authenticated;
GRANT SELECT (user_id, usage_date, generation_count, last_generated_at) ON public.generation_daily_limits TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT INSERT, UPDATE ON public.generations TO authenticated;
GRANT INSERT ON public.usage_events TO authenticated;
GRANT UPDATE(full_name, avatar_url) ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit(UUID) TO authenticated;

-- La fonction anti-spam est réservée au serveur via service role.
REVOKE ALL ON FUNCTION public.reserve_generation_guard(UUID, TEXT, INTEGER, INTEGER, TEXT, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation_guard(UUID, TEXT, INTEGER, INTEGER, TEXT, INTEGER) TO service_role;
```

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

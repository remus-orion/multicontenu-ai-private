import { NextResponse } from "next/server";
import { getAppUrl, requireEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PLAN_CONFIG = {
  starter: { priceEnv: "STRIPE_PRICE_STARTER", credits: 20 },
  pro: { priceEnv: "STRIPE_PRICE_PRO", credits: 50 },
  business: { priceEnv: "STRIPE_PRICE_BUSINESS", credits: 100 },
};

export async function POST(request: Request) {
  try {
    const { plan } = await request.json();

    if (!plan || !PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult.user) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const stripe = getStripe();
    const supabaseAdmin = createSupabaseAdminClient();
    const config = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
    const priceId = requireEnv(config.priceEnv);
    const appUrl = getAppUrl();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email,full_name")
      .eq("id", userResult.user.id)
      .single();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: userResult.user.id,
      customer_email: profile?.email || userResult.user.email || undefined,
      metadata: {
        user_id: userResult.user.id,
        plan,
        credits: config.credits.toString()
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`
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
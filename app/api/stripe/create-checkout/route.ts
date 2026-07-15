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

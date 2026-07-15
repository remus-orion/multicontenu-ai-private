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

type StripeSubscriptionWithLegacyPeriod = Stripe.Subscription & {
  current_period_end?: number | null;
};

type StripeSubscriptionItemWithPeriod = Stripe.SubscriptionItem & {
  current_period_end?: number | null;
};

function extractCurrentPeriodEnd(
  subscription: Stripe.Subscription
): number | null {
  const firstItem = subscription.items?.data?.[0] as
    | StripeSubscriptionItemWithPeriod
    | undefined;

  if (typeof firstItem?.current_period_end === "number") {
    return firstItem.current_period_end;
  }

  const legacySubscription =
    subscription as StripeSubscriptionWithLegacyPeriod;

  if (typeof legacySubscription.current_period_end === "number") {
    return legacySubscription.current_period_end;
  }

  return null;
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

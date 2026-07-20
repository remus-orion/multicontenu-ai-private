import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PLAN_CREDITS: Record<string, number> = {
  starter: 20,
  pro: 50,
  business: 100,
};

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

        if (session.payment_status === "paid") {
          const userId = session.metadata?.user_id;
          const pack = session.metadata?.plan;
          const credits = parseInt(session.metadata?.credits || "0");

          if (!userId) break;

          const creditsToAdd = credits || PLAN_CREDITS[pack || ""] || 0;

          const supabaseAdmin = createSupabaseAdminClient();

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("credits_remaining")
            .eq("id", userId)
            .single();

          const currentCredits = profile?.credits_remaining || 0;
          const newCredits = currentCredits + creditsToAdd;

          await supabaseAdmin
            .from("profiles")
            .update({ credits_remaining: newCredits })
            .eq("id", userId);
        }

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
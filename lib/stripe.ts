import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

// Version d'API épinglée pour éviter une dérive silencieuse du comportement Stripe.
// À mettre à jour volontairement après tests, jamais implicitement.
const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

export function getStripe() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: STRIPE_API_VERSION
  });
}

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
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, minimum), maximum);
}

export function getGenerationLimitsForPlan(plan: Plan): GenerationLimits {
  const cooldownSeconds = getPositiveIntegerEnv("GENERATION_COOLDOWN_SECONDS", 10, 1, 3600);
  const ipHourlyLimit = getPositiveIntegerEnv("IP_HOURLY_GENERATION_LIMIT", 60, 1, 10000);
  const maxSourceCharacters = getPositiveIntegerEnv("MAX_SOURCE_CHARACTERS", 20000, 500, 50000);

  if (plan === "enterprise" || plan === "vip") {
    return {
      dailyLimit: getPositiveIntegerEnv("ENTERPRISE_DAILY_GENERATION_LIMIT", 1000, 1, 100000),
      cooldownSeconds,
      ipHourlyLimit,
      maxSourceCharacters
    };
  }

  if (plan === "pro" || plan === "business" || plan === "starter") {
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
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function buildRateLimitMessage(decision: GenerationGuardDecision) {
  if (decision.reason === "cooldown") {
    const seconds = Math.max(decision.retry_after_seconds || 10, 1);
    return `Limite temporaire atteinte. Réessaie dans ${seconds} seconde${seconds > 1 ? "s" : ""}.`;
  }
  if (decision.reason === "daily_limit") {
    return "Limite quotidienne atteinte. Réessaie demain ou achète un pack de jetons.";
  }
  if (decision.reason === "ip_hourly_limit") {
    return "Trop de requêtes depuis cette connexion. Réessaie dans quelques minutes.";
  }
  return "Protection anti-spam activée. Réessaie dans quelques minutes.";
}
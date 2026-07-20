export const PLATFORM_OPTIONS = ["linkedin", "twitter", "instagram", "tiktok", "newsletter"] as const;
export type Platform = (typeof PLATFORM_OPTIONS)[number];

export const PLAN_OPTIONS = ["free", "pro", "enterprise", "vip", "starter", "business"] as const;
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
  return plan === "pro" || plan === "enterprise" || plan === "vip" || plan === "starter" || plan === "business";
}
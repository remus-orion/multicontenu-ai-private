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

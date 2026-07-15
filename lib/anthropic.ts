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

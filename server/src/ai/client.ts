import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

// A single retry lets the SDK's built-in backoff absorb one-off transient
// errors. We deliberately don't retry harder than this: on a rate-limited
// plan a burst of parallel calls (e.g. the 5 finance-insight calls fired
// together) can't be retried into success within a reasonable response time
// anyway — the try/catch fallback to the deterministic stub below is the
// real resilience mechanism for that case.
const anthropic = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey, maxRetries: 1 }) : null;

export interface JsonSchemaToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Calls Claude with a single forced tool-use so the response is guaranteed
 * valid JSON matching `tool.inputSchema`, instead of parsing free-form text.
 * Falls back to `stubResponse` when no ANTHROPIC_API_KEY is configured, so
 * the rest of the app is runnable/demoable without a live key.
 */
export async function askForJson<T>(params: {
  system: string;
  prompt: string;
  tool: JsonSchemaToolDef;
  stubResponse: T;
  maxTokens?: number;
}): Promise<T> {
  if (!anthropic) {
    return params.stubResponse;
  }

  // Anthropic calls can fail for reasons entirely outside our control (rate
  // limits, transient 5xx, network blips) — since every caller already has a
  // reasonable deterministic stub, an AI hiccup should degrade gracefully to
  // that instead of taking the whole request down with an unhandled 500.
  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: env.anthropicModel,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
      tools: [
        {
          name: params.tool.name,
          description: params.tool.description,
          input_schema: params.tool.inputSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: params.tool.name },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ai] Anthropic request failed, falling back to stub:", err instanceof Error ? err.message : err);
    return params.stubResponse;
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    // eslint-disable-next-line no-console
    console.error("[ai] Expected tool_use block, got:", JSON.stringify(response.content));
    return params.stubResponse;
  }

  return toolUse.input as T;
}

export const isAiConfigured = Boolean(anthropic);

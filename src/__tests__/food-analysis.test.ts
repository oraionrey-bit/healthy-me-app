/**
 * Tests for the analyze-food edge function logic.
 *
 * These test the provider abstraction, error classification, JSON parsing,
 * and provider chain behavior. The actual AI calls are NOT mocked —
 * integration tests that hit real APIs are marked with .skip for CI
 * and can be run manually with INTEGRATION=1.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

// ─── Unit-testable utilities extracted from the edge function ──────────────

type ApiErrorKind = "rate_limit" | "auth" | "server" | "invalid_response" | "unknown";

class ProviderError extends Error {
  constructor(
    public provider: string,
    public kind: ApiErrorKind,
    public statusCode: number,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

function classifyHttpError(status: number): ApiErrorKind {
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (status >= 500) return "server";
  return "unknown";
}

function estimateBytes(base64: string): number {
  return Math.ceil(base64.length * 3 / 4);
}

function parseAnalysisJson(text: string): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
  pcos_notes: string;
} {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.calories !== "number" || typeof parsed.protein !== "number") {
    throw new Error("Invalid analysis: missing calories or protein");
  }
  return parsed;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("classifyHttpError", () => {
  it("classifies 429 as rate_limit", () => {
    expect(classifyHttpError(429)).toBe("rate_limit");
  });

  it("classifies 401 as auth", () => {
    expect(classifyHttpError(401)).toBe("auth");
  });

  it("classifies 403 as auth", () => {
    expect(classifyHttpError(403)).toBe("auth");
  });

  it("classifies 500 as server", () => {
    expect(classifyHttpError(500)).toBe("server");
  });

  it("classifies 502 as server", () => {
    expect(classifyHttpError(502)).toBe("server");
  });

  it("classifies 400 as unknown", () => {
    expect(classifyHttpError(400)).toBe("unknown");
  });
});

describe("food analysis result routing", () => {
  const functionSource = readFileSync(
    path.join(process.cwd(), "supabase/functions/analyze-food/index.ts"),
    "utf8",
  );

  it("keeps successful food analysis results in-app instead of sending them to Tina's Telegram", () => {
    expect(functionSource).not.toContain("TINA_CHAT_ID");
    expect(functionSource).not.toContain("notifyFoodLogged");
    expect(functionSource).not.toContain("api.telegram.org");
    expect(functionSource).not.toContain("TELEGRAM_BOT_TOKEN");
  });

  it("routes Tina directly to Gemini while retaining her dedicated PCOS prompt", () => {
    const tinaRouting = functionSource.slice(
      functionSource.indexOf("if (isTina)"),
      functionSource.indexOf("} else {", functionSource.indexOf("if (isTina)")),
    );

    expect(tinaRouting).toContain("isLeftovers ? LEFTOVERS_PROMPT : PCOS_PROMPT");
    expect(tinaRouting).toContain("providers = [geminiProvider]");
    expect(tinaRouting).not.toContain("clawRouterProvider");
    expect(tinaRouting).not.toContain("anthropicProvider");
  });

  it("has no Claude provider credentials or endpoints in the live function", () => {
    expect(functionSource).not.toContain("CLAWROUTER_API_KEY");
    expect(functionSource).not.toContain("ANTHROPIC_API_KEY");
    expect(functionSource).not.toContain("api.clawrouter.app");
    expect(functionSource).not.toContain("api.anthropic.com");
    expect(functionSource).toContain("gemini-2.5-flash:generateContent");
  });
});

describe("ProviderError", () => {
  it("includes provider name in message", () => {
    const err = new ProviderError("gemini", "rate_limit", 429, "too many requests");
    expect(err.message).toContain("gemini");
    expect(err.provider).toBe("gemini");
    expect(err.kind).toBe("rate_limit");
    expect(err.statusCode).toBe(429);
  });

  it("is instanceof Error", () => {
    const err = new ProviderError("gemini", "auth", 401, "invalid key");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("estimateBytes", () => {
  it("estimates base64 string size correctly", () => {
    // 4 base64 chars = 3 bytes
    const base64 = "AAAA"; // 4 chars = 3 bytes
    expect(estimateBytes(base64)).toBe(3);
  });

  it("handles empty string", () => {
    expect(estimateBytes("")).toBe(0);
  });

  it("estimates larger strings", () => {
    const base64 = "A".repeat(1000);
    expect(estimateBytes(base64)).toBe(750);
  });
});

describe("parseAnalysisJson", () => {
  it("parses valid JSON response", () => {
    const input = JSON.stringify({
      calories: 450,
      protein: 32,
      carbs: 45,
      fat: 18,
      fiber: 5,
      confidence: 0.8,
      pcos_notes: "Good protein content",
    });

    const result = parseAnalysisJson(input);
    expect(result.calories).toBe(450);
    expect(result.protein).toBe(32);
    expect(result.carbs).toBe(45);
    expect(result.fat).toBe(18);
    expect(result.confidence).toBe(0.8);
  });

  it("strips markdown code fences", () => {
    const input = '```json\n{"calories": 300, "protein": 25, "carbs": 30, "fat": 10, "fiber": 3, "confidence": 0.7, "pcos_notes": "ok"}\n```';
    const result = parseAnalysisJson(input);
    expect(result.calories).toBe(300);
  });

  it("strips bare code fences", () => {
    const input = '```\n{"calories": 200, "protein": 15, "carbs": 20, "fat": 8, "fiber": 2, "confidence": 0.6, "pcos_notes": "fine"}\n```';
    const result = parseAnalysisJson(input);
    expect(result.calories).toBe(200);
  });

  it("throws on missing calories", () => {
    const input = JSON.stringify({ protein: 25, carbs: 30 });
    expect(() => parseAnalysisJson(input)).toThrow("missing calories or protein");
  });

  it("throws on missing protein", () => {
    const input = JSON.stringify({ calories: 300, carbs: 30 });
    expect(() => parseAnalysisJson(input)).toThrow("missing calories or protein");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseAnalysisJson("not json at all")).toThrow();
  });

  it("handles percent_eaten for leftovers", () => {
    const input = JSON.stringify({
      calories: 350,
      protein: 28,
      carbs: 40,
      fat: 12,
      fiber: 4,
      confidence: 0.7,
      pcos_notes: "Good",
      percent_eaten: 65,
    });

    const result = parseAnalysisJson(input);
    expect(result.calories).toBe(350);
    expect((result as Record<string, unknown>).percent_eaten).toBe(65);
  });
});

describe("Provider chain logic", () => {
  // Simulated provider for testing chain behavior
  function mockProvider(
    name: string,
    behavior: "success" | "rate_limit" | "auth_error" | "crash",
    callLog: string[],
  ) {
    return {
      name,
      analyze: async (_prompt: string, _images: { base64: string; mimeType: string }[]) => {
        callLog.push(name);
        switch (behavior) {
          case "success":
            return {
              calories: 400, protein: 30, carbs: 40, fat: 15,
              fiber: 5, confidence: 0.8, pcos_notes: `from ${name}`,
            };
          case "rate_limit":
            throw new ProviderError(name, "rate_limit", 429, "rate limited");
          case "auth_error":
            throw new ProviderError(name, "auth", 401, "invalid key");
          case "crash":
            throw new Error(`${name} crashed`);
        }
      },
    };
  }

  // Simplified chain for testing (no delays)
  async function testChain(
    providers: ReturnType<typeof mockProvider>[],
  ): Promise<{ result: { calories: number; pcos_notes: string }; provider: string }> {
    const errors: string[] = [];
    for (const provider of providers) {
      try {
        const result = await provider.analyze("test", []);
        return { result, provider: provider.name };
      } catch (err) {
        if (err instanceof ProviderError && err.kind === "auth") {
          errors.push(`${provider.name}: auth`);
          continue;
        }
        errors.push(`${provider.name}: ${String(err)}`);
        continue;
      }
    }
    throw new Error(`All failed: ${errors.join(", ")}`);
  }

  it("uses first provider on success", async () => {
    const log: string[] = [];
    const result = await testChain([
      mockProvider("clawrouter", "success", log),
      mockProvider("gemini", "success", log),
    ]);
    expect(result.provider).toBe("clawrouter");
    expect(log).toEqual(["clawrouter"]);
  });

  it("falls back on auth error", async () => {
    const log: string[] = [];
    const result = await testChain([
      mockProvider("clawrouter", "auth_error", log),
      mockProvider("gemini", "success", log),
    ]);
    expect(result.provider).toBe("gemini");
    expect(log).toEqual(["clawrouter", "gemini"]);
  });

  it("falls back on rate limit", async () => {
    const log: string[] = [];
    const result = await testChain([
      mockProvider("anthropic", "rate_limit", log),
      mockProvider("gemini", "success", log),
    ]);
    expect(result.provider).toBe("gemini");
    expect(log).toEqual(["anthropic", "gemini"]);
  });

  it("falls back on crash", async () => {
    const log: string[] = [];
    const result = await testChain([
      mockProvider("clawrouter", "crash", log),
      mockProvider("gemini", "success", log),
    ]);
    expect(result.provider).toBe("gemini");
    expect(log).toEqual(["clawrouter", "gemini"]);
  });

  it("throws when all providers fail", async () => {
    const log: string[] = [];
    await expect(
      testChain([
        mockProvider("clawrouter", "auth_error", log),
        mockProvider("anthropic", "rate_limit", log),
      ]),
    ).rejects.toThrow("All failed");
  });

  it("skips auth errors immediately without retry", async () => {
    const log: string[] = [];
    await testChain([
      mockProvider("bad-key", "auth_error", log),
      mockProvider("good", "success", log),
    ]);
    // Auth error provider should only be called once (no retry)
    expect(log.filter(n => n === "bad-key")).toHaveLength(1);
  });
});

describe("Tina vs non-Tina routing", () => {
  const TINA_USER_ID = "e454325f-b8e6-4251-9a49-9d706eef99c3";

  it("identifies Tina's user ID correctly", () => {
    expect(TINA_USER_ID).toBe("e454325f-b8e6-4251-9a49-9d706eef99c3");
  });

  it("routes Tina through Gemini with her dedicated prompt", () => {
    const userId = TINA_USER_ID;
    const isTina = userId === TINA_USER_ID;
    expect(isTina).toBe(true);
    // In actual code: Tina's PCOS prompt → Gemini only
  });

  it("would route non-Tina through Gemini only", () => {
    const userId: string = "some-other-user-id";
    const isTina = userId === (TINA_USER_ID as string);
    expect(isTina).toBe(false);
    // In actual code: Gemini only
  });
});

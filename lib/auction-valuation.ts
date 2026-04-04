import "server-only";

import { createHash } from "crypto";
import {
  GoogleGenerativeAI,
  type ResponseSchema,
  SchemaType,
} from "@google/generative-ai";
import { z } from "zod";

const geminiValuationSchema = z.object({
  estimatedMarketValue: z.number().positive(),
  suggestedStartPrice: z.number().positive(),
  suggestedBidIncrement: z.number().positive(),
  confidence: z.enum(["low", "medium", "high"]),
  confidenceScore: z.number().min(0).max(1),
  reasonCodes: z.array(z.string().min(3).max(80)).min(2).max(6),
});

const geminiResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    estimatedMarketValue: {
      type: SchemaType.NUMBER,
    },
    suggestedStartPrice: {
      type: SchemaType.NUMBER,
    },
    suggestedBidIncrement: {
      type: SchemaType.NUMBER,
    },
    confidence: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["low", "medium", "high"],
    },
    confidenceScore: {
      type: SchemaType.NUMBER,
    },
    reasonCodes: {
      type: SchemaType.ARRAY,
      minItems: 2,
      maxItems: 6,
      items: {
        type: SchemaType.STRING,
      },
    },
  },
  required: [
    "estimatedMarketValue",
    "suggestedStartPrice",
    "suggestedBidIncrement",
    "confidence",
    "confidenceScore",
    "reasonCodes",
  ],
};

export type AuctionValuationInput = {
  title: string;
  description: string;
  category: string;
  condition: "new" | "like_new" | "excellent" | "good" | "fair" | "poor";
  conditionAgeDays?: number | null;
  startPrice: number;
  bidIncrement: number;
  durationHours: number;
};

export type AuctionValuationResult = {
  estimatedMarketValue: number;
  suggestedStartPrice: number;
  suggestedBidIncrement: number;
  confidence: "low" | "medium" | "high";
  confidenceScore: number;
  reasonCodes: string[];
  deterministicFingerprint: string;
  usesAiExtraction: boolean;
  valuationSource: "gemini";
  valuationDebug: string;
  generatedAt: string;
};

function normalizeCategory(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, "_");
}

function roundToNearest(value: number, nearest: number) {
  return Math.max(nearest, Math.round(value / nearest) * nearest);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableFingerprint(input: AuctionValuationInput) {
  const normalized = JSON.stringify({
    title: input.title.trim().toLowerCase(),
    description: input.description.trim().toLowerCase(),
    category: normalizeCategory(input.category),
    condition: input.condition,
    conditionAgeDays: input.conditionAgeDays ?? null,
    startPrice: input.startPrice,
    bidIncrement: input.bidIncrement,
    durationHours: input.durationHours,
  });

  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const fullFenceMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\s*([\s\S]*?)\s*```$/);
  if (fullFenceMatch?.[1]) {
    return fullFenceMatch[1].trim();
  }

  const firstFence = trimmed.indexOf("```");
  if (firstFence >= 0) {
    const withoutOpeningFence = trimmed
      .slice(firstFence + 3)
      .replace(/^[a-zA-Z0-9_-]+\s*/, "");
    const closingFence = withoutOpeningFence.indexOf("```");
    const unfenced =
      closingFence >= 0
        ? withoutOpeningFence.slice(0, closingFence)
        : withoutOpeningFence;
    const candidate = unfenced.trim();
    if (candidate.startsWith("{") || candidate.startsWith("[")) {
      return candidate;
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function findBalancedJson(text: string) {
  const startIndexes = ["{", "["]
    .map((char) => text.indexOf(char))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  for (const start of startIndexes) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{" || char === "[") {
        depth += 1;
      } else if (char === "}" || char === "]") {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }
  }

  return null;
}

function parseGeminiJson<T>(text: string) {
  const candidate = extractJsonObject(text).replace(/^\uFEFF/, "").trim();
  const attempts = [
    candidate,
    candidate.replace(/^Here is the JSON requested:\s*/i, "").trim(),
    candidate.replace(/^```json\s*/i, "").replace(/```$/i, "").trim(),
    findBalancedJson(candidate),
    findBalancedJson(text),
  ].filter((value): value is string => Boolean(value && value.trim()));

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as T;
    } catch {
      continue;
    }
  }

  const preview = candidate.slice(0, 300).replace(/\s+/g, " ");
  throw new Error(`Gemini returned invalid JSON. Response: ${preview}`);
}

function sanitizeValuationResult(
  input: AuctionValuationInput,
  parsed: z.infer<typeof geminiValuationSchema>
): AuctionValuationResult {
  const maxMarketValue = Math.max(input.startPrice * 10, 5000000);
  const estimatedMarketValue = roundToNearest(
    clamp(parsed.estimatedMarketValue, 100, maxMarketValue),
    100
  );
  const suggestedStartPrice = roundToNearest(
    clamp(parsed.suggestedStartPrice, 100, estimatedMarketValue),
    100
  );
  const suggestedBidIncrement = roundToNearest(
    clamp(parsed.suggestedBidIncrement, 50, estimatedMarketValue * 0.2),
    50
  );

  return {
    estimatedMarketValue,
    suggestedStartPrice,
    suggestedBidIncrement,
    confidence: parsed.confidence,
    confidenceScore: Number(clamp(parsed.confidenceScore, 0, 1).toFixed(2)),
    reasonCodes: parsed.reasonCodes.slice(0, 6),
    deterministicFingerprint: stableFingerprint(input),
    usesAiExtraction: true,
    valuationSource: "gemini",
    valuationDebug: "Gemini generated the valuation from the listing details.",
    generatedAt: new Date().toISOString(),
  };
}

async function requestGeminiValuation(
  prompt: string,
  geminiModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>
) {
  const response = await geminiModel.generateContent({
    generationConfig: {
      temperature: 0,
      topK: 1,
      maxOutputTokens: 768,
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const text = response.response.text().trim();
  if (!text) {
    throw new Error("Gemini returned an empty valuation response.");
  }

  return text;
}

export async function generateAuctionValuation(
  input: AuctionValuationInput
): Promise<AuctionValuationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });
  const listing = {
    ...input,
    category: normalizeCategory(input.category),
  };

  const prompt = [
    "Estimate the current second-hand online auction market value in Nepalese rupees (NPR).",
    "You are pricing a user-created auction listing for Bid Bazar.",
    "Return one JSON object that matches the provided response schema.",
    'confidence must be "low", "medium", or "high".',
    "confidenceScore must be a number between 0 and 1.",
    "reasonCodes must contain 2 to 6 short seller-facing reasons.",
    "estimatedMarketValue should be the likely market value, not MSRP.",
    "suggestedStartPrice should usually be below estimatedMarketValue to encourage bidding.",
    "suggestedBidIncrement should be practical for the price band.",
    "Do not include markdown, commentary, or code fences.",
    JSON.stringify({
      currency: "NPR",
      listing,
    }),
  ].join("\n");
  const retryPrompt = [
    "Return only one valid JSON object for this auction valuation.",
    "No explanation. No markdown.",
    JSON.stringify({
      currency: "NPR",
      listing,
    }),
  ].join("\n");

  let text: string;
  try {
    text = await requestGeminiValuation(prompt, geminiModel);
  } catch (error) {
    console.warn("[auction-valuation] Retrying Gemini valuation", {
      model,
      reason: error instanceof Error ? error.message : "Unknown Gemini error",
    });
    text = await requestGeminiValuation(retryPrompt, geminiModel);
  }

  const geminiJson = parseGeminiJson<z.infer<typeof geminiValuationSchema>>(text);
  const parsed = geminiValuationSchema.parse(geminiJson);

  return sanitizeValuationResult(input, parsed);
}

import "server-only";

import { createHash } from "crypto";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const CATEGORY_BASELINE: Record<string, number> = {
  smartphones: 45000,
  laptops: 70000,
  tablets: 30000,
  cameras: 55000,
  audio: 18000,
  gaming: 35000,
  home_appliances: 28000,
  fashion: 12000,
  collectibles: 22000,
  other: 15000,
};

const CONDITION_MULTIPLIER = {
  new: 1.18,
  like_new: 1.04,
  excellent: 0.94,
  good: 0.82,
  fair: 0.66,
  poor: 0.48,
} as const;

const AGE_MONTHLY_DECAY: Record<string, number> = {
  smartphones: 0.022,
  laptops: 0.018,
  tablets: 0.018,
  cameras: 0.012,
  audio: 0.015,
  gaming: 0.013,
  home_appliances: 0.01,
  fashion: 0.02,
  collectibles: 0.002,
  other: 0.015,
};

const KEYWORD_ADJUSTMENTS: Array<{
  pattern: RegExp;
  amount: number;
  reason: string;
}> = [
  {
    pattern:
      /\biphone 1[45]\b|\biphone\b.*\bpro\b|\bgalaxy s2[34]\b|\bpixel [89]\b/i,
    amount: 40000,
    reason: "premium flagship model",
  },
  {
    pattern: /\bmacbook pro\b|\bthinkpad x1\b|\bdell xps\b|\brog zephyrus\b/i,
    amount: 50000,
    reason: "premium laptop series",
  },
  {
    pattern:
      /\bps5\b|\bplaystation 5\b|\bxbox series x\b|\bnintendo switch oled\b/i,
    amount: 18000,
    reason: "high-demand gaming hardware",
  },
  {
    pattern: /\bsony a7\b|\bcanon eos r\b|\bfujifilm x-t[45]\b/i,
    amount: 45000,
    reason: "prosumer camera body",
  },
  {
    pattern: /\bairpods\b|\bsony wh-1000xm[45]\b|\bbose qc\b/i,
    amount: 12000,
    reason: "premium audio product",
  },
  {
    pattern: /\b128gb\b/i,
    amount: 2500,
    reason: "higher storage configuration",
  },
  {
    pattern: /\b256gb\b/i,
    amount: 5000,
    reason: "higher storage configuration",
  },
  {
    pattern: /\b512gb\b|\b1tb\b/i,
    amount: 9000,
    reason: "top storage configuration",
  },
  {
    pattern: /\b16gb ram\b|\b32gb ram\b/i,
    amount: 7000,
    reason: "higher memory configuration",
  },
  {
    pattern: /\bi3\b|\bryzen 3\b/i,
    amount: -6000,
    reason: "entry-level processor tier",
  },
  {
    pattern: /\bi5\b|\bryzen 5\b/i,
    amount: 2000,
    reason: "mid-range processor tier",
  },
  {
    pattern: /\bi7\b|\bi9\b|\bryzen 7\b|\bryzen 9\b/i,
    amount: 10000,
    reason: "higher-end processor tier",
  },
];

const PERCENT_ADJUSTMENTS: Array<{
  pattern: RegExp;
  factor: number;
  reason: string;
}> = [
  {
    pattern: /\bsealed\b|\bunopened\b|\bbrand new\b/i,
    factor: 1.08,
    reason: "sealed condition",
  },
  {
    pattern: /\bbox\b|\bcharger\b|\boriginal accessories\b|\bwith receipt\b/i,
    factor: 1.04,
    reason: "complete package",
  },
  {
    pattern: /\bwarranty\b/i,
    factor: 1.03,
    reason: "warranty coverage",
  },
  {
    pattern: /\bminor scratch\b|\bsmall dent\b|\bused\b/i,
    factor: 0.96,
    reason: "light cosmetic wear",
  },
  {
    pattern: /\bcrack(ed)?\b|\bbroken\b|\bdead pixel\b|\brepair\b|\bfault(y)?\b/i,
    factor: 0.78,
    reason: "noted defect",
  },
  {
    pattern: /\bno issue\b|\bfully working\b|\bexcellent battery\b/i,
    factor: 1.03,
    reason: "good functional condition",
  },
];

const openAiValuationSchema = z.object({
  estimatedMarketValue: z.number().positive(),
  suggestedStartPrice: z.number().positive(),
  suggestedBidIncrement: z.number().positive(),
  confidence: z.enum(["low", "medium", "high"]),
  confidenceScore: z.number().min(0).max(1),
  reasonCodes: z.array(z.string().min(3).max(80)).min(2).max(6),
});

let openaiClient: OpenAI | null = null;

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
  valuationSource: "openai" | "fallback_no_api_key" | "fallback_openai_error";
  valuationDebug: string;
  generatedAt: string;
};

function normalizeCategory(category: string) {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "_");
  return normalized in CATEGORY_BASELINE ? normalized : "other";
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

function buildDeterministicBaseline(input: AuctionValuationInput) {
  const category = normalizeCategory(input.category);
  const text = `${input.title} ${input.description}`.trim();
  const reasons = new Set<string>();

  let estimated = CATEGORY_BASELINE[category];
  reasons.add(`category baseline: ${category.replaceAll("_", " ")}`);

  for (const rule of KEYWORD_ADJUSTMENTS) {
    if (!rule.pattern.test(text)) continue;
    estimated += rule.amount;
    reasons.add(rule.reason);
  }

  estimated *= CONDITION_MULTIPLIER[input.condition];
  reasons.add(`condition adjustment: ${input.condition.replaceAll("_", " ")}`);

  const ageDays = Math.max(0, input.conditionAgeDays ?? 0);
  const ageMonths = ageDays / 30;
  const ageDecay = AGE_MONTHLY_DECAY[category] ?? AGE_MONTHLY_DECAY.other;
  const ageFactor = clamp(1 - ageMonths * ageDecay, 0.45, 1.05);
  estimated *= ageFactor;
  if (ageDays > 0) reasons.add("usage age adjustment");

  for (const rule of PERCENT_ADJUSTMENTS) {
    if (!rule.pattern.test(text)) continue;
    estimated *= rule.factor;
    reasons.add(rule.reason);
  }

  const descriptionLength = input.description.trim().length;
  const informationBonus = clamp(descriptionLength / 900, 0, 0.05);
  estimated *= 1 + informationBonus;
  if (informationBonus > 0.02) reasons.add("detailed product description");

  const estimatedMarketValue = roundToNearest(estimated, 500);
  const durationFactor =
    input.durationHours <= 6
      ? 0.9
      : input.durationHours <= 24
        ? 0.84
        : input.durationHours <= 72
          ? 0.8
          : 0.76;

  const suggestedStartPrice = roundToNearest(
    estimatedMarketValue * durationFactor,
    100
  );
  const suggestedBidIncrement = roundToNearest(
    clamp(estimatedMarketValue * 0.025, 100, 5000),
    50
  );

  let confidenceScore = 0.48;
  if (input.title.trim().length >= 8) confidenceScore += 0.12;
  if (descriptionLength >= 40) confidenceScore += 0.1;
  if (descriptionLength >= 120) confidenceScore += 0.08;
  if (category !== "other") confidenceScore += 0.08;
  if (
    ageDays > 0 ||
    input.condition === "new" ||
    input.condition === "like_new"
  ) {
    confidenceScore += 0.06;
  }

  return {
    estimatedMarketValue,
    suggestedStartPrice,
    suggestedBidIncrement,
    confidence:
      confidenceScore >= 0.78
        ? "high"
        : confidenceScore >= 0.62
          ? "medium"
          : "low",
    confidenceScore: Number(clamp(confidenceScore, 0, 0.99).toFixed(2)),
    reasonCodes: [...reasons].slice(0, 6),
  };
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function sanitizeValuationResult(
  input: AuctionValuationInput,
  parsed: z.infer<typeof openAiValuationSchema>,
  usesAiExtraction: boolean
): AuctionValuationResult {
  const fingerprint = stableFingerprint(input);
  const maxMarketValue = Math.max(input.startPrice * 5, 5000000);
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
    deterministicFingerprint: fingerprint,
    usesAiExtraction,
    valuationSource: usesAiExtraction ? "openai" : "fallback_openai_error",
    valuationDebug: usesAiExtraction
      ? "OpenAI Responses API produced the valuation."
      : "OpenAI result was unavailable, so deterministic fallback was used.",
    generatedAt: new Date().toISOString(),
  };
}

export function calculateAuctionValuation(
  input: AuctionValuationInput
): AuctionValuationResult {
  const baseline = buildDeterministicBaseline(input);
  return {
    ...baseline,
    deterministicFingerprint: stableFingerprint(input),
    usesAiExtraction: false,
    valuationSource: "fallback_no_api_key",
    valuationDebug:
      "OPENAI_API_KEY is missing, so deterministic fallback was used.",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateAuctionValuation(
  input: AuctionValuationInput
): Promise<AuctionValuationResult> {
  const fallback = calculateAuctionValuation(input);
  const client = getOpenAIClient();

  if (!client) {
    return fallback;
  }

  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_AUCTION_VALUATION_MODEL ?? "gpt-4o",
      input: [
        {
          role: "system",
          content:
            "You estimate second-hand and auction market value in Nepalese rupees (NPR). Return practical auction pricing only. Consider category, condition, usage age, market demand, completeness of accessories, and expected buyer interest. Keep the output realistic for an online auction listing.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Estimate auction market value for a user-created listing.",
            currency: "NPR",
            listing: input,
            deterministic_reference: buildDeterministicBaseline(input),
            rules: [
              "estimatedMarketValue should represent likely market value, not MSRP.",
              "suggestedStartPrice should usually be below estimatedMarketValue to encourage bidding.",
              "suggestedBidIncrement should be practical for the price band.",
              "confidenceScore must be between 0 and 1.",
              "reasonCodes must be short seller-facing reasons.",
            ],
          }),
        },
      ],
      text: {
        format: zodTextFormat(openAiValuationSchema, "auction_valuation"),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new Error("OpenAI returned an unparseable valuation response.");
    }

    return sanitizeValuationResult(input, parsed, true);
  } catch (error) {
    return {
      ...fallback,
      valuationSource: "fallback_openai_error",
      valuationDebug:
        error instanceof Error
          ? `OpenAI request failed: ${error.message}`
          : "OpenAI request failed, so deterministic fallback was used.",
    };
  }
}

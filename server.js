import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(text) {
  return (text || "").toLowerCase().trim();
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function scoreTone(review) {
  let score = 0;

  if (includesAny(review, ["crap", "trash", "awful", "terrible", "horrible", "garbage"])) score += 4;
  if (includesAny(review, ["don't waste your money", "do not buy", "avoid", "worst"])) score += 3;
  if (review.includes("!") || review.includes("??")) score += 1;
  if (includesAny(review, ["disappointed", "upset", "frustrated"])) score += 2;
  if (includesAny(review, ["sorry", "please", "thank you"])) score -= 1;

  return clamp(score, 0, 10);
}

function scoreSeverity(review) {
  let score = 0;

  if (includesAny(review, ["broke", "disintegrate", "ruined", "never arrived", "wrong item"])) score += 4;
  if (includesAny(review, ["extremely small", "not worth", "cheap", "poor quality"])) score += 3;
  if (includesAny(review, ["took over a month", "late", "shipping"])) score += 2;
  if (includesAny(review, ["a little disappointing", "okay, but", "not as good"])) score += 1;

  return clamp(score, 0, 10);
}

function scoreReasonableness(review) {
  let score = 0;

  if (includesAny(review, ["don't waste your money", "this is crap", "not worth $1"])) score += 4;
  if (includesAny(review, ["doesn't look as good as the photos", "smaller than expected"])) score += 2;
  if (includesAny(review, ["communication was good", "delivery was good"])) score -= 2;
  if (includesAny(review, ["please", "could", "would"])) score -= 1;

  return clamp(score, 0, 10);
}

function detectPattern(review) {
  if (includesAny(review, ["smaller than expected", "extremely small", "tiny"])) {
    return "Size / expectation mismatch";
  }
  if (includesAny(review, ["doesn't look as good as the photos", "not as pictured", "different than photos"])) {
    return "Photo / expectation mismatch";
  }
  if (includesAny(review, ["shipping", "took over a month", "late", "delivery"])) {
    return "Shipping frustration";
  }
  if (includesAny(review, ["poor quality", "cheap", "not worth", "crap", "trash"])) {
    return "Quality / value complaint";
  }
  return "General dissatisfaction";
}

function classifySituation(review, toneScore, severityScore, reasonablenessScore) {
  if (toneScore >= 8 && reasonablenessScore >= 7) {
    return "High-emotion / blowback review";
  }
  if (includesAny(review, ["smaller than expected", "extremely small", "tiny"])) {
    return "Expectation mismatch";
  }
  if (includesAny(review, ["doesn't look as good as the photos", "not as pictured"])) {
    return "Perception gap";
  }
  if (includesAny(review, ["shipping", "late", "delivery"])) {
    return "Shipping dissatisfaction";
  }
  return "Moderate dissatisfaction";
}

function computeRiskScore(toneScore, severityScore, reasonablenessScore) {
  const raw = (toneScore * 0.4) + (severityScore * 0.35) + (reasonablenessScore * 0.25);
  return Math.round(clamp(raw * 10, 0, 100));
}

function computeRecoveryScore(riskScore, review) {
  let score = 100 - riskScore;

  if (includesAny(review, ["communication was good", "delivery was good"])) score += 10;
  if (includesAny(review, ["crap", "trash", "don't waste your money"])) score -= 15;
  if (includesAny(review, ["a little disappointing", "okay, but"])) score += 10;

  return clamp(Math.round(score), 0, 100);
}

function computeConfidence(toneScore, severityScore, reasonablenessScore, review) {
  let score = 50;

  if (review.length > 40) score += 10;
  if (review.length > 100) score += 10;
  if (toneScore >= 7 || severityScore >= 7 || reasonablenessScore >= 7) score += 10;
  if (includesAny(review, ["smaller than expected", "doesn't look as good as the photos", "shipping", "not worth"])) {
    score += 10;
  }

  score = clamp(score, 0, 100);

  let label = "Possible";
  let color = "yellow";

  if (score >= 85) {
    label = "High";
    color = "green";
  } else if (score >= 65) {
    label = "Likely";
    color = "blue";
  } else if (score >= 40) {
    label = "Possible";
    color = "yellow";
  } else {
    label = "Weak";
    color = "red";
  }

  return { score, label, color };
}

function recommendAction(riskScore, recoveryScore) {
  if (riskScore >= 80 && recoveryScore <= 30) {
    return "Minimize time spent. Consider refund or brief neutral reply only.";
  }
  if (riskScore >= 65) {
    return "Keep response short, factual, and calm. Do not over-explain.";
  }
  if (recoveryScore >= 65) {
    return "Try a warm, clarifying reply first. This looks recoverable.";
  }
  return "Respond professionally and briefly. Focus on future buyers, not winning the argument.";
}

function buildResponses(review, pattern, situation, riskScore, recoveryScore) {
  const lower = normalize(review);

  let actualResponse =
    "I’m sorry this didn’t meet your expectations. I do my best to represent each item as accurately as possible through the listing description and photos, and I’m always happy to answer questions before or after purchase.";

  let polishedShade =
    "The listing details and photos are provided to help set clear expectations prior to purchase.";

  let vent =
    "Respectfully… the listing exists for a reason.";

  if (pattern === "Size / expectation mismatch") {
    actualResponse =
      "I’m sorry this didn’t meet your expectations. The item’s size is included in the listing description and shown in the photos to help provide a clear representation before purchase. I’m always happy to answer any questions as well.";
    polishedShade =
      "The listing includes size details and photos specifically to help avoid confusion about scale.";
    vent =
      "There is literally a ruler in the photos. I don’t know how much more teamwork the listing can do here.";
  } else if (pattern === "Photo / expectation mismatch") {
    actualResponse =
      "I’m sorry this didn’t meet your expectations. I do my best to represent each item as accurately as possible through both the listing photos and description. I’m always happy to answer questions if anything needs clarification.";
    polishedShade =
      "The listing photos and description are intended to provide as accurate a representation as possible prior to purchase.";
    vent =
      "I don’t know how to make it look more like the photos… than the photos.";
  } else if (pattern === "Shipping frustration") {
    actualResponse =
      "I’m sorry the delivery timing was disappointing. Once an order has shipped, transit times can vary depending on the carrier and destination, but I always aim to get orders out as quickly as possible.";
    polishedShade =
      "Shipping timelines can vary after dispatch, but I do my best to send orders promptly.";
    vent =
      "I am many things, but apparently not the CEO of the postal service.";
  } else if (pattern === "Quality / value complaint") {
    actualResponse =
      "I’m sorry this didn’t meet your expectations. I do my best to show each item accurately and describe it clearly so buyers can make an informed decision before purchasing.";
    polishedShade =
      "The listing photos and description are there to help buyers evaluate the item before ordering.";
    vent =
      "The review sounds like a mood, not a product analysis.";
  }

  if (riskScore >= 80 && recoveryScore <= 30) {
    actualResponse =
      "I’m sorry this didn’t meet your expectations. The listing includes the item details, materials, and photos to help provide a clear representation before purchase. I’m always happy to answer questions if clarification is needed.";
  }

  if (includesAny(lower, ["communication was good", "delivery was good"])) {
    actualResponse =
      "Thank you for your feedback, and I’m glad the communication and delivery experience were positive. I’m sorry the item itself didn’t fully meet your expectations. I do my best to represent each piece as accurately as possible in the listing photos and description.";
  }

  return {
    actualResponse,
    polishedShade,
    vent
  };
}

app.post("/api/analyze", (req, res) => {
  const reviewText = typeof req.body.reviewText === "string" ? req.body.reviewText.trim() : "";

  if (!reviewText) {
    return res.status(400).json({ error: "Review text is required." });
  }

  const normalized = normalize(reviewText);
  const toneScore = scoreTone(normalized);
  const severityScore = scoreSeverity(normalized);
  const reasonablenessScore = scoreReasonableness(normalized);

  const riskScore = computeRiskScore(toneScore, severityScore, reasonablenessScore);
  const recoveryScore = computeRecoveryScore(riskScore, normalized);
  const pattern = detectPattern(normalized);
  const situation = classifySituation(normalized, toneScore, severityScore, reasonablenessScore);
  const confidence = computeConfidence(toneScore, severityScore, reasonablenessScore, reviewText);
  const recommendedAction = recommendAction(riskScore, recoveryScore);
  const responses = buildResponses(normalized, pattern, situation, riskScore, recoveryScore);

  res.json({
    input: {
      reviewText
    },
    analysis: {
      situation,
      pattern,
      riskScore,
      recoveryScore,
      toneScore,
      severityScore,
      reasonablenessScore,
      confidence,
      recommendedAction
    },
    responses
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Review Reply Assistant running on port ${PORT}`);
});

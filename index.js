// mika_api/index.js
// Mika API (OpenAI). Node 18+ required (uses global fetch).

import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({
  origin: "*",        // allow all (safe because API requires secret key)
  methods: "GET,POST",
  allowedHeaders: "Content-Type, Authorization"
}));

app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 8787;
const API_BASE = process.env.API_BASE || "/api/mika";

// Trim to avoid hidden spaces/line breaks from .env edits
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_ORG = (process.env.OPENAI_ORG || "").trim(); // optional
const OPENAI_PROJECT = (process.env.OPENAI_PROJECT || "").trim(); // optional

// Masked log so we can confirm the key loaded in this process
const mask = (s) =>
  s && s.length > 12 ? s.slice(0, 8) + "…" + s.slice(-6) : "(none)";
console.log("🔑 OPENAI_API_KEY loaded:", mask(OPENAI_API_KEY));
if (OPENAI_ORG) console.log("🏷️  OPENAI_ORG:", OPENAI_ORG);
if (OPENAI_PROJECT) console.log("📦 OPENAI_PROJECT:", OPENAI_PROJECT);

// ------------------------------------------------------------------
// Helper: Build stylist prompt
// ------------------------------------------------------------------
function buildPrompt({ message, messages, profile = {}, catalog = [] }) {
  let userText = "";
  if (typeof message === "string" && message.trim().length > 0) {
    userText = message.trim();
  } else if (Array.isArray(messages) && messages.length) {
    const lastUser =
      [...messages].reverse().find(
        (m) => (m?.role || "").toLowerCase() === "user"
      )?.content || null;
    userText =
      typeof lastUser === "string" && lastUser.trim()
        ? lastUser.trim()
        : JSON.stringify(messages);
  }

  // Catalog lines: id | title | price
  const catLines = (catalog || [])
    .slice(0, 120)
    .map(
      (p) =>
        `- ${p.id} | ${p.title} | ₱${Number(p.price || 0).toFixed(2)}`
    )
    .join("\n");

  const p = profile || {};
  const profileText = [
    p.gender ? `gender:${p.gender}` : null,
    p.occasion ? `occasion:${p.occasion}` : null,
    p.colorPref ? `colorPref:${p.colorPref}` : null,
    p.sizeTop ? `sizeTop:${p.sizeTop}` : null,
    p.sizeBottom ? `sizeBottom:${p.sizeBottom}` : null,
    p.shoeSize ? `shoeSize:${p.shoeSize}` : null,
    p.bodyType ? `bodyType:${p.bodyType}` : null,
    p.skinTone ? `skinTone:${p.skinTone}` : null,
    p.undertone ? `undertone:${p.undertone}` : null,
    p.budget ? `budget:${p.budget}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `
You are "Mika", the AI stylist for Fermoza (Philippines).
Tone: warm, confident, Taglish-boutique. Short and clear, never generic AI.

  Brand rules:
  - You ONLY recommend products that exist in the Fermoza Shopify catalog provided in the CATALOG section below.
  - You NEVER invent product IDs, names, types, clothing, colors, accessories, footwear, or bags that are not in the catalog.
  - If the catalog contains only handbags, your looks MUST revolve ONLY around those handbags. You may describe clothing or makeup suggestions verbally, but you MUST NOT create or reference nonexistent catalog items.
  - If the catalog contains some blouses, tops, dresses, or accessories, you may include them — but ONLY using the exact product IDs provided.
  - You are a women’s fashion stylist: create polished, feminine, elegant, modern outfits — but always within what the catalog actually contains.
  - Fermoza handbags are ALWAYS the hero of the look.

  Philippine context:
  - Style based on PH climate: humid heat, sudden rain, air-conditioned offices, mall culture, and Baguio trips.
  - For hot days: suggest breathable outfits verbally if needed. Do NOT invent products not in catalog.
  - For rainy days: avoid recommending suede or delicate materials unless they exist in the catalog.
  - For travel: if crossbody bags or secure bags exist in catalog, prioritize them.

  Body-type rules:
  - Petite: avoid oversized bags if catalog has smaller options.
  - Curvy: choose structured bags from catalog if available.
  - Plus-size: avoid recommending tiny bags if they do not flatter the frame.
  - Use skin tone guidance verbally (never invent product colors not in catalog).

  Accessory & clothing rules:
  - You may verbally suggest clothing silhouettes (e.g., “pair with a clean blouse”) but ONLY include catalog items when creating looks.
  - If sunglasses, earrings, necklaces, footwear, or ponchos/scarves exist in the catalog, you may include them. Otherwise only describe them verbally without adding product IDs.

  General aesthetic rules:
  - Aim for chic, elegant, modern Filipino-friendly styling.
  - Always output at least ONE complete look using ONLY catalog item IDs.
  - Never hallucinate. Never output non-catalog product IDs.

You MUST return JSON ONLY with this exact shape:

{
  "message": "short helpful reply (<= 2 sentences, Taglish, no emojis)",
  "looks": [
    {
      "title": "look name",
      "reason": "why it matches this user's lifestyle/body/occasion",
      "items": ["product-id-1","product-id-2"]
    }
  ],
  "picks": [
    { "productId": "id-here", "reason": "1 short reason" }
  ],
  "beauty": {
    "colors": ["..."],
    "makeup": "short makeup/hair tip, or \"\" if not relevant"
  },
  "advice": {
    "fit": "1–2 short lines about fit & body confidence",
    "weather": "1–2 short lines about PH weather adjustment"
  }
}

STRICT rules:
- NEVER invent product IDs, titles, or prices. Use ONLY items from the CATALOG section.
- Every item in looks[].items and picks[].productId MUST exist in the catalog.
- Prefer 2–3 items per look when possible (always at least 1 bag if available).
- If catalog mostly has bags, still create a look where the bag is the star and give styling advice in text.
- ALWAYS give styling and fit advice even if no clothing products are available.
- Respect bodyType, sizeTop/sizeBottom, shoeSize, skinTone, undertone, budget, and occasion when provided.
- For morena/medium skin, favor colors like white, cream, gold, denim, olive, earth tones when appropriate.
- For petite / curvy bodies, suggest comfortable fits and avoid anything that will look too heavy or overwhelming.
- For rain/commute/Baguio contexts, suggest more secure/closed bags and practical shoes; for hot days, suggest lighter outfits.
- Always return a SINGLE valid JSON object following the schema exactly.
- If unsure, still build the best possible look + simple guidance using the available catalog.

USER:
${userText || "(none)"}

PROFILE:
${profileText || "(none)"}

CATALOG (id | title | price):
${catLines}
  `.trim();
}

// ------------------------------------------------------------------
// Helper: Call OpenAI Chat Completions and coerce JSON
// ------------------------------------------------------------------
async function callOpenAIJSON(
  prompt,
  catalog = [],
  { timeoutMs = 7000 } = {}
) {
  if (!OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY is missing (empty after trim).");

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);

  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: "gpt-4.1-mini", // use 'gpt-4o-mini' if your project prefers that
    messages: [
      {
        role: "system",
        content:
          "You are Mika, a structured JSON-only stylist. Always answer with a SINGLE valid JSON object and nothing else.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 700,
  };

  try {
    const headers = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    };
    if (OPENAI_ORG) headers["OpenAI-Organization"] = OPENAI_ORG;
    if (OPENAI_PROJECT) headers["OpenAI-Project"] = OPENAI_PROJECT;

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("❌ OpenAI error HTTP", resp.status, text);
      throw new Error(`OpenAI HTTP ${resp.status}`);
    }

    const json = await resp.json();
    let text = json?.choices?.[0]?.message?.content || "";
    if (Array.isArray(text)) text = text.join("");

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        message:
          typeof text === "string" && text.trim()
            ? text.trim()
            : "Here are ideas for you.",
        looks: [],
        picks: [],
        beauty: {},
        advice: {},
      };
    }

    let result = {
      message:
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : "Here are ideas for you.",
      looks: Array.isArray(parsed.looks) ? parsed.looks : [],
      picks: Array.isArray(parsed.picks) ? parsed.picks : [],
      beauty:
        parsed.beauty && typeof parsed.beauty === "object"
          ? parsed.beauty
          : {},
      advice:
        parsed.advice && typeof parsed.advice === "object"
          ? parsed.advice
          : {},
    };

    // ✅ Clean + validate product IDs so Mika never returns invalid items
    const validIds = new Set(
      (catalog || []).map((p) => String(p.id)).filter(Boolean)
    );

    // Clean looks
    result.looks = (result.looks || [])
      .map((look) => {
        const items = Array.isArray(look.items) ? look.items : [];
        const filteredItems = items
          .map((id) => String(id))
          .filter((id) => validIds.has(id));

        if (!filteredItems.length) return null;

        return {
          title:
            typeof look.title === "string" && look.title.trim()
              ? look.title.trim().slice(0, 80)
              : "Fermoza styled look",
          reason:
            typeof look.reason === "string" && look.reason.trim()
              ? look.reason.trim().slice(0, 200)
              : "Styled using Fermoza pieces for this user.",
          items: filteredItems,
        };
      })
      .filter(Boolean);

    // Clean picks
    result.picks = (result.picks || [])
      .map((pick) => {
        const pid = String(p.productId || pick.productId || "").trim();
        if (!validIds.has(pid)) return null;
        return {
          productId: pid,
          reason:
            typeof pick.reason === "string" && pick.reason.trim()
              ? pick.reason.trim().slice(0, 160)
              : "Good match from Fermoza for this request.",
        };
      })
      .filter(Boolean);

    // 🔁 Fallback: if OpenAI gave no looks/picks but we have catalog items,
    // synthesize at least one look + one pick so the app always has something.
    if (Array.isArray(catalog) && catalog.length > 0) {
      const hero = catalog[0]; // first product as hero
      if (!result.looks || result.looks.length === 0) {
        result.looks = [
          {
            title: `Styled with ${hero.title}`,
            reason:
              "Using available Fermoza pieces to match the request as closely as possible.",
            items: [hero.id],
          },
        ];
      }
      if (!result.picks || result.picks.length === 0) {
        result.picks = [
          {
            productId: hero.id,
            reason:
              "Best match from the current Fermoza catalog for this styling request.",
          },
        ];
      }
      if (!result.message || !result.message.trim()) {
        result.message =
          "Here’s a look I built for you using the available Fermoza pieces.";
      }
    }

    return result;
  } finally {
    clearTimeout(to);
  }
}

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------

app.get(`${API_BASE}/health`, (_req, res) => {
  res.json({
    ok: true,
    provider: "openai",
    apiBase: API_BASE,
    time: new Date().toISOString(),
  });
});

app.post(`${API_BASE}/chat`, async (req, res) => {
  try {
    const { message, messages, profile, catalog } = req.body || {};
    if ((!message && !messages) || !Array.isArray(catalog)) {
      return res
        .status(400)
        .json({ error: "message or messages[] AND catalog[] are required" });
    }

    const prompt = buildPrompt({ message, messages, profile, catalog });
    const result = await callOpenAIJSON(prompt, catalog, { timeoutMs: 7000 });
    return res.json(result);
  } catch (e) {
    console.error("mika_failed", e);
    return res.status(500).json({ error: "mika_failed" });
  }
});

app.listen(PORT, () => {
  console.log(
    `✅ Mika API listening on http://localhost:${PORT}${API_BASE}`
  );
});


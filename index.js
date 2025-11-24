// mika_api/index.js
// Mika API (OpenAI). Node 18+ required (uses global fetch).

import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
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
    p.colorPref ? `color:${p.colorPref}` : null,
    p.budget ? `budget:${p.budget}` : null,
    p.bodyType ? `bodyType:${p.bodyType}` : null,
    p.undertone ? `undertone:${p.undertone}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `
You are "Mika", the AI stylist for Fermoza (Philippines). Speak in a warm, concise Taglish-boutique tone.
Prefer bags as the hero item; you may add other store items. Consider Filipino context (humid/rainy weather, commute, travel, office, church, party).
If "Baguio"/cold → suggest closed shoes/layers.

Return JSON ONLY with this exact shape:

{
  "message": "short helpful reply (<= 2 sentences)",
  "looks": [
    {
      "title": "look name",
      "reason": "why it matches",
      "items": ["product-id-1","product-id-2"]
    }
  ],
  "picks": [
    { "productId": "id-here", "reason": "1 short reason" }
  ],
  "beauty": { "colors": ["..."], "makeup": "..." },
  "advice": { "fit": "...", "weather": "..." }
}

Rules:
- NEVER invent products or prices. Use ONLY items from the CATALOG below.
- If there are only bags or few items, still create at least one look using the available items.
- ALWAYS give styling and fit advice even if no clothing products are available.
- Prefer 2–3 items per look when possible (bag + optional clothing/shoes).
- Respect body type, occasion, budget, and colors when provided.
- Always return a SINGLE valid JSON object following the schema exactly.
- If unsure, still build a useful look + simple guidance based on the catalog.

USER:
${userText || "(none)"}

PROFILE: ${profileText || "(none)"}
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

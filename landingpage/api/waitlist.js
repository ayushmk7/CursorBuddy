const { ensureWaitlistSchema, getSql } = require("./lib/waitlist-schema");

const ALLOWED_APPS = new Set([
  "vscode",
  "jetbrains",
  "imovie",
  "video-editing",
  "creative-suite",
  "browser",
  "terminal",
  "all-apps",
  "contribute",
  "other"
]);

function parseBody(req) {
  const raw = req.body;
  if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw || "{}");
    } catch {
      return {};
    }
  }
  return {};
}

module.exports = async function waitlistHandler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    return res.status(503).json({
      error: "Database not configured",
      code: "db_unavailable",
      detail: "Connect Neon (or Postgres) in Vercel and set POSTGRES_URL or DATABASE_URL."
    });
  }

  const body = parseBody(req);
  const honeypot = String(body["bot-field"] ?? body.botField ?? "").trim();
  if (honeypot) {
    return res.status(200).json({ ok: true });
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const name = String(body.name || "").trim();
  const preferredApp = String(body.preferredApp || body.preferred_app || "").trim();
  const source = String(body.source || "cursorbuddy-landingpage").slice(0, 120);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email", code: "validation" });
  }

  if (!name) {
    return res.status(400).json({ error: "Name is required", code: "validation" });
  }

  if (!preferredApp || !ALLOWED_APPS.has(preferredApp)) {
    return res.status(400).json({ error: "Choose where you want CursorBuddy next.", code: "validation" });
  }

  try {
    await ensureWaitlistSchema();
    const sql = getSql();
    await sql`
      INSERT INTO waitlist_signups (email, name, preferred_app, source)
      VALUES (${email}, ${name || null}, ${preferredApp}, ${source})
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    const code = err && err.code;
    const msg = String((err && err.message) || "");
    const isUniqueViolation =
      code === "23505" || /duplicate key value violates unique constraint/i.test(msg) || /unique constraint/i.test(msg);
    if (isUniqueViolation) {
      return res.status(409).json({ code: "duplicate", error: "Email already on the list." });
    }
    console.error("waitlist insert error", err);
    return res.status(500).json({ error: "Server error", code: "server" });
  }
};

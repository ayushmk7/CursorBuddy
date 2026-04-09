const { ensureWaitlistSchema, getSql } = require("./lib/waitlist-schema");

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

module.exports = async function exportWaitlistHandler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method not allowed");
  }

  const secret = process.env.WAITLIST_EXPORT_SECRET;
  if (!secret) {
    return res.status(503).send("Export is not configured (missing WAITLIST_EXPORT_SECRET).");
  }

  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  let querySecret = "";
  if (typeof req.query?.secret === "string") {
    querySecret = req.query.secret;
  } else if (req.url) {
    try {
      const host = req.headers.host || "localhost";
      const u = new URL(req.url, `https://${host}`);
      querySecret = u.searchParams.get("secret") || "";
    } catch {
      querySecret = "";
    }
  }
  if (bearer !== secret && querySecret !== secret) {
    return res.status(401).send("Unauthorized");
  }

  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    return res.status(503).send("Database not configured.");
  }

  try {
    await ensureWaitlistSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT email, name, preferred_app, source, created_at
      FROM waitlist_signups
      ORDER BY created_at ASC
    `;

    const header = ["email", "name", "preferred_app", "source", "created_at"];
    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [row.email, row.name, row.preferred_app, row.source, row.created_at].map(csvEscape).join(",")
      )
    ];

    const csv = `${lines.join("\n")}\n`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="cursorbuddy-waitlist.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error("export waitlist error", err);
    return res.status(500).send("Export failed");
  }
};

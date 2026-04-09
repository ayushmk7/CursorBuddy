const { neon } = require("@neondatabase/serverless");

let sqlRef;

function getSql() {
  if (!sqlRef) {
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Missing POSTGRES_URL or DATABASE_URL");
    }
    sqlRef = neon(url);
  }
  return sqlRef;
}

async function ensureWaitlistSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS waitlist_signups (
      id SERIAL PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      name VARCHAR(200),
      preferred_app VARCHAR(120) NOT NULL,
      source VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

module.exports = { ensureWaitlistSchema, getSql };

const { neon } = require("@neondatabase/serverless");
const { getDatabaseUrl } = require("./db-url");

let sqlRef;

function getSql() {
  if (!sqlRef) {
    const url = getDatabaseUrl();
    if (!url) {
      throw new Error("Missing database URL (POSTGRES_URL, DATABASE_URL, …)");
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

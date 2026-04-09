/**
 * Resolve Postgres connection string from Vercel / Neon / marketplace integrations.
 * Names differ by provider; we accept every common alias.
 */
function getDatabaseUrl() {
  const keys = [
    "POSTGRES_URL",
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_PRISMA_URL",
    "NEON_DATABASE_URL",
  ];
  for (const key of keys) {
    const v = process.env[key];
    const s = typeof v === "string" ? v.trim() : "";
    if (s) {
      return s;
    }
  }
  return "";
}

module.exports = { getDatabaseUrl };

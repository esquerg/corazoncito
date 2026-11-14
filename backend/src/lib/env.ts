import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Falta la variable de entorno: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL ?? "./data/corazoncito.sqlite",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET", "dev_access_secret_cambia_esto"),
    refreshSecret: required("JWT_REFRESH_SECRET", "dev_refresh_secret_cambia_esto"),
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
  },
  seed: {
    ownerName: process.env.SEED_OWNER_NAME ?? "Owner",
    ownerEmail: process.env.SEED_OWNER_EMAIL ?? "owner@corazoncito.cafe",
    ownerPassword: process.env.SEED_OWNER_PASSWORD ?? "corazoncito123",
  },
} as const;

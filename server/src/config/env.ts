import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  TWO_FACTOR_CHALLENGE_TTL: z.string().default("5m"),
  TWO_FACTOR_ENCRYPTION_KEY: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:8081"),
  APP_BASE_URL: z.url().default("http://localhost:8081"),
  API_PUBLIC_URL: z.url().default("http://localhost:4000"),
  EMAIL_WEBHOOK_URL: z.url().optional(),
  EMAIL_WEBHOOK_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_IDS: z.string().optional(),
  MEDIA_BUCKET: z.string().optional(),
  MEDIA_LOCAL_DIR: z.string().default("/tmp/spectrum-uploads"),
  AWS_REGION: z.string().default("us-east-1"),
});

export const env = schema.parse(process.env);

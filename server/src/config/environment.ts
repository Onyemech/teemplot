import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string(),
  SMTP_USER: z.string().email(),
  SMTP_PASSWORD: z.string(),
  EMAIL_FROM: z.string().email(),
  
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  
  PAYSTACK_SECRET_KEY: z.string(),
  PAYSTACK_PUBLIC_KEY: z.string(),
  
  PLAN_STARTER_PRICE: z.string().default('500000'),
  PLAN_PROFESSIONAL_PRICE: z.string().default('1500000'),
  PLAN_ENTERPRISE_PRICE: z.string().default('5000000'),
  
  FRONTEND_URL: z.string().url(),
  
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_TIMEWINDOW: z.string().default('900000'),
  
  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPER_ADMIN_PASSWORD: z.string().min(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

export const config_env = {
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: parseInt(env.PORT),
  
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  email: {
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT),
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.EMAIL_FROM,
  },
  
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
  },
  
  paystack: {
    secretKey: env.PAYSTACK_SECRET_KEY,
    publicKey: env.PAYSTACK_PUBLIC_KEY,
  },
  
  pricing: {
    starter: parseInt(env.PLAN_STARTER_PRICE),
    professional: parseInt(env.PLAN_PROFESSIONAL_PRICE),
    enterprise: parseInt(env.PLAN_ENTERPRISE_PRICE),
  },
  
  frontendUrl: env.FRONTEND_URL,
  
  rateLimit: {
    max: parseInt(env.RATE_LIMIT_MAX),
    timeWindow: parseInt(env.RATE_LIMIT_TIMEWINDOW),
  },
  
  superAdmin: {
    email: env.SUPER_ADMIN_EMAIL,
    password: env.SUPER_ADMIN_PASSWORD,
  },
};

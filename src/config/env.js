const dotenv = require('dotenv');
const { z } = require('zod');

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  EMAIL_SERVICE: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@splitwise-app.com'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  REDIS_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  SERVER_URL: z.string()  
});

const envVars = envSchema.safeParse(process.env);
// console.log('envVars :', envVars);

if (!envVars.success) {
  console.error('❌ Invalid environment variables:', envVars.error.format());
  process.exit(1);
}

module.exports = {
  env: envVars.data.NODE_ENV,
  port: parseInt(envVars.data.PORT, 10),
  databaseUrl: envVars.data.DATABASE_URL,
  jwt: {
    secret: envVars.data.JWT_SECRET,
    refreshSecret: envVars.data.JWT_REFRESH_SECRET,
    expiresIn: envVars.data.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.data.JWT_REFRESH_EXPIRES_IN
  },
  email: {
    service: envVars.data.EMAIL_SERVICE,
    test_mail: "uniquetechexplorer7@gmail.com",
    host: envVars.data.EMAIL_HOST,
    port: envVars.data.EMAIL_PORT ? parseInt(envVars.data.EMAIL_PORT, 10) : undefined,
    user: envVars.data.EMAIL_USER,
    password: envVars.data.EMAIL_PASSWORD,
    from: envVars.data.EMAIL_FROM
  },
  rateLimit: {
    windowMs: parseInt(envVars.data.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(envVars.data.RATE_LIMIT_MAX_REQUESTS, 10)
  },
  corsOrigin: envVars.data.CORS_ORIGIN.split(','),
  logLevel: envVars.data.LOG_LEVEL,
  redisUrl: envVars.data.REDIS_URL,
  cloudinary: {
    cloudName: envVars.data.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.data.CLOUDINARY_API_KEY,
    apiSecret: envVars.data.CLOUDINARY_API_SECRET
  },
  server_url: envVars.data.SERVER_URL

};

import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  MIN_EMAIL_DELAY_MS: parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10),
  DEFAULT_HOURLY_LIMIT: parseInt(process.env.DEFAULT_HOURLY_LIMIT || '200', 10),
  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_reachinbox_key_2026',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};

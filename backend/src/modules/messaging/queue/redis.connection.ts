import { Redis } from 'ioredis';

export function bullmqConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    maxRetriesPerRequest: null as null,
  };
}

let shared: Redis | null = null;

export function redisConnection() {
  if (shared) return shared;
  shared = new Redis(bullmqConnection());
  return shared;
}

export async function closeRedis() {
  if (!shared) return;
  await shared.quit();
  shared = null;
}

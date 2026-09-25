import path from 'path';
import Redis, { RedisOptions } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import { ENV } from './env';

let redisInstance: Redis | null = null;
let redisMemoryServer: RedisMemoryServer | null = null;
let activeConnectionOptions: RedisOptions | null = null;
let initPromise: Promise<RedisOptions> | null = null;

export const initRedis = async (): Promise<RedisOptions> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    // 1. Try external Redis
    try {
      const testClient = new Redis({
        host: ENV.REDIS_HOST,
        port: ENV.REDIS_PORT,
        connectTimeout: 1500,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      testClient.on('error', () => {});

      await testClient.connect();

      const info = await testClient.info('server');
      const versionMatch = info.match(/redis_version:([0-9.]+)/);
      const versionStr = versionMatch ? versionMatch[1] : '0.0.0';
      const majorVersion = parseInt(versionStr.split('.')[0], 10);

      if (majorVersion < 5) {
        console.warn(`⚠️ External Redis at ${ENV.REDIS_HOST}:${ENV.REDIS_PORT} is version ${versionStr} (< 5.0.0 required by BullMQ). Spawning RedisMemoryServer...`);
        testClient.disconnect();
        throw new Error(`Incompatible Redis version ${versionStr}`);
      }

      console.log(`✅ Connected to external Redis ${versionStr} at ${ENV.REDIS_HOST}:${ENV.REDIS_PORT}`);
      activeConnectionOptions = {
        host: ENV.REDIS_HOST,
        port: ENV.REDIS_PORT,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        skipVersionCheck: true,
      };
      redisInstance = testClient;
      return activeConnectionOptions;
    } catch (err) {
      console.warn(`⚠️ External Redis at ${ENV.REDIS_HOST}:${ENV.REDIS_PORT} incompatible or not reachable. Spawning fallback RedisMemoryServer (Redis 7+)...`);

      try {
        if (!redisMemoryServer) {
          const systemBinaryPath = path.join(__dirname, '../../bin/redis-server.exe');
          redisMemoryServer = new RedisMemoryServer({
            binary: {
              systemBinary: systemBinaryPath,
            },
          });
        }
        const host = await redisMemoryServer.getHost();
        const port = await redisMemoryServer.getPort();
        console.log(`🚀 Fallback RedisMemoryServer (Redis 5.0.14.1) running at ${host}:${port}`);

        // Update process.env and ENV so any default Redis connections target the Redis 7+ instance
        process.env.REDIS_PORT = String(port);
        process.env.REDIS_HOST = host;
        ENV.REDIS_PORT = port;
        ENV.REDIS_HOST = host;

        activeConnectionOptions = {
          host,
          port,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          skipVersionCheck: true,
        };

        if (redisInstance) {
          try { redisInstance.disconnect(); } catch (e) {}
          redisInstance = null;
        }

        redisInstance = new Redis(activeConnectionOptions);
        return activeConnectionOptions;
      } catch (memErr) {
        console.error('❌ Failed to start RedisMemoryServer:', memErr);
        throw memErr;
      }
    }
  })();

  return initPromise;
};

export const getRedisConnectionOptions = (): RedisOptions => {
  if (!activeConnectionOptions) {
    throw new Error('Redis has not been initialized yet. Call await initRedis() before getting connection options.');
  }
  return activeConnectionOptions;
};

export const getRedisClient = (): Redis => {
  if (!activeConnectionOptions) {
    throw new Error('Redis has not been initialized yet. Call await initRedis() before getting Redis client.');
  }
  if (!redisInstance) {
    redisInstance = new Redis(activeConnectionOptions);
  }
  return redisInstance;
};


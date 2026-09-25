import { getRedisClient } from '../config/redis';
import { prisma } from '../config/db';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  hourWindow: string;
  nextResetTime: Date;
  msUntilReset: number;
}

export class RateLimiterService {
  /**
   * Format current hour window string, e.g. "2026-09-24-18"
   */
  static getCurrentHourWindow(date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `${year}-${month}-${day}-${hour}`;
  }

  /**
   * Get exact Date timestamp when the current hour window ends
   */
  static getNextHourStart(date = new Date()): Date {
    const next = new Date(date);
    next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
    return next;
  }

  /**
   * Atomically check and increment Redis hourly sender rate limit counter
   */
  static async checkAndIncrement(senderEmail: string, hourlyLimit: number): Promise<RateLimitCheckResult> {
    const redis = getRedisClient();
    const now = new Date();
    const hourWindow = this.getCurrentHourWindow(now);
    const redisKey = `rate_limit:${senderEmail}:${hourWindow}`;

    // Atomically increment counter
    const currentCount = await redis.incr(redisKey);

    // Set expiration to 2 hours if key was newly created
    if (currentCount === 1) {
      await redis.expire(redisKey, 7200);
    }

    const nextResetTime = this.getNextHourStart(now);
    const msUntilReset = Math.max(1000, nextResetTime.getTime() - now.getTime());
    const allowed = currentCount <= hourlyLimit;

    // Log to DB for persistence and dashboard metrics
    try {
      await prisma.rateLimitLog.create({
        data: {
          senderEmail,
          hourWindow,
          count: currentCount,
          hitLimit: !allowed,
        },
      });
    } catch (e) {
      // Ignore non-critical log insert error
    }

    return {
      allowed,
      currentCount,
      limit: hourlyLimit,
      hourWindow,
      nextResetTime,
      msUntilReset,
    };
  }

  /**
   * Get current rate limit stats for a sender without incrementing
   */
  static async getSenderStats(senderEmail: string, hourlyLimit: number): Promise<RateLimitCheckResult> {
    const redis = getRedisClient();
    const now = new Date();
    const hourWindow = this.getCurrentHourWindow(now);
    const redisKey = `rate_limit:${senderEmail}:${hourWindow}`;

    const rawCount = await redis.get(redisKey);
    const currentCount = rawCount ? parseInt(rawCount, 10) : 0;
    const nextResetTime = this.getNextHourStart(now);
    const msUntilReset = Math.max(1000, nextResetTime.getTime() - now.getTime());

    return {
      allowed: currentCount < hourlyLimit,
      currentCount,
      limit: hourlyLimit,
      hourWindow,
      nextResetTime,
      msUntilReset,
    };
  }
}

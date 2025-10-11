import Redis from "ioredis";

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis connection
export const redis = new Redis(redisConfig);

// Connection event handlers
redis.on("connect", () => {
  console.log("Redis connected successfully");
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error);
});

redis.on("close", () => {
  console.log("Redis connection closed");
});

redis.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit();
    console.log("Redis connection closed gracefully");
  } catch (error) {
    console.error("Error closing Redis connection:", error);
    redis.disconnect();
  }
}

// Utility functions for common operations
export class RedisUtils {
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting Redis key ${key}:`, error);
      return null;
    }
  }

  static async del(key: string): Promise<void> {
    await redis.del(key);
  }

  static async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  }

  static async increment(key: string, amount: number = 1): Promise<number> {
    return await redis.incrby(key, amount);
  }

  static async expire(key: string, ttl: number): Promise<void> {
    await redis.expire(key, ttl);
  }

  // Queue-specific utilities
  static async addToQueue(
    queueName: string,
    jobData: any,
    options?: any
  ): Promise<string> {
    const jobId = await redis.lpush(queueName, JSON.stringify(jobData));
    return jobId.toString();
  }

  static async getFromQueue(queueName: string): Promise<any> {
    const result = await redis.brpop(queueName, 0);
    return result ? JSON.parse(result[1]) : null;
  }

  static async getQueueLength(queueName: string): Promise<number> {
    return await redis.llen(queueName);
  }

  // Session management
  static async setSession(
    sessionId: string,
    sessionData: any,
    ttl: number = 86400
  ): Promise<void> {
    await this.set(`session:${sessionId}`, sessionData, ttl);
  }

  static async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.get<T>(`session:${sessionId}`);
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Cache management
  static async setCache(
    key: string,
    value: any,
    ttl: number = 3600
  ): Promise<void> {
    await this.set(`cache:${key}`, value, ttl);
  }

  static async getCache<T>(key: string): Promise<T | null> {
    return await this.get<T>(`cache:${key}`);
  }

  static async invalidateCache(pattern: string): Promise<void> {
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export default redis;

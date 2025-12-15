import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { IOtpStorage, IOtpData } from '../interfaces/otp-storage.interface';

@Injectable()
export class RedisOtpStorage implements IOtpStorage {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private getOtpKey(identifier: string): string {
    return `otp:${identifier}`;
  }

  private getRateLimitKey(identifier: string): string {
    return `rate_limit:otp:${identifier}`;
  }

  async store(identifier: string, code: string, ttl: number): Promise<void> {
    const key = this.getOtpKey(identifier);
    const data: IOtpData = {
      code,
      attempts: 0,
      createdAt: Date.now(),
    };

    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  async verify(identifier: string, code: string): Promise<boolean> {
    const key = this.getOtpKey(identifier);
    const dataStr = await this.redis.get(key);

    if (!dataStr) {
      return false;
    }

    const data: IOtpData = JSON.parse(dataStr);

    // Constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(data.code);
    const actualBuffer = Buffer.from(code);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }

  async incrementAttempts(identifier: string): Promise<number> {
    const key = this.getOtpKey(identifier);
    const dataStr = await this.redis.get(key);

    if (!dataStr) {
      return 0;
    }

    const data: IOtpData = JSON.parse(dataStr);
    data.attempts += 1;

    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    }

    return data.attempts;
  }

  async delete(identifier: string): Promise<void> {
    const key = this.getOtpKey(identifier);
    await this.redis.del(key);
  }

  async getRateLimitCount(identifier: string): Promise<number> {
    const key = this.getRateLimitKey(identifier);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async incrementRateLimit(identifier: string, ttl: number): Promise<void> {
    const key = this.getRateLimitKey(identifier);
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, ttl);
    }
  }
}

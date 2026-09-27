import { Injectable, Logger } from '@nestjs/common';
import { redisConnection } from './redis.connection.js';

export type ProviderRateLimits = {
  requestPerSecond: number;
  messagePerSecond: number;
  maxBatchSize: number;
  batchesPerSecond: number;
};

export const DEFAULT_RATE_LIMITS: ProviderRateLimits = {
  requestPerSecond: 10,
  messagePerSecond: 50,
  maxBatchSize: 100,
  batchesPerSecond: 5,
};

const ACQUIRE_LUA = `
local reqKey, msgKey, batchKey = KEYS[1], KEYS[2], KEYS[3]
local reqMax = tonumber(ARGV[1])
local msgMax = tonumber(ARGV[2])
local batchMax = tonumber(ARGV[3])
local msgCount = tonumber(ARGV[4])

local function current(key)
  return tonumber(redis.call('GET', key) or '0')
end
local function ttl(key)
  local t = redis.call('PTTL', key)
  if t < 0 then return 1000 end
  return t
end

if current(reqKey) + 1 > reqMax then return ttl(reqKey) end
if current(msgKey) + msgCount > msgMax then return ttl(msgKey) end
if current(batchKey) + 1 > batchMax then return ttl(batchKey) end

local req = redis.call('INCR', reqKey)
if req == 1 then redis.call('PEXPIRE', reqKey, 1000) end
local msg = redis.call('INCRBY', msgKey, msgCount)
if msg == msgCount then redis.call('PEXPIRE', msgKey, 1000) end
local batch = redis.call('INCR', batchKey)
if batch == 1 then redis.call('PEXPIRE', batchKey, 1000) end
return 0
`;

@Injectable()
export class ProviderRateLimiter {
  private readonly logger = new Logger(ProviderRateLimiter.name);
  private redis = redisConnection();

  normalize(raw?: Partial<ProviderRateLimits> | null): ProviderRateLimits {
    return {
      requestPerSecond: Math.max(1, raw?.requestPerSecond ?? DEFAULT_RATE_LIMITS.requestPerSecond),
      messagePerSecond: Math.max(1, raw?.messagePerSecond ?? DEFAULT_RATE_LIMITS.messagePerSecond),
      maxBatchSize: Math.max(1, raw?.maxBatchSize ?? DEFAULT_RATE_LIMITS.maxBatchSize),
      batchesPerSecond: Math.max(1, raw?.batchesPerSecond ?? DEFAULT_RATE_LIMITS.batchesPerSecond),
    };
  }

  chunkSize(limits: ProviderRateLimits) {
    return Math.max(1, Math.min(limits.maxBatchSize, limits.messagePerSecond));
  }

  async isPaused(providerId: string) {
    const ttl = await this.redis.pttl(`sms:rl:pause:${providerId}`);
    return ttl > 0 ? ttl : 0;
  }

  async pause(providerId: string, ms: number) {
    await this.redis.set(`sms:rl:pause:${providerId}`, '1', 'PX', Math.max(1000, ms));
    this.logger.warn(`Provider ${providerId} paused for ${ms}ms`);
  }

  async acquire(
    providerId: string,
    accountId: string,
    limits: ProviderRateLimits,
    messageCount: number,
  ): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
    if (messageCount > limits.maxBatchSize || messageCount > limits.messagePerSecond) {
      return { ok: false, retryAfterMs: 1000 };
    }
    const paused = await this.isPaused(providerId);
    if (paused > 0) return { ok: false, retryAfterMs: paused };

    const base = `sms:rl:${providerId}:${accountId}`;
    const wait = Number(
      await this.redis.eval(
        ACQUIRE_LUA,
        3,
        `${base}:req`,
        `${base}:msg`,
        `${base}:batch`,
        String(limits.requestPerSecond),
        String(limits.messagePerSecond),
        String(limits.batchesPerSecond),
        String(Math.max(1, messageCount)),
      ),
    );
    if (wait > 0) return { ok: false, retryAfterMs: wait };
    return { ok: true };
  }
}

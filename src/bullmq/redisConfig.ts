import { RedisOptions } from 'ioredis';

export const redisConfig: RedisOptions = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
};

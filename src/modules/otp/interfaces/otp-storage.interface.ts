export interface IOtpData {
  code: string;
  attempts: number;
  createdAt: number;
}

export interface IOtpStorage {
  store(identifier: string, code: string, ttl: number): Promise<void>;
  verify(identifier: string, code: string): Promise<boolean>;
  incrementAttempts(identifier: string): Promise<number>;
  delete(identifier: string): Promise<void>;
  getRateLimitCount(identifier: string): Promise<number>;
  incrementRateLimit(identifier: string, ttl: number): Promise<void>;
}

/**
 * Failed-login limiter (same policy as the Spring LoginAttemptLimiter: 5 failures per e-mail+IP
 * in 15 minutes). It lives in memory, so on Vercel it applies per function instance.
 */
export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, { failures: number; start: number }>();

  constructor(
    private readonly maxFailures = 5,
    private readonly windowMs = 15 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  blocked(key: string): boolean {
    const entry = this.attempts.get(key);
    if (!entry) return false;
    if (this.expired(entry.start)) {
      this.attempts.delete(key);
      return false;
    }
    return entry.failures >= this.maxFailures;
  }

  registerFailure(key: string): void {
    if (this.attempts.size > 10_000) {
      for (const [k, v] of this.attempts) if (this.expired(v.start)) this.attempts.delete(k);
    }
    const entry = this.attempts.get(key);
    if (!entry || this.expired(entry.start)) this.attempts.set(key, { failures: 1, start: this.now() });
    else entry.failures += 1;
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }

  get waitMinutes(): number {
    return Math.round(this.windowMs / 60_000);
  }

  private expired(start: number): boolean {
    return start + this.windowMs < this.now();
  }
}

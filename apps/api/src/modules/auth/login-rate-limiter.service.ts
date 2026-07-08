import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AttemptState = {
  count: number;
  resetAt: number;
};

@Injectable()
export class LoginRateLimiterService {
  private readonly attempts = new Map<string, AttemptState>();

  assertCanAttempt(key: string) {
    const state = this.getCurrentState(key);

    if (state.count >= MAX_ATTEMPTS) {
      throw new HttpException(
        "TOO_MANY_LOGIN_ATTEMPTS",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  recordFailure(key: string) {
    const now = Date.now();
    const state = this.getCurrentState(key);

    this.attempts.set(key, {
      count: state.count + 1,
      resetAt: state.resetAt > now ? state.resetAt : now + WINDOW_MS
    });
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  private getCurrentState(key: string) {
    const now = Date.now();
    const state = this.attempts.get(key);

    if (!state || state.resetAt <= now) {
      const freshState = { count: 0, resetAt: now + WINDOW_MS };
      this.attempts.set(key, freshState);
      return freshState;
    }

    return state;
  }
}

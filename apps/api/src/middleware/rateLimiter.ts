import { Request, Response, NextFunction } from 'express';

// Simple in-memory sliding window rate limiter for login & password reset
interface Attempt {
  count: number;
  resetAt: number;
}

const attemptsMap = new Map<string, Attempt>();

export const authRateLimiter = (maxAttempts = 10, windowMs = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = attemptsMap.get(ip);
    if (!record || now > record.resetAt) {
      attemptsMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxAttempts) {
      const waitMinutes = Math.ceil((record.resetAt - now) / 60000);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many authentication attempts. Please try again in ${waitMinutes} minute(s).`,
        },
      });
      return;
    }

    record.count++;
    next();
  };
};

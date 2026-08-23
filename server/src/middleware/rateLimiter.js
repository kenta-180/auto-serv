// In-memory sliding window rate limiter
// Key: IP / Phone identifier -> Array of timestamp numbers
const rateLimitStore = new Map();

/**
 * Express middleware for rate limiting OTP requests per IP address AND per Phone number concurrently
 * @param {object} options - { windowMs: number, maxRequests: number, message: string }
 */
function createPhoneAndIpLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes window
  const maxRequests = options.maxRequests || 5;        // Max 5 requests per window
  const errorMessage = options.message || 'Too many OTP requests from this IP or phone number. Please try again after 15 minutes to prevent account quota abuse.';

  return function rateLimiter(req, res, next) {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const targetPhone = req.body && req.body.phone ? String(req.body.phone).trim().replace(/[\s\-\(\)]/g, '') : '';
    
    const keysToCheck = [`ip:${clientIp}`];
    if (targetPhone) {
      keysToCheck.push(`phone:${targetPhone}`);
    }

    const now = Date.now();

    // Check rate limit for each key
    for (const key of keysToCheck) {
      const timestamps = rateLimitStore.get(key) || [];
      const validTimestamps = timestamps.filter(ts => (now - ts) < windowMs);

      if (validTimestamps.length >= maxRequests) {
        console.warn(`[RateLimiter] Abuse prevention rate limit exceeded for key "${key}" (${validTimestamps.length}/${maxRequests} requests in 15 mins)`);
        const oldestTs = validTimestamps[0];
        const retryAfterSeconds = Math.ceil((windowMs - (now - oldestTs)) / 1000);
        return res.status(429).json({
          error: errorMessage,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds
        });
      }
    }

    // If all keys pass, record timestamp for each key
    for (const key of keysToCheck) {
      const timestamps = rateLimitStore.get(key) || [];
      const validTimestamps = timestamps.filter(ts => (now - ts) < windowMs);
      validTimestamps.push(now);
      rateLimitStore.set(key, validTimestamps);
    }

    next();
  };
}

module.exports = {
  createPhoneAndIpLimiter,
  otpLimiter: createPhoneAndIpLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many OTP requests from this IP or mobile number. Please wait 15 minutes before requesting again.'
  }),
  phoneAndIpLimiter: createPhoneAndIpLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'OTP request rate limit exceeded for this IP or phone number. Please wait 15 minutes.'
  })
};

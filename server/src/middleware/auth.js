const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const firebaseService = require('../services/firebaseService');

const JWT_SECRET = process.env.JWT_SECRET || 'autoserv-super-secret-jwt-key-2026';

// In-Memory Session Cache (5-Minute TTL for Sub-Second Session Verification)
const userSessionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const invalidateUserCache = (userId) => {
  if (userId) userSessionCache.delete(userId);
};

const clearUserCache = () => {
  userSessionCache.clear();
};

const authenticateToken = async (req, res, next) => {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    for (const c of rawCookies) {
      const [key, value] = c.trim().split('=');
      if (key === 'token') {
        token = value;
        break;
      }
    }
  }

  if (!token) {
    req.user = null;
    return next();
  }

  // Check cache first for instant sub-millisecond return
  const cached = userSessionCache.get(token);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    req.user = cached.user;
    return next();
  }

  // 1. Try Firebase Auth ID Token Verification
  if (firebaseService.isFirebaseAdminInitialized()) {
    try {
      const fbResult = await firebaseService.verifyFirebaseIdToken(token);
      if (fbResult && fbResult.verified) {
        let user = await userRepository.findById(fbResult.uid);
        if (!user && fbResult.email) {
          user = await userRepository.findByEmail(fbResult.email);
        }
        if (!user && fbResult.phoneNumber) {
          user = await userRepository.findByPhone(fbResult.phoneNumber);
        }

        if (user) {
          const userPayload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone
          };
          userSessionCache.set(token, { user: userPayload, timestamp: Date.now() });
          req.user = userPayload;
          return next();
        }
      }
    } catch (fbErr) {
      // Token is not a valid Firebase ID Token or verification error, fallback to standard JWT
    }
  }

  // 2. Fallback to JWT Token Verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const user = await userRepository.findById(userId);
    if (user) {
      const userPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone
      };
      userSessionCache.set(token, { user: userPayload, timestamp: Date.now() });
      req.user = userPayload;
      return next();
    }
  } catch (err) {
    req.user = null;
    return next();
  }

  req.user = null;
  next();
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  invalidateUserCache,
  clearUserCache,
  JWT_SECRET
};

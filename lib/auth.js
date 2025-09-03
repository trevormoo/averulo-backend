// lib/auth.js
import jwt from 'jsonwebtoken';

export function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;

    if (!token) {
      if (required) return res.status(401).json({ error: 'No token' });
      req.user = null;
      return next();
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      // keep the whole payload; ensure .sub is present
      req.user = { ...payload, id: payload.sub };
      return next();
    } catch {
      if (required) return res.status(401).json({ error: 'Invalid token' });
      req.user = null;
      return next();
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
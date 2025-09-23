import { Request, Response, NextFunction } from 'express';
import { JwtUtils, JwtPayload } from '../utils/jwtUtils.js';

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware to protect routes
 * Verifies JWT token and attaches user data to request
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = JwtUtils.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user data if token is valid, but doesn't block access
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = JwtUtils.verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Token invalid but we don't block access
    }
  }

  next();
};
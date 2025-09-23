import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: number;
  email: string;
}

/**
 * JWT token utilities for authentication
 * Handles token generation and verification
 */
export class JwtUtils {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
  private static readonly EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  /**
   * Generate a JWT token for a user
   * @param payload - User data to encode in token
   * @returns string - JWT token
   */
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.EXPIRES_IN,
    });
  }

  /**
   * Verify and decode a JWT token
   * @param token - JWT token to verify
   * @returns JwtPayload - Decoded token data
   * @throws Error if token is invalid
   */
  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.JWT_SECRET) as JwtPayload;
  }
}
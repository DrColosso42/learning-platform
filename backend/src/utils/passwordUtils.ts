import bcrypt from 'bcryptjs';

/**
 * Utility functions for secure password handling
 * Uses bcrypt with salt rounds for hashing
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a plain text password securely
   * @param password - Plain text password
   * @returns Promise<string> - Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   * @param password - Plain text password
   * @param hash - Stored password hash
   * @returns Promise<boolean> - True if password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
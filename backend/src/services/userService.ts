import { User } from '@prisma/client';
import { prisma } from '../config/database.js';
import { PasswordUtils } from '../utils/passwordUtils.js';

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * User service handles all user-related business logic
 * Implements secure authentication with password hashing
 */
export class UserService {
  /**
   * Create a new user with hashed password
   * @param userData - User registration data
   * @returns Promise<User> - Created user (without password hash)
   * @throws Error if email already exists
   */
  async createUser(userData: CreateUserInput): Promise<Omit<User, 'passwordHash'>> {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await PasswordUtils.hashPassword(userData.password);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        passwordHash,
      },
    });

    // Return user without password hash for security
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Authenticate user login credentials
   * @param loginData - Email and password
   * @returns Promise<User | null> - User if credentials valid, null otherwise
   */
  async authenticateUser(loginData: LoginInput): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { email: loginData.email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await PasswordUtils.verifyPassword(
      loginData.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return null;
    }

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find user by ID
   * @param userId - User ID
   * @returns Promise<User | null> - User without password hash
   */
  async findById(userId: number): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
import { Request, Response } from 'express';
import { UserService } from '../services/userService.js';
import { JwtUtils } from '../utils/jwtUtils.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { ZodError } from 'zod';

/**
 * Authentication controller handles user registration and login
 * Implements secure authentication flow with JWT tokens
 */
export class AuthController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = registerSchema.parse(req.body);

      const user = await this.userService.createUser(validatedData);

      const token = JwtUtils.generateToken({
        userId: user.id,
        email: user.email,
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
        return;
      }

      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const user = await this.userService.authenticateUser(validatedData);

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = JwtUtils.generateToken({
        userId: user.id,
        email: user.email,
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await this.userService.findById(req.user.userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

/**
 * Authentication routes
 * Handles user registration, login, and profile management
 */
export const createAuthRoutes = (): Router => {
  const router = Router();
  const authController = new AuthController();

  // Public routes
  router.post('/register', authController.register);
  router.post('/login', authController.login);

  // Protected routes
  router.get('/profile', authenticateToken, authController.getProfile);

  return router;
};
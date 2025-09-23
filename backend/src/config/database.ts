import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client instance for database operations
 * Ensures single connection pool across the application
 */
class DatabaseConnection {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      });
    }
    return DatabaseConnection.instance;
  }

  /**
   * Gracefully disconnect from database
   */
  public static async disconnect(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.$disconnect();
    }
  }
}

export const prisma = DatabaseConnection.getInstance();
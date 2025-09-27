"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
/**
 * Singleton Prisma client instance for database operations
 * Ensures single connection pool across the application
 */
class DatabaseConnection {
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new client_1.PrismaClient({
                log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
            });
        }
        return DatabaseConnection.instance;
    }
    /**
     * Gracefully disconnect from database
     */
    static async disconnect() {
        if (DatabaseConnection.instance) {
            await DatabaseConnection.instance.$disconnect();
        }
    }
}
exports.prisma = DatabaseConnection.getInstance();

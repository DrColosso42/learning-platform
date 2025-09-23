import { Project } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateProjectInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface ProjectWithStats extends Project {
  totalQuestions: number;
  questionsAnswered: number;
  completionRatio: number;
  lastStudied: Date | null;
}

/**
 * Project service handles project management and statistics
 * Provides CRUD operations and completion tracking
 */
export class ProjectService {
  /**
   * Create a new project for a user
   */
  async createProject(userId: number, projectData: CreateProjectInput): Promise<Project> {
    return prisma.project.create({
      data: {
        name: projectData.name,
        description: projectData.description || null,
        isPublic: projectData.isPublic || false,
        ownerId: userId,
      },
    });
  }

  /**
   * Get all projects for a user with completion statistics
   */
  async getUserProjects(userId: number): Promise<ProjectWithStats[]> {
    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      include: {
        questionSets: {
          include: {
            questions: true,
            studySessions: {
              where: { userId },
              include: {
                sessionAnswers: true,
              },
              orderBy: { completedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map(project => {
      const totalQuestions = project.questionSets.reduce(
        (sum, qs) => sum + qs.questions.length,
        0
      );

      // Get unique answered questions across all sessions
      const answeredQuestionIds = new Set<number>();
      project.questionSets.forEach(qs => {
        qs.studySessions.forEach(session => {
          session.sessionAnswers.forEach(answer => {
            answeredQuestionIds.add(answer.questionId);
          });
        });
      });

      const questionsAnswered = answeredQuestionIds.size;
      const completionRatio = totalQuestions > 0 ? questionsAnswered / totalQuestions : 0;

      // Find the most recent study session
      const allSessions = project.questionSets.flatMap(qs => qs.studySessions);
      const lastStudied = allSessions.length > 0
        ? allSessions.reduce((latest, session) =>
            session.completedAt && (!latest || session.completedAt > latest)
              ? session.completedAt
              : latest,
          null as Date | null)
        : null;

      return {
        ...project,
        totalQuestions,
        questionsAnswered,
        completionRatio,
        lastStudied,
      };
    });
  }

  /**
   * Get a single project by ID with ownership check
   */
  async getProjectById(projectId: number, userId: number): Promise<ProjectWithStats | null> {
    const projects = await this.getUserProjects(userId);
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * Update a project
   */
  async updateProject(
    projectId: number,
    userId: number,
    updateData: UpdateProjectInput
  ): Promise<Project | null> {
    // Verify ownership
    const existingProject = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!existingProject) {
      return null;
    }

    return prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: number, userId: number): Promise<boolean> {
    try {
      const deletedProject = await prisma.project.deleteMany({
        where: { id: projectId, ownerId: userId },
      });

      return deletedProject.count > 0;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  /**
   * Get public projects (for discovery)
   */
  async getPublicProjects(limit: number = 20): Promise<ProjectWithStats[]> {
    const projects = await prisma.project.findMany({
      where: { isPublic: true },
      include: {
        owner: {
          select: { name: true },
        },
        questionSets: {
          include: {
            questions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return projects.map(project => {
      const totalQuestions = project.questionSets.reduce(
        (sum, qs) => sum + qs.questions.length,
        0
      );

      return {
        ...project,
        totalQuestions,
        questionsAnswered: 0, // Public projects don't show personal progress
        completionRatio: 0,
        lastStudied: null,
      };
    });
  }
}
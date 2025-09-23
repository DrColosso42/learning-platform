import { AuthService } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface Project {
  id: number
  name: string
  description: string
  questionsAnswered: number
  totalQuestions: number
  completionRatio: number
  lastStudied: string | null
  createdAt: string
  isPublic: boolean
}

export interface CreateProjectRequest {
  name: string
  description?: string
  isPublic?: boolean
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  isPublic?: boolean
}

/**
 * Project service for managing user projects
 * Handles CRUD operations and project statistics
 */
export class ProjectService {
  /**
   * Get all user projects
   */
  static async getUserProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch projects')
    }

    return data.projects
  }

  /**
   * Get a single project by ID
   */
  static async getProject(projectId: number): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch project')
    }

    return data.project
  }

  /**
   * Create a new project
   */
  static async createProject(projectData: CreateProjectRequest): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(projectData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create project')
    }

    return data.project
  }

  /**
   * Update a project
   */
  static async updateProject(projectId: number, updateData: UpdateProjectRequest): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(updateData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update project')
    }

    return data.project
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete project')
    }
  }

  /**
   * Get public projects for discovery
   */
  static async getPublicProjects(limit: number = 20): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/api/projects/public?limit=${limit}`)

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch public projects')
    }

    return data.projects
  }
}
import { AuthService } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface Question {
  id: number
  questionText: string
  answerText: string | null
  difficulty: number
  createdAt: string
  updatedAt: string
}

export interface QuestionSet {
  id: number
  name: string
  description: string | null
  projectId: number
  createdAt: string
  updatedAt: string
  questions: Question[]
  questionCount: number
}

export interface CreateQuestionSetRequest {
  name: string
  description?: string
  projectId: number
}

export interface CreateQuestionRequest {
  questionText: string
  answerText?: string
  difficulty?: number
}

export interface BulkCreateQuestionsRequest {
  questions: CreateQuestionRequest[]
  questionSetId: number
}

export interface ParseTextRequest {
  text: string
  format: 'csv' | 'lines'
}

/**
 * Question service for managing question sets and questions
 * Supports various import methods and bulk operations
 */
export class QuestionService {
  /**
   * Create a new question set
   */
  static async createQuestionSet(questionSetData: CreateQuestionSetRequest): Promise<QuestionSet> {
    const response = await fetch(`${API_BASE_URL}/api/questions/sets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(questionSetData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create question set')
    }

    return data.questionSet
  }

  /**
   * Get all question sets for a project
   */
  static async getQuestionSetsByProject(projectId: number): Promise<QuestionSet[]> {
    const response = await fetch(`${API_BASE_URL}/api/questions/sets/project/${projectId}`, {
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch question sets')
    }

    return data.questionSets
  }

  /**
   * Get a single question set with questions
   */
  static async getQuestionSet(questionSetId: number): Promise<QuestionSet> {
    const response = await fetch(`${API_BASE_URL}/api/questions/sets/${questionSetId}`, {
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch question set')
    }

    return data.questionSet
  }

  /**
   * Create a single question
   */
  static async createQuestion(questionSetId: number, questionData: CreateQuestionRequest): Promise<Question> {
    const response = await fetch(`${API_BASE_URL}/api/questions/sets/${questionSetId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(questionData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create question')
    }

    return data.question
  }

  /**
   * Create multiple questions in bulk
   */
  static async createQuestionsBulk(bulkData: BulkCreateQuestionsRequest): Promise<Question[]> {
    const response = await fetch(`${API_BASE_URL}/api/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(bulkData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create questions')
    }

    return data.questions
  }

  /**
   * Parse text (CSV or lines) and return parsed questions for preview
   */
  static async parseText(parseData: ParseTextRequest): Promise<CreateQuestionRequest[]> {
    const response = await fetch(`${API_BASE_URL}/api/questions/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(parseData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to parse text')
    }

    return data.questions
  }

  /**
   * Update a question
   */
  static async updateQuestion(questionId: number, updateData: Partial<CreateQuestionRequest>): Promise<Question> {
    const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(updateData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update question')
    }

    return data.question
  }

  /**
   * Delete a question
   */
  static async deleteQuestion(questionId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}`, {
      method: 'DELETE',
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete question')
    }
  }

  /**
   * Delete a question set
   */
  static async deleteQuestionSet(questionSetId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/questions/sets/${questionSetId}`, {
      method: 'DELETE',
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete question set')
    }
  }
}
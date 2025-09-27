import { AuthService } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface StudySession {
  id: number
  questionSetId: number
  mode: 'front-to-end' | 'shuffle'
  startedAt: string
  isResumed?: boolean
}

export interface Question {
  id: number
  questionText: string
  answerText: string | null
  difficulty: number
}

export interface SessionProgress {
  totalQuestions: number
  answeredQuestions: number
  masteredQuestions: number
  currentPoints: number
  maxPoints: number
}

export interface NextQuestionResponse {
  question: Question | null
  questionNumber: number | null
  previousScore: number | null
  sessionComplete: boolean
  progress: SessionProgress
}

export interface SessionStatus {
  hasActiveSession: boolean
  progress: SessionProgress | null
  sessionComplete: boolean
}

export interface StartSessionRequest {
  questionSetId: number
  mode: 'front-to-end' | 'shuffle'
}

export interface SubmitAnswerRequest {
  questionId: number
  confidenceRating: number
}

export interface QuestionWithProbability {
  id: number
  questionText: string
  questionNumber: number
  lastAttempt: { userRating: number } | null
  selectionProbability: number
  weight: number
  isSelectable: boolean
}

export interface QuestionsWithProbabilitiesResponse {
  questions: QuestionWithProbability[]
  totalWeight: number
  currentQuestionId: number | null
}

/**
 * Frontend service for managing study sessions
 * Handles session lifecycle, question flow, and progress tracking
 */
export class StudySessionService {
  /**
   * Start or resume a study session
   */
  static async startSession(sessionData: StartSessionRequest): Promise<StudySession> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(sessionData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to start study session')
    }

    return data.session
  }

  /**
   * Get current session status
   */
  static async getSessionStatus(questionSetId: number): Promise<SessionStatus> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/status`, {
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get session status')
    }

    return {
      hasActiveSession: data.hasActiveSession,
      progress: data.progress,
      sessionComplete: data.sessionComplete,
    }
  }

  /**
   * Get the next question in the session
   */
  static async getNextQuestion(questionSetId: number): Promise<NextQuestionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/next-question`, {
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get next question')
    }

    return {
      question: data.question,
      questionNumber: data.questionNumber,
      previousScore: data.previousScore,
      sessionComplete: data.sessionComplete,
      progress: data.progress,
    }
  }

  /**
   * Submit answer with confidence rating
   */
  static async submitAnswer(questionSetId: number, answerData: SubmitAnswerRequest): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/submit-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify(answerData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit answer')
    }
  }

  /**
   * Complete the current study session
   */
  static async completeSession(questionSetId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/complete`, {
      method: 'POST',
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to complete session')
    }
  }

  /**
   * Restart study session with new mode
   */
  static async restartSession(questionSetId: number, mode: 'front-to-end' | 'shuffle'): Promise<StudySession> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify({ mode }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to restart session')
    }

    return data.session
  }

  /**
   * Reset study session - complete deletion and fresh start
   * This removes all progress and timer data permanently
   */
  static async resetSession(questionSetId: number, mode: 'front-to-end' | 'shuffle' = 'front-to-end'): Promise<StudySession> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify({ mode }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset session')
    }

    return data.session
  }

  /**
   * Get all questions with selection probabilities for sidebar visualization
   */
  static async getQuestionsWithProbabilities(questionSetId: number): Promise<QuestionsWithProbabilitiesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/questions-probabilities`, {
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get questions with probabilities')
    }

    return {
      questions: data.questions,
      totalWeight: data.totalWeight,
      currentQuestionId: data.currentQuestionId,
    }
  }

  /**
   * Select a specific question for study (if eligible)
   */
  static async selectQuestion(questionSetId: number, questionId: number): Promise<NextQuestionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/select-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.getAuthHeader(),
      },
      body: JSON.stringify({ questionId }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to select question')
    }

    return {
      question: data.question,
      questionNumber: data.questionNumber,
      previousScore: data.previousScore,
      sessionComplete: data.sessionComplete,
      progress: data.progress,
    }
  }
}
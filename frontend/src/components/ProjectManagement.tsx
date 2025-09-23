import { useState, useEffect } from 'react'

interface Project {
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

/**
 * Project management interface with CRUD operations
 * Shows projects with completion tracking and management options
 */
function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false
  })

  useEffect(() => {
    // TODO: Replace with actual API call
    const mockProjects: Project[] = [
      {
        id: 1,
        name: "JavaScript Fundamentals",
        description: "Core JavaScript concepts including variables, functions, and objects",
        questionsAnswered: 28,
        totalQuestions: 50,
        completionRatio: 0.56,
        lastStudied: "2025-09-23T10:30:00Z",
        createdAt: "2025-09-15T14:20:00Z",
        isPublic: false
      },
      {
        id: 2,
        name: "React Concepts",
        description: "Modern React development with hooks, context, and state management",
        questionsAnswered: 15,
        totalQuestions: 40,
        completionRatio: 0.375,
        lastStudied: "2025-09-22T16:45:00Z",
        createdAt: "2025-09-18T09:15:00Z",
        isPublic: true
      },
      {
        id: 3,
        name: "Database Design",
        description: "SQL, database normalization, and query optimization",
        questionsAnswered: 32,
        totalQuestions: 35,
        completionRatio: 0.914,
        lastStudied: "2025-09-21T14:20:00Z",
        createdAt: "2025-09-10T11:30:00Z",
        isPublic: false
      },
      {
        id: 4,
        name: "TypeScript Basics",
        description: "Type system, interfaces, and advanced TypeScript features",
        questionsAnswered: 0,
        totalQuestions: 25,
        completionRatio: 0,
        lastStudied: null,
        createdAt: "2025-09-23T08:00:00Z",
        isPublic: false
      }
    ]

    setTimeout(() => {
      setProjects(mockProjects)
      setIsLoading(false)
    }, 500)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingProject) {
      // Update existing project
      setProjects(prev => prev.map(p =>
        p.id === editingProject.id
          ? { ...p, ...formData }
          : p
      ))
      setEditingProject(null)
    } else {
      // Create new project
      const newProject: Project = {
        id: Date.now(),
        ...formData,
        questionsAnswered: 0,
        totalQuestions: 0,
        completionRatio: 0,
        lastStudied: null,
        createdAt: new Date().toISOString()
      }
      setProjects(prev => [newProject, ...prev])
      setShowCreateForm(false)
    }

    setFormData({ name: '', description: '', isPublic: false })
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description,
      isPublic: project.isPublic
    })
    setShowCreateForm(true)
  }

  const handleDelete = (projectId: number) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      setProjects(prev => prev.filter(p => p.id !== projectId))
    }
  }

  const cancelForm = () => {
    setShowCreateForm(false)
    setEditingProject(null)
    setFormData({ name: '', description: '', isPublic: false })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCompletionColor = (ratio: number): string => {
    if (ratio >= 0.8) return '#10b981'
    if (ratio >= 0.5) return '#f59e0b'
    if (ratio > 0) return '#3b82f6'
    return '#6b7280'
  }

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        Loading projects...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          📁 My Projects
        </h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>+</span>
          New Project
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1.5rem'
          }}>
            {editingProject ? 'Edit Project' : 'Create New Project'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Project Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                required
                placeholder="Enter project name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-input"
                rows={3}
                placeholder="Describe what this project covers"
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleInputChange}
              />
              <label htmlFor="isPublic" style={{
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                Make this project public (others can view and study)
              </label>
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem'
            }}>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '1.5rem'
      }}>
        {projects.map(project => (
          <div
            key={project.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Project Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {project.name}
                  </h3>
                  {project.isPublic && (
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.125rem 0.5rem',
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      borderRadius: '0.375rem'
                    }}>
                      Public
                    </span>
                  )}
                </div>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  lineHeight: '1.4'
                }}>
                  {project.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                gap: '0.25rem',
                marginLeft: '1rem'
              }}>
                <button
                  onClick={() => handleEdit(project)}
                  style={{
                    padding: '0.375rem',
                    border: 'none',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  style={{
                    padding: '0.375rem',
                    border: 'none',
                    backgroundColor: '#fef2f2',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Completion Stats */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: getCompletionColor(project.completionRatio)
              }}>
                {project.questionsAnswered}/{project.totalQuestions}
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: getCompletionColor(project.completionRatio)
              }}>
                {Math.round(project.completionRatio * 100)}%
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: `${project.completionRatio * 100}%`,
                height: '100%',
                backgroundColor: getCompletionColor(project.completionRatio),
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Project Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#9ca3af'
            }}>
              <span>
                Created {formatDate(project.createdAt)}
              </span>
              {project.lastStudied && (
                <span>
                  Last studied {formatDate(project.lastStudied)}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1rem'
            }}>
              <button
                className="btn"
                style={{
                  flex: 1,
                  backgroundColor: '#f8fafc',
                  color: '#374151',
                  border: '1px solid #e5e7eb'
                }}
              >
                📝 Manage Questions
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={project.totalQuestions === 0}
              >
                🚀 Start Study
              </button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '3rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            No projects yet
          </h2>
          <p style={{
            color: '#6b7280',
            marginBottom: '2rem'
          }}>
            Create your first project to start organizing your study materials
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            Create Your First Project
          </button>
        </div>
      )}
    </div>
  )
}

export default ProjectManagement
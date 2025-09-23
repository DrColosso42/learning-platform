import { useState, useEffect } from 'react'
import { QuestionService, QuestionSet, Question } from '../services/questionService'

interface QuestionManagementPageProps {
  projectId: number
  projectName: string
  onBack: () => void
}

/**
 * Question Management page with multiple input methods
 * Supports manual entry, CSV upload, paste CSV, and bulk text
 */
function QuestionManagementPage({ projectId, projectName, onBack }: QuestionManagementPageProps) {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<QuestionSet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'manual' | 'csv-upload' | 'csv-paste' | 'text-bulk'>('manual')
  const [showCreateSetForm, setShowCreateSetForm] = useState(false)

  // Form states
  const [newSetName, setNewSetName] = useState('')
  const [newSetDescription, setNewSetDescription] = useState('')
  const [manualQuestion, setManualQuestion] = useState({ questionText: '', answerText: '', difficulty: 1 })
  const [csvText, setCsvText] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadQuestionSets()
  }, [projectId])

  const loadQuestionSets = async () => {
    try {
      setIsLoading(true)
      const sets = await QuestionService.getQuestionSetsByProject(projectId)
      setQuestionSets(sets)
      if (sets.length > 0 && !selectedQuestionSet) {
        setSelectedQuestionSet(sets[0])
      }
    } catch (error) {
      console.error('Failed to load question sets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateQuestionSet = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsProcessing(true)
      const newSet = await QuestionService.createQuestionSet({
        name: newSetName,
        description: newSetDescription || undefined,
        projectId,
      })

      setQuestionSets(prev => [newSet, ...prev])
      setSelectedQuestionSet(newSet)
      setShowCreateSetForm(false)
      setNewSetName('')
      setNewSetDescription('')
    } catch (error) {
      console.error('Failed to create question set:', error)
      alert('Failed to create question set. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuestionSet) {
      alert('Please select a question set first')
      return
    }

    try {
      setIsProcessing(true)
      await QuestionService.createQuestion(selectedQuestionSet.id, manualQuestion)
      setManualQuestion({ questionText: '', answerText: '', difficulty: 1 })
      await reloadCurrentQuestionSet()
    } catch (error) {
      console.error('Failed to create question:', error)
      alert('Failed to create question. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleParseText = async (format: 'csv' | 'lines') => {
    const text = format === 'csv' ? csvText : bulkText
    if (!text.trim()) {
      alert('Please enter some text to parse')
      return
    }

    try {
      setIsProcessing(true)
      const questions = await QuestionService.parseText({ text: text.trim(), format })
      setParsedQuestions(questions)
    } catch (error) {
      console.error('Failed to parse text:', error)
      alert('Failed to parse text. Please check the format and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkImport = async () => {
    if (!selectedQuestionSet || parsedQuestions.length === 0) {
      alert('Please select a question set and parse some questions first')
      return
    }

    try {
      setIsProcessing(true)
      await QuestionService.createQuestionsBulk({
        questions: parsedQuestions,
        questionSetId: selectedQuestionSet.id,
      })

      setParsedQuestions([])
      setCsvText('')
      setBulkText('')
      await reloadCurrentQuestionSet()
      alert(`Successfully imported ${parsedQuestions.length} questions!`)
    } catch (error) {
      console.error('Failed to import questions:', error)
      alert('Failed to import questions. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const reloadCurrentQuestionSet = async () => {
    if (selectedQuestionSet) {
      try {
        const updated = await QuestionService.getQuestionSet(selectedQuestionSet.id)
        setSelectedQuestionSet(updated)
        setQuestionSets(prev => prev.map(qs => qs.id === updated.id ? updated : qs))
      } catch (error) {
        console.error('Failed to reload question set:', error)
      }
    }
  }

  const handleDeleteQuestion = async (questionId: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await QuestionService.deleteQuestion(questionId)
        await reloadCurrentQuestionSet()
      } catch (error) {
        console.error('Failed to delete question:', error)
        alert('Failed to delete question. Please try again.')
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCsvText(content)
      }
      reader.readAsText(file)
    }
  }

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        Loading question management...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.25rem'
            }}>
              📝 Question Management
            </h1>
            <p style={{ color: '#6b7280' }}>
              {projectName}
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '2rem'
        }}>
          {/* Question Sets Sidebar */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            height: 'fit-content'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Question Sets
              </h2>
              <button
                onClick={() => setShowCreateSetForm(true)}
                style={{
                  padding: '0.375rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                + New
              </button>
            </div>

            {showCreateSetForm && (
              <form onSubmit={handleCreateQuestionSet} style={{ marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    placeholder="Question set name"
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <textarea
                    value={newSetDescription}
                    onChange={(e) => setNewSetDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    style={{
                      flex: 1,
                      padding: '0.375rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateSetForm(false)}
                    style={{
                      flex: 1,
                      padding: '0.375rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {questionSets.map(qs => (
                <div
                  key={qs.id}
                  onClick={() => setSelectedQuestionSet(qs)}
                  style={{
                    padding: '0.75rem',
                    border: selectedQuestionSet?.id === qs.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    backgroundColor: selectedQuestionSet?.id === qs.id ? '#eff6ff' : 'white'
                  }}
                >
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>
                    {qs.name}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    {qs.questionCount} questions
                  </div>
                </div>
              ))}

              {questionSets.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '1.5rem',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  No question sets yet.
                  <br />
                  Create one to get started!
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            {selectedQuestionSet ? (
              <>
                {/* Question Set Header */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.5rem'
                  }}>
                    {selectedQuestionSet.name}
                  </h3>
                  {selectedQuestionSet.description && (
                    <p style={{
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      {selectedQuestionSet.description}
                    </p>
                  )}
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    marginTop: '0.5rem'
                  }}>
                    {selectedQuestionSet.questionCount} questions
                  </p>
                </div>

                {/* Tabs for different input methods */}
                <div style={{
                  borderBottom: '1px solid #e5e7eb',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {[
                      { id: 'manual', label: '➕ Manual Entry', icon: '' },
                      { id: 'csv-upload', label: '📄 Upload CSV', icon: '' },
                      { id: 'csv-paste', label: '📋 Paste CSV', icon: '' },
                      { id: 'text-bulk', label: '📝 Bulk Text', icon: '' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                          padding: '0.75rem 1rem',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                          color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: activeTab === tab.id ? '600' : '400'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'manual' && (
                  <div>
                    <h4 style={{ marginBottom: '1rem', color: '#1f2937' }}>Add Question Manually</h4>
                    <form onSubmit={handleManualQuestionSubmit}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          Question Text *
                        </label>
                        <textarea
                          value={manualQuestion.questionText}
                          onChange={(e) => setManualQuestion(prev => ({ ...prev, questionText: e.target.value }))}
                          required
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            resize: 'vertical'
                          }}
                          placeholder="Enter your question here..."
                        />
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          Answer (optional)
                        </label>
                        <textarea
                          value={manualQuestion.answerText}
                          onChange={(e) => setManualQuestion(prev => ({ ...prev, answerText: e.target.value }))}
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            resize: 'vertical'
                          }}
                          placeholder="Enter the answer or explanation..."
                        />
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          Difficulty (1-5)
                        </label>
                        <select
                          value={manualQuestion.difficulty}
                          onChange={(e) => setManualQuestion(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem'
                          }}
                        >
                          <option value={1}>1 - Very Easy</option>
                          <option value={2}>2 - Easy</option>
                          <option value={3}>3 - Medium</option>
                          <option value={4}>4 - Hard</option>
                          <option value={5}>5 - Very Hard</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="btn btn-primary"
                      >
                        {isProcessing ? 'Adding...' : 'Add Question'}
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'csv-upload' && (
                  <div>
                    <h4 style={{ marginBottom: '1rem', color: '#1f2937' }}>Upload CSV File</h4>
                    <div style={{ marginBottom: '1rem' }}>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          marginBottom: '1rem'
                        }}
                      />
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginBottom: '1rem'
                      }}>
                        Supported formats: "Question","Answer" or "Question","Answer",difficulty
                      </div>
                    </div>

                    {csvText && (
                      <div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#374151'
                          }}>
                            File Content Preview:
                          </label>
                          <textarea
                            value={csvText}
                            onChange={(e) => setCsvText(e.target.value)}
                            rows={8}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button
                            onClick={() => handleParseText('csv')}
                            disabled={isProcessing}
                            className="btn btn-primary"
                          >
                            {isProcessing ? 'Parsing...' : 'Parse CSV'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'csv-paste' && (
                  <div>
                    <h4 style={{ marginBottom: '1rem', color: '#1f2937' }}>Paste CSV Data</h4>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>
                        CSV Text:
                      </label>
                      <textarea
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        rows={10}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace'
                        }}
                        placeholder={`"What is React?","A JavaScript library for building user interfaces",2
"What is JSX?","A syntax extension for JavaScript",1
"What is a component?","A reusable piece of UI",3`}
                      />
                    </div>

                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '1rem'
                    }}>
                      Supported formats:<br />
                      • "Question","Answer"<br />
                      • "Question","Answer",difficulty<br />
                      • Question,Answer (without quotes)
                    </div>

                    <button
                      onClick={() => handleParseText('csv')}
                      disabled={isProcessing || !csvText.trim()}
                      className="btn btn-primary"
                    >
                      {isProcessing ? 'Parsing...' : 'Parse CSV'}
                    </button>
                  </div>
                )}

                {activeTab === 'text-bulk' && (
                  <div>
                    <h4 style={{ marginBottom: '1rem', color: '#1f2937' }}>Bulk Import (One Question Per Line)</h4>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>
                        Questions (one per line):
                      </label>
                      <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        rows={12}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                        placeholder={`What is React?
What is JSX?
What is a component?

Or with numbering (automatically removed):
1. What is state in React?
2. What are props?
3. What is a hook?

Or with letters:
a. What is useEffect?
b. What is useState?`}
                      />
                    </div>

                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '1rem'
                    }}>
                      Each line will become a separate question. Numbered prefixes (1., 2), a., etc.) are automatically removed. Answers can be added later.
                    </div>

                    <button
                      onClick={() => handleParseText('lines')}
                      disabled={isProcessing || !bulkText.trim()}
                      className="btn btn-primary"
                    >
                      {isProcessing ? 'Parsing...' : 'Parse Questions'}
                    </button>
                  </div>
                )}

                {/* Parsed Questions Preview */}
                {parsedQuestions.length > 0 && (
                  <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h5 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '1rem'
                    }}>
                      Parsed Questions ({parsedQuestions.length})
                    </h5>

                    <div style={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      marginBottom: '1rem'
                    }}>
                      {parsedQuestions.slice(0, 10).map((q, index) => (
                        <div key={index} style={{
                          padding: '0.75rem',
                          backgroundColor: 'white',
                          borderRadius: '0.25rem',
                          marginBottom: '0.5rem',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#1f2937',
                            marginBottom: '0.25rem'
                          }}>
                            <strong>Q{index + 1}:</strong> {q.questionText}
                          </div>
                          {q.answerText && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280'
                            }}>
                              <strong>A:</strong> {q.answerText}
                            </div>
                          )}
                        </div>
                      ))}
                      {parsedQuestions.length > 10 && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textAlign: 'center'
                        }}>
                          ... and {parsedQuestions.length - 10} more questions
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button
                        onClick={handleBulkImport}
                        disabled={isProcessing}
                        className="btn btn-primary"
                      >
                        {isProcessing ? 'Importing...' : `Import ${parsedQuestions.length} Questions`}
                      </button>
                      <button
                        onClick={() => setParsedQuestions([])}
                        disabled={isProcessing}
                        style={{
                          padding: '0.75rem 1.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          backgroundColor: 'white',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Questions List */}
                {selectedQuestionSet.questions && selectedQuestionSet.questions.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h5 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '1rem'
                    }}>
                      Current Questions ({selectedQuestionSet.questions?.length || 0})
                    </h5>

                    <div style={{
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}>
                      {(selectedQuestionSet.questions || []).map((question, index) => (
                        <div key={question.id} style={{
                          padding: '1rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '0.375rem',
                          marginBottom: '0.75rem',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '0.875rem',
                                color: '#1f2937',
                                fontWeight: '500',
                                marginBottom: '0.25rem'
                              }}>
                                Q{index + 1}: {question.questionText}
                              </div>
                              {question.answerText && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280'
                                }}>
                                  Answer: {question.answerText}
                                </div>
                              )}
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
                              }}>
                                Difficulty: {question.difficulty}/5
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteQuestion(question.id)}
                              style={{
                                padding: '0.25rem',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  No Question Set Selected
                </h3>
                <p>Create or select a question set to start adding questions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuestionManagementPage
'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:8080'

interface Message {
  role: 'user' | 'assistant'
  content: string
  agent?: string
  score?: number
}

interface Document {
  id: string
  filename: string
  status: string
  created_at: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadDocuments() }, [])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      await axios.post(`${API}/api/documents/upload`, form)
      await loadDocuments()
    } catch {
      alert('Upload failed — is the backend running?')
    }
    setUploading(false)
  }

  const loadDocuments = async () => {
    try {
      const res = await axios.get(`${API}/api/documents/`)
      setDocuments(res.data)
    } catch {
      console.error('Failed to load documents')
    }
  }

  const deleteDocument = async (id: string) => {
    if (!confirm('Delete this document?')) return
    setDeletingId(id)
    try {
      await axios.delete(`${API}/api/documents/${id}`)
      await loadDocuments()
    } catch {
      alert('Delete failed')
    }
    setDeletingId(null)
  }

  const sendMessage = async () => {
    if (!question.trim() || loading) return
    const q = question
    setQuestion('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/query`, { question: q })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer,
        agent: res.data.agent_used,
        score: res.data.eval_score,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error — is the backend running?'
      }])
    }
    setLoading(false)
  }

  const agentColor: Record<string, string> = {
    rag: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    code: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    search: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    eval: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  }

  const agentIcon: Record<string, string> = {
    rag: '📚', code: '💻', search: '🔍', eval: '⭐',
  }

  const scoreColor = (score: number) =>
    score >= 0.8 ? 'text-violet-400' : score >= 0.5 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex h-screen text-white font-sans overflow-hidden"
      style={{ background: '#050008' }}>

      {/* Neon glow effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)', filter: 'blur(80px)' }} />
      </div>

      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r relative z-10"
        style={{ background: 'rgba(10,0,20,0.95)', borderColor: 'rgba(139,92,246,0.2)' }}>

        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                boxShadow: '0 0 25px rgba(139,92,246,0.6), 0 0 50px rgba(139,92,246,0.2)'
              }}>
              🧠
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-lg"
                style={{ textShadow: '0 0 20px rgba(139,92,246,0.8)' }}>
                DocuMind
              </h1>
              <p className="text-xs" style={{ color: 'rgba(139,92,246,0.6)' }}>AI Knowledge Worker</p>
            </div>
          </div>
        </div>

        {/* Upload */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full text-white text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: '0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.1)'
            }}>
            {uploading
              ? <><span className="animate-spin">⏳</span> Uploading...</>
              : <><span className="text-lg">+</span> Upload Document</>}
          </button>
          <input ref={fileRef} type="file" className="hidden"
            onChange={uploadDocument} accept=".pdf,.txt,.docx" />
          <p className="text-xs mt-2 text-center" style={{ color: 'rgba(139,92,246,0.4)' }}>
            PDF, DOCX, TXT supported
          </p>
        </div>

        {/* Documents */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest"
              style={{ color: 'rgba(139,92,246,0.6)' }}>
              Documents ({documents.length})
            </p>
            <button onClick={loadDocuments}
              className="text-xs transition-colors"
              style={{ color: 'rgba(139,92,246,0.4)' }}>
              ↻ Refresh
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-xs" style={{ color: 'rgba(139,92,246,0.4)' }}>No documents yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map(doc => (
                <div key={doc.id}
                  className="rounded-xl p-3 border transition-all group cursor-default"
                  style={{
                    background: 'rgba(139,92,246,0.05)',
                    borderColor: 'rgba(139,92,246,0.2)',
                  }}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5">
                      {doc.filename.endsWith('.pdf') ? '📕' :
                        doc.filename.endsWith('.docx') ? '📘' : '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate font-medium">{doc.filename}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${doc.status === 'ready' ? 'bg-violet-400' :
                            doc.status === 'failed' ? 'bg-red-400' :
                              'bg-yellow-400 animate-pulse'}`} />
                        <p className={`text-xs ${doc.status === 'ready' ? 'text-violet-400' :
                            doc.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {doc.status}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      disabled={deletingId === doc.id}
                      className="opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300 text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(239,68,68,0.1)' }}>
                      {deletingId === doc.id ? '...' : '✕'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent legend */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-2"
            style={{ color: 'rgba(139,92,246,0.5)' }}>Agents</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[['rag', 'RAG'], ['code', 'Code'], ['search', 'Search'], ['eval', 'Eval']].map(([key, label]) => (
              <div key={key}
                className={`text-xs px-2 py-1 rounded-lg border ${agentColor[key]} flex items-center gap-1`}>
                <span>{agentIcon[key]}</span> {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col relative z-10">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b"
          style={{ background: 'rgba(10,0,20,0.8)', borderColor: 'rgba(139,92,246,0.2)' }}>
          <div>
            <h2 className="font-semibold text-white">Chat</h2>
            <p className="text-xs" style={{ color: 'rgba(139,92,246,0.5)' }}>
              Powered by RAG + Agents
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.3)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"
              style={{ boxShadow: '0 0 6px rgba(139,92,246,0.8)' }} />
            <span className="text-xs" style={{ color: 'rgba(139,92,246,0.7)' }}>Backend live</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
                style={{
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 60px rgba(139,92,246,0.2), inset 0 0 30px rgba(139,92,246,0.05)'
                }}>
                🧠
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2"
                  style={{ textShadow: '0 0 30px rgba(139,92,246,0.5)' }}>
                  Ask me anything
                </h3>
                <p className="text-sm max-w-sm" style={{ color: 'rgba(139,92,246,0.5)' }}>
                  Upload a document and start asking questions. I'll use RAG, code execution, or web search to find the best answer.
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-2 w-full max-w-md">
                {[
                  "What skills are mentioned in my resume?",
                  "Calculate 15% tip on $85",
                  "What are the latest AI trends?",
                ].map(s => (
                  <button key={s} onClick={() => setQuestion(s)}
                    className="text-sm text-left px-4 py-3 rounded-xl border transition-all"
                    style={{
                      color: 'rgba(139,92,246,0.8)',
                      background: 'rgba(139,92,246,0.05)',
                      borderColor: 'rgba(139,92,246,0.2)',
                    }}>
                    {s} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                  style={{
                    background: 'rgba(139,92,246,0.2)',
                    border: '1px solid rgba(139,92,246,0.4)',
                    boxShadow: '0 0 10px rgba(139,92,246,0.3)'
                  }}>
                  🧠
                </div>
              )}
              <div className="max-w-2xl flex flex-col gap-2">
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                  style={msg.role === 'user'
                    ? {
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      boxShadow: '0 0 20px rgba(139,92,246,0.3)',
                      color: 'white'
                    }
                    : {
                      background: 'rgba(10,0,20,0.8)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      color: '#e2e8f0'
                    }}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.agent && (
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-xs px-2 py-0.5 rounded-lg border ${agentColor[msg.agent] || agentColor.rag} flex items-center gap-1`}>
                      {agentIcon[msg.agent]} {msg.agent} agent
                    </span>
                    {msg.score !== undefined && (
                      <span className={`text-xs font-medium ${scoreColor(msg.score)}`}>
                        {msg.score >= 0.8 ? '✓' : msg.score >= 0.5 ? '~' : '!'} {Math.round(msg.score * 100)}% quality
                      </span>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                  style={{
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.3)'
                  }}>
                  👤
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                style={{
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  boxShadow: '0 0 10px rgba(139,92,246,0.3)'
                }}>
                🧠
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3"
                style={{ background: 'rgba(10,0,20,0.8)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div className="flex gap-1 items-center h-4">
                  {[0, 150, 300].map(delay => (
                    <div key={delay}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: '#a855f7',
                        animationDelay: `${delay}ms`,
                        boxShadow: '0 0 6px rgba(168,85,247,0.8)'
                      }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t"
          style={{ background: 'rgba(10,0,20,0.8)', borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              className="flex-1 text-sm px-4 py-3 rounded-xl outline-none transition-all text-white"
              style={{
                background: 'rgba(139,92,246,0.05)',
                border: '1px solid rgba(139,92,246,0.25)',
                caretColor: '#a855f7',
              }}
              placeholder="Ask anything about your documents..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !question.trim()}
              className="px-6 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40 text-white"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                boxShadow: '0 0 20px rgba(139,92,246,0.4)',
              }}>
              {loading ? '...' : 'Send →'}
            </button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: 'rgba(139,92,246,0.3)' }}>
            Press Enter to send
          </p>
        </div>
      </div>
    </div>
  )
}
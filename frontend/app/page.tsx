'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

interface Message {
  role: 'user' | 'assistant'
  content: string
  agent?: string
  score?: number
  timestamp?: string
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
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
    checkBackend()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const checkBackend = async () => {
    try {
      await axios.get(`${API}/health`)
      setBackendStatus('online')
    } catch {
      setBackendStatus('offline')
    }
  }

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
    if (fileRef.current) fileRef.current.value = ''
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
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err: any) {
      alert(`Delete failed: ${err?.response?.data?.detail || err.message}`)
    }
    setDeletingId(null)
  }

  const sendMessage = async () => {
    if (!question.trim() || loading) return
    const q = question
    setQuestion('')
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', content: q, timestamp }])
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/query`, { question: q })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer,
        agent: res.data.agent_used,
        score: res.data.eval_score,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error — is the backend running?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const clearChat = () => {
    if (confirm('Clear chat history?')) setMessages([])
  }

  const agentColor: Record<string, string> = {
    rag: 'bg-green-500/20 text-green-300 border-green-500/30',
    code: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    search: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
    eval: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  }

  const agentIcon: Record<string, string> = {
    rag: '📚', code: '💻', search: '🔍', eval: '⭐',
  }

  const scoreColor = (score: number) =>
    score >= 0.8 ? 'text-green-400' : score >= 0.5 ? 'text-yellow-400' : 'text-red-400'

  const suggestions = [
    "What skills are mentioned in my resume?",
    "What projects have I built?",
    "Calculate compound interest at 8% for 10 years on $10,000",
  ]

  return (
    <div className="flex h-screen text-white font-mono overflow-hidden"
      style={{ background: '#000000' }}>

      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r flex-shrink-0"
        style={{ background: '#020a02', borderColor: 'rgba(0,255,65,0.2)' }}>

        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: 'rgba(0,255,65,0.08)',
                border: '1px solid rgba(0,255,65,0.3)',
              }}>
              🧠
            </div>
            <div>
              <h1 className="font-bold text-lg" style={{ color: '#00ff41' }}>
                DocuMind
              </h1>
              <p className="text-xs" style={{ color: 'rgba(0,255,65,0.4)' }}>
                AI Knowledge Worker
              </p>
            </div>
          </div>
        </div>

        {/* Backend status */}
        <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(0,255,65,0.1)' }}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-green-400' :
              backendStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'}`} />
            <span className="text-xs" style={{ color: 'rgba(0,255,65,0.5)' }}>
              backend {backendStatus}
            </span>
            <button onClick={checkBackend}
              className="ml-auto text-xs" style={{ color: 'rgba(0,255,65,0.3)' }}>
              ↻
            </button>
          </div>
        </div>

        {/* Upload */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50"
            style={{ background: '#00ff41', color: '#000' }}>
            {uploading ? '⏳ Processing...' : '+ Upload Document'}
          </button>
          <input ref={fileRef} type="file" className="hidden"
            onChange={uploadDocument} accept=".pdf,.txt,.docx" />
          <p className="text-xs mt-2 text-center" style={{ color: 'rgba(0,255,65,0.3)' }}>
            PDF · DOCX · TXT
          </p>
        </div>

        {/* Documents */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'rgba(0,255,65,0.5)' }}>
              // docs [{documents.length}]
            </p>
            <button onClick={loadDocuments}
              className="text-xs" style={{ color: 'rgba(0,255,65,0.4)' }}>
              ↻
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-xl"
              style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
              <p className="text-2xl mb-2">📂</p>
              <p className="text-xs" style={{ color: 'rgba(0,255,65,0.3)' }}>no documents</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map(doc => (
                <div key={doc.id}
                  className="rounded-xl p-3 border group"
                  style={{
                    background: 'rgba(0,255,65,0.03)',
                    borderColor: 'rgba(0,255,65,0.15)',
                  }}>
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {doc.filename.endsWith('.pdf') ? '📕' :
                        doc.filename.endsWith('.docx') ? '📘' : '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{doc.filename}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${doc.status === 'ready' ? 'bg-green-400' :
                          doc.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                        <p className={`text-xs ${doc.status === 'ready' ? 'text-green-400' :
                          doc.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {doc.status}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      disabled={deletingId === doc.id}
                      className="opacity-0 group-hover:opacity-100 text-red-400 text-xs px-1.5 py-0.5 rounded flex-shrink-0"
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
        <div className="p-4 border-t" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(0,255,65,0.4)' }}>// agents</p>
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
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b flex-shrink-0"
          style={{ background: '#010801', borderColor: 'rgba(0,255,65,0.15)' }}>
          <div>
            <h2 className="font-bold" style={{ color: '#00ff41' }}>
              &gt; chat
            </h2>
            <p className="text-xs" style={{ color: 'rgba(0,255,65,0.4)' }}>
              {messages.length} messages · {documents.filter(d => d.status === 'ready').length} docs ready
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: 'rgba(0,255,65,0.5)', border: '1px solid rgba(0,255,65,0.15)' }}>
              clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                style={{
                  background: 'rgba(0,255,65,0.05)',
                  border: '1px solid rgba(0,255,65,0.2)',
                }}>
                🧠
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ color: '#00ff41' }}>
                  &gt; system ready
                </h3>
                <p className="text-sm" style={{ color: 'rgba(0,255,65,0.4)' }}>
                  Upload a document and start asking questions.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-md">
                <p className="text-xs" style={{ color: 'rgba(0,255,65,0.3)' }}>// suggestions</p>
                {suggestions.map(s => (
                  <button key={s} onClick={() => { setQuestion(s); inputRef.current?.focus() }}
                    className="text-sm text-left px-4 py-2.5 rounded-xl border"
                    style={{
                      color: 'rgba(0,255,65,0.7)',
                      background: 'rgba(0,255,65,0.03)',
                      borderColor: 'rgba(0,255,65,0.15)',
                    }}>
                    $ {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                  style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)' }}>
                  🧠
                </div>
              )}
              <div className="max-w-2xl flex flex-col gap-1.5">
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                  style={msg.role === 'user'
                    ? { background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.25)', color: '#00ff41' }
                    : { background: '#010d01', border: '1px solid rgba(0,255,65,0.12)', color: '#d1fae5' }}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className="flex items-center gap-2 px-1">
                  {msg.timestamp && (
                    <span className="text-xs" style={{ color: 'rgba(0,255,65,0.2)' }}>
                      {msg.timestamp}
                    </span>
                  )}
                  {msg.agent && (
                    <>
                      <span style={{ color: 'rgba(0,255,65,0.2)' }}>·</span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg border ${agentColor[msg.agent] || agentColor.rag} flex items-center gap-1`}>
                        {agentIcon[msg.agent]} {msg.agent}
                      </span>
                      {msg.score !== undefined && (
                        <span className={`text-xs ${scoreColor(msg.score)}`}>
                          {msg.score >= 0.8 ? '✓' : '~'} {Math.round(msg.score * 100)}%
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                  style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.2)' }}>
                  👤
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)' }}>
                🧠
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3"
                style={{ background: '#010d01', border: '1px solid rgba(0,255,65,0.12)' }}>
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 200, 400].map(delay => (
                    <div key={delay} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: '#00ff41', animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0"
          style={{ background: '#010801', borderColor: 'rgba(0,255,65,0.15)' }}>
          <div className="flex gap-3 max-w-4xl mx-auto">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-4 border"
              style={{ background: 'rgba(0,255,65,0.03)', borderColor: 'rgba(0,255,65,0.2)' }}>
              <span className="text-xs flex-shrink-0" style={{ color: 'rgba(0,255,65,0.4)' }}>$</span>
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm py-3 outline-none"
                style={{ color: '#00ff41', caretColor: '#00ff41' }}
                placeholder="ask anything..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !question.trim()}
              className="px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-30"
              style={{ background: '#00ff41', color: '#000' }}>
              {loading ? '...' : 'RUN →'}
            </button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: 'rgba(0,255,65,0.2)' }}>
            press enter to run
          </p>
        </div>
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,255,65,0.2); border-radius: 2px; }
        ::placeholder { color: rgba(0,255,65,0.2) !important; }
      `}</style>
    </div>
  )
}
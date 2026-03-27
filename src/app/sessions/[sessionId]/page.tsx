"use client"
import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { SERVER_URL, WORKSPACE_DIR } from "@/lib/constants"

// ---- Types ----------------------------------------------------------------

interface HistoryPart {
  type: string
  text?: string
  id: string
}

interface HistoryMessage {
  info: { role: "user" | "assistant"; id: string }
  parts: HistoryPart[]
}

interface DisplayMessage {
  id: string
  role: "user" | "assistant"
  text: string
  /** true while this assistant message is still streaming */
  streaming?: boolean
}

// ---- helpers ---------------------------------------------------------------

function historyToDisplay(messages: HistoryMessage[]): DisplayMessage[] {
  const result: DisplayMessage[] = []
  for (const msg of messages) {
    const textParts = msg.parts.filter((p) => p.type === "text" && p.text)
    if (textParts.length === 0) continue
    result.push({
      id: msg.info.id,
      role: msg.info.role,
      text: textParts.map((p) => p.text).join(""),
    })
  }
  return result
}

// ---- Component ------------------------------------------------------------

export default function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  // partID -> accumulated delta text for the in-flight assistant message
  const streamBuffer = useRef<Record<string, string>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  // Resolve async params
  useEffect(() => {
    params.then((p) => setSessionId(p.sessionId))
  }, [params])

  // Load history on mount
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/sessions/${sessionId}/messages`)
      .then((r) => r.json())
      .then((data: HistoryMessage[]) => {
        setMessages(historyToDisplay(data))
      })
      .catch(console.error)
  }, [sessionId])

  // SSE subscription
  useEffect(() => {
    if (!sessionId) return
    const url = `${SERVER_URL}/event?directory=${encodeURIComponent(WORKSPACE_DIR)}`
    const es = new EventSource(url)

    es.onmessage = (e) => {
      const event = JSON.parse(e.data)

      // Incremental text delta
      if (event.type === "message.part.delta") {
        const { sessionID, partID, field, delta } = event.properties
        if (sessionID !== sessionId || field !== "text") return

        streamBuffer.current[partID] = (streamBuffer.current[partID] ?? "") + delta

        const fullText = Object.values(streamBuffer.current).join("")
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: fullText },
            ]
          }
          return [
            ...prev,
            { id: `stream-${Date.now()}`, role: "assistant", text: fullText, streaming: true },
          ]
        })
      }

      // Agent finished
      if (event.type === "session.idle") {
        if (event.properties.sessionID !== sessionId) return
        streamBuffer.current = {}
        setIsStreaming(false)
        setMessages((prev) =>
          prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
        )
      }
    }

    es.onerror = () => console.error("[SSE] connection error")
    return () => es.close()
  }, [sessionId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isStreaming) return
    const text = input.trim()
    setInput("")
    setIsStreaming(true)
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", text },
    ])

    try {
      await fetch(`/api/sessions/${sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
    } catch (err) {
      console.error("Prompt error:", err)
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-800 text-xs text-gray-500 font-mono truncate">
        {sessionId ?? "loading…"}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <p className="text-gray-500 text-sm">Send a message to start.</p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-2xl rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-blue-900 text-blue-100"
                  : "bg-gray-800 text-gray-100"
              } ${msg.streaming ? "opacity-90" : ""}`}
            >
              {msg.role === "user" ? (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-3 text-sm bg-gray-800 text-gray-400">
              thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex gap-3 items-end">
          <textarea
            className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder="Ask something… (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

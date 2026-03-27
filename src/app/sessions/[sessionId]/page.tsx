"use client"
import { useState, useEffect, useRef } from "react"
import { SERVER_URL, WORKSPACE_DIR } from "@/lib/constants"

interface UserMessage {
  role: "user"
  text: string
}

interface AssistantMessage {
  role: "assistant"
  // partID -> accumulated text
  parts: Record<string, string>
}

type ChatMessage = UserMessage | AssistantMessage

export default function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Resolve async params
  useEffect(() => {
    params.then((p) => setSessionId(p.sessionId))
  }, [params])

  // SSE subscription
  useEffect(() => {
    if (!sessionId) return
    const url = `${SERVER_URL}/event?directory=${encodeURIComponent(WORKSPACE_DIR)}`
    const es = new EventSource(url)

    es.onmessage = (e) => {
      const event = JSON.parse(e.data)

      // Incremental text delta — accumulate per partID
      if (event.type === "message.part.delta") {
        const { sessionID, partID, field, delta } = event.properties
        if (sessionID !== sessionId || field !== "text") return

        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              {
                role: "assistant",
                parts: {
                  ...(last as AssistantMessage).parts,
                  [partID]: ((last as AssistantMessage).parts[partID] ?? "") + delta,
                },
              },
            ]
          }
          return [...prev, { role: "assistant", parts: { [partID]: delta } }]
        })
      }

      // Agent finished
      if (event.type === "session.idle") {
        if (event.properties.sessionID === sessionId) {
          setIsStreaming(false)
        }
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
    setMessages((prev) => [...prev, { role: "user", text }])

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
      <div className="px-6 py-3 border-b border-gray-800 text-xs text-gray-500 font-mono">
        {sessionId ?? "loading…"}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm">Send a message to start.</p>
        )}
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-2xl rounded-lg px-4 py-3 text-sm bg-blue-900 text-blue-100 whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            )
          }
          const fullText = Object.values(msg.parts).join("")
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-2xl rounded-lg px-4 py-3 text-sm bg-gray-800 text-gray-100 whitespace-pre-wrap">
                {fullText || <span className="text-gray-500">…</span>}
              </div>
            </div>
          )
        })}
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

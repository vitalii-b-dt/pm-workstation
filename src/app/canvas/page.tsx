"use client"
import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"

// Group files by top-level directory
function groupFiles(files: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const f of files) {
    const parts = f.split("/")
    const group = parts.length > 1 ? parts[0] : "(root)"
    if (!groups[group]) groups[group] = []
    groups[group].push(f)
  }
  return groups
}

export default function CanvasPage() {
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/workspace/files")
      .then((r) => r.json())
      .then((data: string[]) => {
        setFiles(data)
        // Auto-expand first group
        const groups = groupFiles(data)
        const firstGroup = Object.keys(groups)[0]
        if (firstGroup) setExpandedGroups(new Set([firstGroup]))
      })
      .catch(console.error)
  }, [])

  const openFile = async (path: string) => {
    setSelectedFile(path)
    setLoading(true)
    setContent(null)
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      setContent(data.content ?? data.error)
    } catch {
      setContent("Failed to load file.")
    } finally {
      setLoading(false)
    }
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const groups = groupFiles(files)

  return (
    <div className="flex h-screen">
      {/* File tree */}
      <div className="w-56 flex-shrink-0 border-r border-gray-800 overflow-y-auto py-3">
        <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Workspace Files
        </div>
        {Object.entries(groups).map(([group, groupFiles]) => (
          <div key={group} className="mb-1">
            <button
              onClick={() => toggleGroup(group)}
              className="w-full text-left px-3 py-1 text-xs font-medium text-gray-400 hover:text-gray-200 flex items-center gap-1"
            >
              <span>{expandedGroups.has(group) ? "▾" : "▸"}</span>
              {group}
            </button>
            {expandedGroups.has(group) && (
              <ul>
                {groupFiles.map((f) => {
                  const name = f.split("/").pop()?.replace(".md", "") ?? f
                  return (
                    <li key={f}>
                      <button
                        onClick={() => openFile(f)}
                        className={`w-full text-left px-5 py-1 text-xs truncate ${
                          selectedFile === f
                            ? "text-blue-400 bg-gray-800"
                            : "text-gray-300 hover:text-white hover:bg-gray-800"
                        }`}
                      >
                        {name}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Preview pane */}
      <div className="flex-1 overflow-y-auto">
        {!selectedFile && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Select a file to preview
          </div>
        )}
        {selectedFile && (
          <div className="px-8 py-6">
            <div className="text-xs text-gray-500 font-mono mb-4">{selectedFile}</div>
            {loading ? (
              <div className="text-gray-400 text-sm">Loading…</div>
            ) : (
              <article className="prose prose-invert prose-sm max-w-3xl">
                <ReactMarkdown>{content ?? ""}</ReactMarkdown>
              </article>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

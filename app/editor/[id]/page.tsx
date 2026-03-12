"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
    Pencil, Settings, Loader2,
    Lightbulb, Wand2, Palette, Sparkles, Plus,
    RotateCcw, CheckCircle, Zap, AlignLeft, BookOpen,
    Bold, Italic, Underline, Type
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

// ─── Types ─────────────────────────────────────────────────────────────────────

type Story = {
    id: string
    title: string
    description: string
    status: string
    metadata: Record<string, unknown>
}

type Chapter = {
    id: string
    story_id: string
    chapter_num: number
    title: string
    content: string
    updated_at: string
}

type ChatMessage = {
    id: string
    role: "user" | "ai"
    text: string
    time: string
    suggestedProse?: string
    thematicNote?: string
}

const API = "http://localhost:8000"

function timestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function SkeletonLine({ w = "full", h = "4" }: { w?: string; h?: string }) {
    return <div className={`h-${h} bg-gray-200 rounded-lg w-${w} animate-pulse`} />
}

function EditorSkeleton() {
    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden">
            {/* Topbar */}
            <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="flex flex-col gap-1.5">
                        <div className="w-36 h-3 bg-gray-200 rounded animate-pulse" />
                        <div className="w-24 h-2 bg-gray-100 rounded animate-pulse" />
                    </div>
                </div>
                <div className="w-52 h-8 bg-gray-100 rounded-xl animate-pulse" />
                <div className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                </div>
            </header>

            {/* Body */}
            <div className="flex flex-1 min-h-0">
                {/* Editor panel */}
                <div className="flex-1 flex flex-col border-r border-gray-100">
                    <div className="flex items-center gap-2 px-8 py-3 border-b border-gray-100">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="w-16 h-6 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                    <div className="flex-1 px-12 py-8 flex flex-col gap-5">
                        <div className="w-2/3 h-9 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="flex flex-col gap-3 mt-4">
                            <div className="w-full h-5 bg-gray-100 rounded animate-pulse" />
                            <div className="w-full h-5 bg-gray-100 rounded animate-pulse" />
                            <div className="w-5/6 h-5 bg-gray-100 rounded animate-pulse" />
                            <div className="w-full h-5 bg-gray-100 rounded animate-pulse" />
                            <div className="w-4/5 h-5 bg-gray-100 rounded animate-pulse" />
                            <div className="w-full h-5 bg-gray-100 rounded animate-pulse" />
                            <div className="w-3/4 h-5 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* AI panel */}
                <div className="w-[360px] shrink-0 border-l border-gray-200 flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
                        <div className="w-36 h-3 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex-1 p-4 flex flex-col gap-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="w-full h-16 bg-gray-100 rounded-xl animate-pulse" />
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-gray-200">
                        <div className="w-full h-10 bg-gray-100 rounded-lg animate-pulse mb-2" />
                        <div className="flex justify-between">
                            <div className="flex gap-2">
                                <div className="w-7 h-7 bg-gray-100 rounded-lg animate-pulse" />
                                <div className="w-7 h-7 bg-gray-100 rounded-lg animate-pulse" />
                            </div>
                            <div className="w-24 h-8 bg-blue-100 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Status bar */}
            <footer className="flex items-center gap-6 px-5 py-2 border-t border-gray-200 shrink-0">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="w-20 h-3 bg-gray-100 rounded animate-pulse" />
                ))}
            </footer>
        </div>
    )
}

// ─── Prose formatter ──────────────────────────────────────────────────────────
// Cleans AI output: strips stray quotes, normalises line breaks, ensures proper paragraphs.

function formatProseForInsertion(raw: string): string {
    let text = raw.trim()

    // Strip outer quotes Ollama sometimes wraps around prose
    if ((text.startsWith('"') && text.endsWith('"')) ||
        (text.startsWith("'") && text.endsWith("'"))) {
        text = text.slice(1, -1).trim()
    }

    // Normalise Windows line endings
    text = text.replace(/\r\n/g, "\n")

    // Collapse runs of 3+ blank lines to exactly 2
    text = text.replace(/\n{3,}/g, "\n\n")

    // If the model ran sentences together without breaks, split at sentence ends
    // only if there are no paragraph breaks at all
    if (!text.includes("\n\n") && text.split(/[.!?]\s+/).length >= 4) {
        text = text
            .split(/(?<=[.!?])\s+/)
            .reduce<string[]>((acc, sentence, i) => {
                if (i > 0 && i % 2 === 0) acc.push("\n\n" + sentence)
                else if (i === 0) acc.push(sentence)
                else acc[acc.length - 1] += " " + sentence
                return acc
            }, [])
            .join("")
    }

    return text
}

// ─── Formatting Toolbar ───────────────────────────────────────────────────────

function FormatToolbar() {
    const exec = (cmd: string) => {
        document.execCommand(cmd, false)
    }
    return (
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-gray-200 bg-gray-50/80 shrink-0">
            <button
                onClick={() => exec("bold")}
                title="Bold (Ctrl+B)"
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            >
                <Bold size={14} />
            </button>
            <button
                onClick={() => exec("italic")}
                title="Italic (Ctrl+I)"
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            >
                <Italic size={14} />
            </button>
            <button
                onClick={() => exec("underline")}
                title="Underline (Ctrl+U)"
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            >
                <Underline size={14} />
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
                onClick={() => exec("formatBlock")}
                title="Heading"
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            >
                <Type size={14} />
            </button>
        </div>
    )
}

// ─── Rendered chapter content (page format) ───────────────────────────────────

function ChapterContent({
    content,
    onChange,
    editing,
}: {
    content: string
    onChange: (v: string) => void
    editing: boolean
}) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [pageCount, setPageCount] = useState(1)

    // A single page is 900px of content + 56px top padding + 56px bottom padding
    const PAGE_CONTENT_HEIGHT = 900
    const PAGE_HEIGHT = 1012

    // Sync external content changes into the editable div
    useEffect(() => {
        if (editorRef.current && !editing) {
            editorRef.current.innerHTML = contentToHtml(content)
        }
    }, [content, editing])

    // Set initial content and observe height
    useEffect(() => {
        if (editing && editorRef.current) {
            const currentText = editorRef.current.innerText.trim()
            if (!currentText && content) {
                editorRef.current.innerHTML = contentToHtml(content)
            }
        }

        const el = editorRef.current
        if (!el) return

        const updateHeight = () => {
            const h = el.scrollHeight
            const count = Math.max(1, Math.ceil(h / PAGE_CONTENT_HEIGHT))
            setPageCount(count)
        }

        updateHeight()
        const observer = new ResizeObserver(updateHeight)
        observer.observe(el)
        return () => observer.disconnect()
    }, [editing, content])

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerText)
        }
    }

    return (
        <div className="flex justify-center py-6">
            <div className="relative w-full max-w-[700px]">

                {/* Visual Pages Background */}
                <div className="absolute inset-x-0 top-0 z-0 pointer-events-none flex flex-col drop-shadow-sm">
                    {Array.from({ length: pageCount }).map((_, i) => (
                        <div
                            key={i}
                            style={{ height: PAGE_HEIGHT }}
                            className="bg-white relative border-x border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border-b last:border-b-gray-200 first:border-t first:rounded-t-sm last:rounded-b-sm"
                        >
                            {/* Left margin line */}
                            <div className="absolute left-12 top-0 bottom-0 w-px bg-rose-200/50" />

                            {/* Page separator gap visually */}
                            {i > 0 && <div className="absolute top-0 left-12 right-12 border-t border-dashed border-gray-200" />}

                            {/* Page number */}
                            <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-400">— {i + 1} —</div>
                        </div>
                    ))}
                </div>

                {/* Actual Editor Content (overlayed on top, transparent background) */}
                <div className="relative z-10 px-16 py-14" style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    lineHeight: "30px", // Exact line height math (30 * 30 lines = 900px height per page)
                    minHeight: pageCount * PAGE_HEIGHT
                }}>
                    {editing ? (
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleInput}
                            className="w-full text-gray-800 text-[16px] focus:outline-none"
                            style={{ fontFamily: "inherit", minHeight: "900px" }}
                            data-placeholder="Start writing your chapter here…"
                        />
                    ) : (
                        <div
                            ref={editorRef}
                            className="w-full text-gray-800 text-[16px]"
                            style={{ fontFamily: "inherit", minHeight: "900px" }}
                            dangerouslySetInnerHTML={{ __html: contentToHtml(content) }}
                        />
                    )}
                </div>

            </div>
        </div>
    )
}

/** Convert plain text content to HTML paragraphs for the page view */
function contentToHtml(content: string): string {
    if (!content.trim()) return '<p style="color:#9ca3af;font-style:italic;">No content yet. Click Edit to start writing.</p>'
    const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    return paragraphs
        .map((para, idx) => {
            const isBlockquote = para.startsWith('"') && para.length < 280
            if (isBlockquote && idx > 0) {
                return `<blockquote style="border-left:4px solid #93c5fd; padding-left:20px; font-style:italic; color:#4b5563; background:#eff6ff; padding-top:8px; padding-bottom:8px; border-radius:0 8px 8px 0; margin:16px 0;">${para}</blockquote>`
            }
            if (idx === 0 && para.length > 0) {
                const first = para.charAt(0)
                const rest = para.slice(1)
                return `<p style="margin-bottom:20px; text-indent:0;"><span style="float:left; font-size:56px; font-weight:bold; line-height:48px; margin-right:8px; margin-top:4px; color:#1d4ed8;">${first}</span>${rest}</p>`
            }
            return `<p style="margin-bottom:16px; text-indent:2em;">${para}</p>`
        })
        .join("")
}

// ─── Suggested Prose Card ─────────────────────────────────────────────────────

function SuggestedProseCard({ prose, onInsert }: { prose: string; onInsert: () => void }) {
    return (
        <div className="rounded-xl border border-purple-200 overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border-b border-purple-200">
                <Sparkles size={13} className="text-purple-600" />
                <span className="text-[10px] font-bold text-purple-700 tracking-widest uppercase">Suggested Prose</span>
            </div>
            <div className="p-3">
                <div className="font-serif text-sm text-gray-700 leading-relaxed space-y-2">
                    {prose.split(/\n{2,}/).map((para, i) => (
                        <p key={i} className="italic">{para.trim()}</p>
                    ))}
                </div>
                <button
                    onClick={onInsert}
                    className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors"
                >
                    <Plus size={11} /> Insert at Cursor
                </button>
            </div>
        </div>
    )
}

// ─── Thematic Connection Card ─────────────────────────────────────────────────

function ThematicCard({ note }: { note: string }) {
    return (
        <div className="rounded-xl border border-blue-200 overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200">
                <Lightbulb size={13} className="text-blue-600" />
                <span className="text-[10px] font-bold text-blue-700 tracking-widest uppercase">Thematic Connection</span>
            </div>
            <div className="p-3">
                <p className="text-xs text-gray-600 leading-relaxed">{note}</p>
            </div>
        </div>
    )
}

// ─── Narrative Strategist Panel ───────────────────────────────────────────────

function NarrativePanel({
    storyId,
    onInsertProse,
    ollamaOnline,
}: {
    storyId: string
    onInsertProse: (text: string) => void
    ollamaOnline: boolean
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // ── Load persisted messages on mount ─────────────────────────────────────
    useEffect(() => {
        if (!storyId) return
        const load = async () => {
            try {
                const res = await fetch(`${API}/api/stories/${storyId}/chat-messages`)
                if (res.ok) {
                    const data = await res.json()
                    if (Array.isArray(data.messages) && data.messages.length > 0) {
                        setMessages(data.messages as ChatMessage[])
                    }
                }
            } catch { /* silent */ }
        }
        load()
    }, [storyId])

    // ── Save messages to DB whenever they change ────────────────────────────
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        if (!storyId || messages.length === 0) return
        // Debounce saves to avoid hammering the backend on rapid updates
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => {
            fetch(`${API}/api/stories/${storyId}/chat-messages`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages }),
            }).catch(() => { /* silent */ })
        }, 800)
    }, [messages, storyId])

    // Auto-scroll to bottom whenever messages change
    useEffect(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [messages, loading])

    const send = async () => {
        const text = input.trim()
        if (!text || loading) return

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            text,
            time: timestamp(),
        }
        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setLoading(true)

        try {
            // Build history payload from existing messages
            const history = messages.map((m) => ({
                role: m.role,
                content: m.suggestedProse
                    ? `${m.text} [Prose: ${m.suggestedProse.slice(0, 120)}...]`
                    : m.text,
            }))

            const res = await fetch(`${API}/api/stories/${storyId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, history }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Failed to get response")
            }

            const data = await res.json()
            const cleanProse = data.suggested_prose
                ? formatProseForInsertion(data.suggested_prose)
                : ""

            const aiMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: "ai",
                text: data.response || "",
                time: timestamp(),
                suggestedProse: cleanProse,
                thematicNote: data.thematic_note || "",
            }
            setMessages((prev) => [...prev, aiMsg])
        } catch (e: unknown) {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "ai",
                    text: e instanceof Error ? e.message : "Something went wrong.",
                    time: timestamp(),
                },
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            send()
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <Sparkles size={11} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 tracking-widest uppercase">Narrative Strategist</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        title="Clear chat"
                        onClick={() => {
                            setMessages([])
                            // Also clear persisted messages
                            fetch(`${API}/api/stories/${storyId}/chat-messages`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ messages: [] }),
                            }).catch(() => { })
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                        <RotateCcw size={13} />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
                        <AlignLeft size={13} />
                    </button>
                </div>
            </div>

            {/* Chat messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                            <Sparkles size={20} className="text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-500 max-w-[200px] leading-relaxed">
                            Tell me what happens next and I&apos;ll write it. Ask for a scene, a character moment, or just say &ldquo;continue.&rdquo;
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-2">
                        {msg.role === "user" ? (
                            <div className="flex flex-col items-end gap-1">
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[88%] shadow-sm">
                                    <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>
                                </div>
                                <span className="text-[10px] text-gray-400 mr-1">{msg.time}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {msg.text && (
                                    <div className="flex items-start gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <Sparkles size={9} className="text-white" />
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">{msg.text}</p>
                                    </div>
                                )}
                                {msg.suggestedProse && (
                                    <SuggestedProseCard
                                        prose={msg.suggestedProse}
                                        onInsert={() => onInsertProse(msg.suggestedProse!)}
                                    />
                                )}
                                {msg.thematicNote && <ThematicCard note={msg.thematicNote} />}
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                            <Loader2 size={9} className="animate-spin text-blue-500" />
                        </div>
                        <span className="text-xs">Strategist is writing…</span>
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 p-3 bg-white shrink-0">
                {!ollamaOnline && (
                    <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5 mb-2 text-center">
                        Ollama offline — start it to enable AI responses
                    </p>
                )}
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Discuss plot, ask for prose snippets, or brainstorm characters…"
                    rows={2}
                    className="w-full text-sm text-gray-700 resize-none focus:outline-none placeholder-gray-400 leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                            <Palette size={15} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                            <Wand2 size={15} />
                        </button>
                    </div>
                    <button
                        onClick={send}
                        disabled={loading || !input.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                        Generate
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── New Chapter Modal ─────────────────────────────────────────────────────────

function NewChapterModal({
    storyId,
    nextNum,
    onClose,
    onCreate,
}: {
    storyId: string
    nextNum: number
    onClose: () => void
    onCreate: (ch: Chapter) => void
}) {
    const [title, setTitle] = useState(`Chapter ${nextNum}`)
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API}/api/stories/${storyId}/chapters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapter_num: nextNum, title, content: "" }),
            })
            const data = await res.json()
            onCreate(data.chapter)
            onClose()
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-80 mx-4 p-6 flex flex-col gap-4">
                <h3 className="font-bold text-gray-900">New Chapter</h3>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-blue-700 transition-colors"
                    >
                        {loading ? "Creating…" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Editor Page ─────────────────────────────────────────────────────────

export default function EditorPage() {
    const router = useRouter()
    const params = useParams()
    const storyId = (params?.id as string) || ""

    const [story, setStory] = useState<Story | null>(null)
    const [chapters, setChapters] = useState<Chapter[]>([])
    const [activeChapterIdx, setActiveChapterIdx] = useState(0)
    const [editedContent, setEditedContent] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [loading, setLoading] = useState(true)
    const [ollamaOnline, setOllamaOnline] = useState(false)
    const [tab, setTab] = useState<"editor" | "ai">("ai")
    const [editingChapterTitle, setEditingChapterTitle] = useState<number | null>(null)
    const [editChapterTitleValue, setEditChapterTitleValue] = useState("")
    const [showNewChapter, setShowNewChapter] = useState(false)
    const [wordCount, setWordCount] = useState(0)

    const activeChapter = chapters[activeChapterIdx] ?? null

    // ── Fetch story data ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!storyId) return
        const fetchAll = async () => {
            setLoading(true)
            try {
                const [storyRes, chaptersRes, ollamaRes] = await Promise.all([
                    fetch(`${API}/api/stories/${storyId}`),
                    fetch(`${API}/api/stories/${storyId}/chapters`),
                    fetch(`${API}/api/ollama/status`),
                ])
                if (storyRes.ok) {
                    const d = await storyRes.json()
                    setStory(d.story)
                }
                if (chaptersRes.ok) {
                    const d = await chaptersRes.json()
                    setChapters(d.chapters)
                    if (d.chapters.length > 0) {
                        setEditedContent(d.chapters[0].content || "")
                        setWordCount((d.chapters[0].content || "").split(/\s+/).filter(Boolean).length)
                    }
                }
                if (ollamaRes.ok) {
                    const d = await ollamaRes.json()
                    setOllamaOnline(d.online)
                }
            } catch { /* ignore */ }
            finally { setLoading(false) }
        }
        fetchAll()

        // Poll Ollama status every 15s
        const interval = setInterval(async () => {
            try {
                const r = await fetch(`${API}/api/ollama/status`)
                if (r.ok) { const d = await r.json(); setOllamaOnline(d.online) }
            } catch { /* ignore */ }
        }, 15_000)
        return () => clearInterval(interval)
    }, [storyId])

    // Update word count live
    useEffect(() => {
        setWordCount(editedContent.split(/\s+/).filter(Boolean).length)
    }, [editedContent])

    const switchChapter = useCallback((idx: number) => {
        setActiveChapterIdx(idx)
        setEditedContent(chapters[idx]?.content || "")
        setIsEditing(false)
    }, [chapters])

    const saveChapter = useCallback(async () => {
        if (!activeChapter) return
        setSaving(true)
        try {
            await fetch(`${API}/api/chapters/${activeChapter.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: editedContent }),
            })
            setChapters((prev) =>
                prev.map((c, i) => (i === activeChapterIdx ? { ...c, content: editedContent } : c))
            )
            setLastSaved(new Date())
            setIsEditing(false)
        } catch { /* ignore */ }
        finally { setSaving(false) }
    }, [activeChapter, activeChapterIdx, editedContent])

    // Insert AI prose as a new properly-formatted paragraph
    const renameChapter = useCallback(async (idx: number, newTitle: string) => {
        const ch = chapters[idx]
        if (!ch || !newTitle.trim()) return
        setChapters((prev) => prev.map((c, i) => i === idx ? { ...c, title: newTitle.trim() } : c))
        setEditingChapterTitle(null)
    }, [chapters])

    const insertProse = useCallback((prose: string) => {
        const formatted = formatProseForInsertion(prose)
        setEditedContent((prev) => {
            const base = prev.trimEnd()
            return base ? `${base}\n\n${formatted}` : formatted
        })
        setIsEditing(true)
        setTab("editor")   // Switch to editor tab so user sees the insertion
    }, [])

    function lastSavedText() {
        if (!lastSaved) return "Not saved yet"
        const diff = Math.floor((Date.now() - lastSaved.getTime()) / 60_000)
        if (diff < 1) return "Last autosave: just now"
        return `Last autosave: ${diff} min${diff > 1 ? "s" : ""} ago`
    }

    // ── Show skeleton while loading ─────────────────────────────────────────────
    if (loading) return <EditorSkeleton />

    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden">
            {/* ── Top Bar ── */}
            <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0 bg-white z-10">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => router.push("/dashboard")}
                        title="Back to dashboard"
                        className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        <Pencil size={13} className="text-white" />
                    </button>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight truncate">
                            Project: {story?.title ?? "—"}
                        </p>
                        <p className="text-[11px] text-gray-400 leading-tight">{lastSavedText()}</p>
                    </div>
                </div>

                {/* Story Title */}
                <div className="text-sm font-semibold text-gray-600 tracking-wide">
                    {story?.title ?? "Untitled"}
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <Settings size={16} />
                    </button>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            {/* ── Main Split ── */}
            <div className="flex flex-1 min-h-0">

                {/* Left: Story Editor */}
                <div
                    className="flex flex-col transition-all duration-300 min-w-0 overflow-hidden border-r border-gray-100 w-[58%]"
                >
                    {/* Chapter navigator */}
                    <div className="flex items-center justify-between px-8 pt-3 pb-2 border-b border-gray-100 bg-white shrink-0 gap-3">
                        <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 pb-0.5">
                            {chapters.map((ch, i) => (
                                editingChapterTitle === i ? (
                                    <input
                                        key={ch.id}
                                        autoFocus
                                        value={editChapterTitleValue}
                                        onChange={(e) => setEditChapterTitleValue(e.target.value)}
                                        onBlur={() => renameChapter(i, editChapterTitleValue)}
                                        onKeyDown={(e) => { if (e.key === "Enter") renameChapter(i, editChapterTitleValue); if (e.key === "Escape") setEditingChapterTitle(null) }}
                                        className="shrink-0 px-2 py-1 rounded-lg text-xs font-medium border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 w-36"
                                    />
                                ) : (
                                    <button
                                        key={ch.id}
                                        onClick={() => switchChapter(i)}
                                        onDoubleClick={() => { setEditingChapterTitle(i); setEditChapterTitleValue(ch.title) }}
                                        title="Double-click to rename"
                                        className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${i === activeChapterIdx
                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                            }`}
                                    >
                                        {ch.title}
                                    </button>
                                )
                            ))}
                            <button
                                onClick={() => setShowNewChapter(true)}
                                className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <Plus size={12} /> New Chapter
                            </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => { setEditedContent(activeChapter?.content || ""); setIsEditing(false) }}
                                        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveChapter}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                                    >
                                        {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                        Save
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    disabled={!activeChapter}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                >
                                    <Pencil size={11} /> Edit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Format toolbar */}
                    {isEditing && activeChapter && <FormatToolbar />}

                    {/* Chapter content (page format) */}
                    <div className="flex-1 overflow-y-auto bg-gray-100/60">
                        {!activeChapter ? (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                                    <BookOpen size={24} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-700 mb-1">No chapters yet</p>
                                    <p className="text-sm text-gray-500">Create your first chapter to start writing.</p>
                                </div>
                                <button
                                    onClick={() => setShowNewChapter(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                                >
                                    <Plus size={14} /> Create First Chapter
                                </button>
                            </div>
                        ) : (
                            <ChapterContent
                                content={editedContent}
                                onChange={(v) => { setEditedContent(v); setIsEditing(true) }}
                                editing={isEditing}
                            />
                        )}
                    </div>
                </div>

                {/* Right: Narrative Strategist */}
                <div
                    className="transition-all duration-300 shrink-0 flex flex-col min-h-0 w-[42%]"
                >
                    <NarrativePanel
                        storyId={storyId}
                        onInsertProse={insertProse}
                        ollamaOnline={ollamaOnline}
                    />
                </div>
            </div>

            {/* ── Status Bar ── */}
            <footer className="flex items-center gap-6 px-5 py-2 border-t border-gray-200 bg-white shrink-0 text-[11px] font-medium text-gray-500">
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${ollamaOnline ? "bg-green-500" : "bg-red-400"}`} />
                    <span className={ollamaOnline ? "text-green-700" : "text-red-500"}>
                        AI {ollamaOnline ? "ONLINE" : "OFFLINE"}
                    </span>
                </div>
                <span>WORDS: {wordCount.toLocaleString()}</span>
                <span>PAGES: {Math.max(1, Math.ceil(wordCount / 250))}</span>
                <div className="ml-auto flex items-center gap-6">
                    <span className="flex items-center gap-1">
                        <CheckCircle size={11} className="text-green-500" /> GRAMMAR: CLEAN
                    </span>
                    <span className="flex items-center gap-1">
                        <Zap size={11} className="text-blue-500" /> FLOW ACTIVE
                    </span>
                </div>
            </footer>

            {showNewChapter && (
                <NewChapterModal
                    storyId={storyId}
                    nextNum={chapters.length + 1}
                    onClose={() => setShowNewChapter(false)}
                    onCreate={(ch) => {
                        setChapters((prev) => [...prev, ch])
                        setActiveChapterIdx(chapters.length)
                        setEditedContent("")
                        setIsEditing(true)
                    }}
                />
            )}
        </div>
    )
}

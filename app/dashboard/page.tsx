"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    BookOpen, Share2, Heart, Archive, Bell, Search,
    LayoutGrid, List, Plus, Pencil, BookMarked, Zap,
    HelpCircle, Layers, ChevronRight, MoreHorizontal,
    Loader2, Trash2, X
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

// ─── Types ─────────────────────────────────────────────────────────────────────

type Story = {
    id: string
    title: string
    description: string
    status: "drafting" | "outlining" | "editing"
    created_at: string
    updated_at: string
    metadata: { template?: string }
}

const API = "http://localhost:8000"

// ─── Tension flow sparkline data (deterministic from story id) ───────────────

function getTensionData(seedStr: string) {
    let hash = 0
    for (let i = 0; i < seedStr.length; i++) {
        hash = (hash * 31 + seedStr.charCodeAt(i)) & 0xffffffff
    }
    const r = (n: number) => {
        hash = (hash * 1664525 + 1013904223) & 0xffffffff
        return (Math.abs(hash) % n)
    }
    return Array.from({ length: 8 }, () => 20 + r(60))
}

function Sparkline({ data }: { data: number[] }) {
    const w = 180, h = 48, pad = 4
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => [
        pad + (i / (data.length - 1)) * (w - pad * 2),
        h - pad - ((v - min) / range) * (h - pad * 2)
    ])
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")
    return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
            <path d={d} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
    drafting: "DRAFTING",
    outlining: "OUTLINING",
    editing: "EDITING",
}
const STATUS_COLORS: Record<string, string> = {
    drafting: "bg-emerald-100 text-emerald-700",
    outlining: "bg-purple-100 text-purple-700",
    editing: "bg-amber-100 text-amber-700",
}
const STATUS_TENSION: Record<string, string> = {
    drafting: "MID-CLIMAX",
    outlining: "EXPOSITION",
    editing: "RISING ACTION",
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3_600_000)
    const d = Math.floor(h / 24)
    if (d >= 1) return `${d}d ago`
    if (h >= 1) return `${h}h ago`
    return "just now"
}

// ─── Story Card ───────────────────────────────────────────────────────────────

function StoryCard({
    story,
    onEdit,
    onDelete,
}: {
    story: Story
    onEdit: () => void
    onDelete: () => void
}) {
    const tension = getTensionData(story.id)
    const coverColors: Record<string, string> = {
        drafting: "from-teal-200 to-teal-400",
        outlining: "from-slate-300 to-teal-300",
        editing: "from-stone-200 to-stone-300",
    }

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col bg-white hover:shadow-md transition-shadow">
            {/* Cover */}
            <div className={`relative h-36 bg-gradient-to-br ${coverColors[story.status]} flex items-end p-4`}>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[story.status]}`}>
                    {STATUS_LABELS[story.status]}
                </span>
                <button
                    onClick={onDelete}
                    className="absolute top-3 right-3 p-1 rounded-full bg-white/60 hover:bg-white/90 text-gray-500 hover:text-red-500 transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{story.title}</h3>
                    <MoreHorizontal size={16} className="text-gray-400 shrink-0 mt-0.5" />
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{story.description}</p>

                {/* Tension flow */}
                <div className="mt-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-gray-400 tracking-widest uppercase">Tension Flow</span>
                        <span className="text-[10px] font-bold text-blue-600 tracking-widest">{STATUS_TENSION[story.status]}</span>
                    </div>
                    <Sparkline data={tension} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">Edited {timeAgo(story.updated_at)}</span>
                    <button
                        onClick={onEdit}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
                    >
                        Edit <ChevronRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── New Story Modal ──────────────────────────────────────────────────────────

const TEMPLATES = [
    { id: "heros_journey", label: "Hero's Journey", desc: "Classical 12-stage monomyth", icon: <BookMarked size={20} className="text-blue-600" /> },
    { id: "mystery_box", label: "Mystery Box", desc: "Hooks, clues, and reveal management", icon: <HelpCircle size={20} className="text-purple-600" /> },
    { id: "three_act", label: "Three-Act", desc: "Balanced cinematic pacing structure", icon: <Layers size={20} className="text-emerald-600" /> },
    { id: "custom_flow", label: "Custom Flow", desc: "AI generated bespoke plot skeleton", icon: <Zap size={20} className="text-amber-500" /> },
]

function NewStoryModal({
    onClose,
    onCreate,
}: {
    onClose: () => void
    onCreate: (story: Story) => void
}) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [template, setTemplate] = useState("heros_journey")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleCreate = async () => {
        if (!title.trim()) { setError("Please enter a story title."); return }
        setLoading(true)
        setError("")
        try {
            const res = await fetch(`${API}/api/stories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: title.trim(), description: description.trim(), template, status: "drafting" }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Failed to create story")
            }
            const data = await res.json()
            onCreate(data.story)
            onClose()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create story")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="font-bold text-gray-900 text-lg">New Story</h2>
                        <p className="text-sm text-gray-500">Select a framework to bootstrap your story.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-5">
                    {/* Template picker */}
                    <div className="grid grid-cols-2 gap-2">
                        {TEMPLATES.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTemplate(t.id)}
                                className={`flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all ${template === t.id
                                    ? "border-blue-600 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                {t.icon}
                                <div>
                                    <p className="font-semibold text-sm text-gray-900">{t.label}</p>
                                    <p className="text-xs text-gray-500">{t.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Story Title *</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter your story title..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your story premise in a sentence or two..."
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Story"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
    const navItems = [
        { id: "projects", label: "All Projects", icon: <LayoutGrid size={16} /> },
        { id: "bible", label: "Story Bible", icon: <BookOpen size={16} /> },
        { id: "universes", label: "Shared Universes", icon: <Share2 size={16} /> },
    ]
    const libItems = [
        { id: "favorites", label: "Favorites", icon: <Heart size={16} /> },
        { id: "archived", label: "Archived", icon: <Archive size={16} /> },
    ]

    return (
        <aside className="w-52 shrink-0 flex flex-col h-screen border-r border-gray-200 bg-gray-50/70">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-200">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Pencil size={14} className="text-white" />
                </div>
                <span className="font-bold text-gray-900 text-sm tracking-tight">Narratly</span>
            </div>

            <nav className="flex-1 px-3 py-4 flex flex-col gap-6 overflow-y-auto">
                {/* Workspace */}
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase px-2 mb-2">Workspace</p>
                    <div className="flex flex-col gap-0.5">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${active === item.id
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                <span className={active === item.id ? "text-blue-600" : "text-gray-400"}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Library */}
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase px-2 mb-2">Library</p>
                    <div className="flex flex-col gap-0.5">
                        {libItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${active === item.id
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                <span className={active === item.id ? "text-blue-600" : "text-gray-400"}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>
        </aside>
    )
}

// ─── Template Cards ───────────────────────────────────────────────────────────

function TemplateCards({ onSelect }: { onSelect: (t: string) => void }) {
    return (
        <div className="grid grid-cols-4 gap-3">
            {TEMPLATES.map((t) => (
                <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className="flex flex-col gap-3 p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left group"
                >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                        {t.icon}
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-gray-900">{t.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.desc}</p>
                    </div>
                </button>
            ))}
        </div>
    )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <BookOpen size={36} className="text-blue-400" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Your stories begin here</h3>
            <p className="text-gray-500 text-sm max-w-xs mb-6 leading-relaxed">
                Click a framework above or "+ New Project" to create your first story. Your active stories will appear here.
            </p>
            <button
                onClick={onNew}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
                <Plus size={16} /> Start Your First Story
            </button>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
    const router = useRouter()
    const [stories, setStories] = useState<Story[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [search, setSearch] = useState("")
    const [activeSection, setActiveSection] = useState("projects")

    const fetchStories = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch(`${API}/api/stories`)
            if (!res.ok) throw new Error("Failed to fetch stories")
            const data = await res.json()
            setStories(data.stories)
            setError("")
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Could not load stories. Is the backend running?")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchStories() }, [fetchStories])

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this story? This cannot be undone.")) return
        try {
            await fetch(`${API}/api/stories/${id}`, { method: "DELETE" })
            setStories((prev) => prev.filter((s) => s.id !== id))
        } catch {
            alert("Failed to delete story")
        }
    }

    const filtered = stories.filter(
        (s) =>
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.description.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex h-screen bg-white overflow-hidden">
            <Sidebar active={activeSection} onNavigate={(id) => setActiveSection(id)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full max-w-sm pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        />
                    </div>
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors relative">
                        <Bell size={18} />
                    </button>
                    <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10">

                        {activeSection === "projects" && (
                            <>
                                {/* Start Writing */}
                                <section>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h2 className="font-bold text-gray-900 text-xl">Start Writing</h2>
                                            <p className="text-sm text-gray-500 mt-0.5">Select a framework to bootstrap your story.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowModal(true)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 shrink-0"
                                        >
                                            <Plus size={16} /> New Project
                                        </button>
                                    </div>
                                    <TemplateCards onSelect={(t) => { setShowModal(true) }} />
                                </section>

                                {/* Active Stories */}
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="font-bold text-gray-900 text-xl">Active Stories</h2>
                                        {stories.length > 0 && (
                                            <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => setViewMode("grid")}
                                                    className={`p-2 transition-colors ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50"}`}
                                                >
                                                    <LayoutGrid size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setViewMode("list")}
                                                    className={`p-2 transition-colors ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50"}`}
                                                >
                                                    <List size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {loading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 size={28} className="animate-spin text-blue-400" />
                                        </div>
                                    ) : error ? (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                                            <p className="text-red-700 font-semibold text-sm mb-1">Cannot connect to backend</p>
                                            <p className="text-red-500 text-xs">{error}</p>
                                            <p className="text-red-400 text-xs mt-2">Run: <code className="font-mono bg-red-100 px-1 rounded">uvicorn backend.main:app --reload --port 8000</code></p>
                                        </div>
                                    ) : filtered.length === 0 ? (
                                        <EmptyState onNew={() => setShowModal(true)} />
                                    ) : (
                                        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
                                            {filtered.map((story) => (
                                                <StoryCard
                                                    key={story.id}
                                                    story={story}
                                                    onEdit={() => router.push(`/editor/${story.id}`)}
                                                    onDelete={() => handleDelete(story.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {activeSection === "bible" && (
                            <section>
                                <h2 className="font-bold text-gray-900 text-xl mb-2">Story Bible</h2>
                                <p className="text-sm text-gray-500 mb-6">Manage your characters, world-building notes, lore, and reference material in one place.</p>
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                                        <BookOpen size={28} className="text-blue-400" />
                                    </div>
                                    <h3 className="font-bold text-gray-700 mb-1">Coming Soon</h3>
                                    <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                                        The Story Bible will let you track characters, locations, timelines, and world rules across all your stories.
                                    </p>
                                </div>
                            </section>
                        )}

                        {activeSection === "universes" && (
                            <section>
                                <h2 className="font-bold text-gray-900 text-xl mb-2">Shared Universes</h2>
                                <p className="text-sm text-gray-500 mb-6">Connect multiple stories into a single shared universe with linked characters and timelines.</p>
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                                        <Share2 size={28} className="text-purple-400" />
                                    </div>
                                    <h3 className="font-bold text-gray-700 mb-1">Coming Soon</h3>
                                    <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                                        Shared Universes will allow you to link stories, share characters, and maintain continuity across projects.
                                    </p>
                                </div>
                            </section>
                        )}

                        {activeSection === "favorites" && (
                            <section>
                                <h2 className="font-bold text-gray-900 text-xl mb-2">Favorites</h2>
                                <p className="text-sm text-gray-500 mb-6">Quickly access your most important stories.</p>
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                    <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                                        <Heart size={28} className="text-rose-400" />
                                    </div>
                                    <h3 className="font-bold text-gray-700 mb-1">No Favorites Yet</h3>
                                    <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                                        Mark stories as favorites from your Active Stories to find them here quickly.
                                    </p>
                                </div>
                            </section>
                        )}

                        {activeSection === "archived" && (
                            <section>
                                <h2 className="font-bold text-gray-900 text-xl mb-2">Archived</h2>
                                <p className="text-sm text-gray-500 mb-6">Stories you&apos;ve finished or put on hold.</p>
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                                        <Archive size={28} className="text-amber-400" />
                                    </div>
                                    <h3 className="font-bold text-gray-700 mb-1">No Archived Stories</h3>
                                    <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                                        Completed or paused stories will appear here when you archive them.
                                    </p>
                                </div>
                            </section>
                        )}
                    </div>
                </main>
            </div>

            {showModal && (
                <NewStoryModal
                    onClose={() => setShowModal(false)}
                    onCreate={(story) => {
                        setStories((prev) => [story, ...prev])
                        router.push(`/editor/${story.id}`)
                    }}
                />
            )}
        </div>
    )
}

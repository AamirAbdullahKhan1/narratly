import Link from "next/link"
import { Sparkles, BookOpen, PenTool, LayoutTemplate } from "lucide-react"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
            {/* Navbar */}
            <nav className="flex items-center justify-between max-w-6xl mx-auto px-6 py-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <BookOpen size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-gray-900 font-serif">Narratly</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/sign-in" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                        Log in
                    </Link>
                    <Link href="/sign-up" className="text-sm font-bold text-white bg-blue-600 px-5 py-2.5 rounded-full hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-95">
                        Start Writing
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <main className="max-w-6xl mx-auto px-6 pt-24 pb-32 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100/50 mb-8 mx-auto">
                    <Sparkles size={14} className="text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">Introducing the Narrative Strategist</span>
                </div>
                <h1 className="text-5xl sm:text-7xl font-extrabold text-[#111827] tracking-tight leading-[1.1] mb-6 font-serif">
                    Craft your stories with <br className="hidden sm:block" /> the power of AI
                </h1>
                <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Narratly is the ultimate co-writer for novelists and screenwriters. Seamlessly integrate AI suggestions into your chapters while maintaining complete creative control.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/dashboard"
                        className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-full text-base font-bold tracking-wide hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Go to Dashboard &rarr;
                    </Link>
                </div>
            </main>

            {/* Features Grid */}
            <section className="bg-white border-t border-gray-100 py-24">
                <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-3 gap-12">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                            <LayoutTemplate size={28} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-xl">Story Frameworks</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Start with the Hero's Journey, 3-Act Structure, or Mystery Box—or build your custom plot dynamically.
                        </p>
                    </div>
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                            <PenTool size={28} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-xl">Beautiful Editor</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            A distraction-free typography rich editor designed specifically to make writing prose a joy.
                        </p>
                    </div>
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-2">
                            <Sparkles size={28} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-xl">Narrative Strategist</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Your memory-driven AI companion that reads along, tracks themes, and suggests brilliant prose on command.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-50 py-12 border-t border-gray-200">
                <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>© 2024 Narratly Co-Writer</span>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
                        <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}

import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100/60 via-blue-50/50 to-purple-100/60 font-sans p-4">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-[#1e1e48] tracking-tight mb-2">Narratly</h1>
                <p className="text-gray-500 italic">Craft your stories with the power of AI</p>
            </div>

            <div className="w-full max-w-md shadow-2xl shadow-blue-900/5 rounded-3xl overflow-hidden">
                <SignIn
                    appearance={{
                        elements: {
                            rootBox: "w-full",
                            card: "w-full shadow-none border-0 rounded-3xl p-6 sm:p-10",
                            headerTitle: "hidden",
                            headerSubtitle: "hidden",
                            socialButtonsBlockButton: "rounded-xl border border-gray-200 hover:bg-gray-50",
                            dividerLine: "bg-gray-200",
                            dividerText: "text-gray-400 text-xs",
                            formFieldLabel: "text-[11px] font-bold text-gray-600 tracking-widest uppercase",
                            formFieldInput: "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400",
                            formButtonPrimary: "w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-bold tracking-wide shadow-sm shadow-blue-600/20 transition-all",
                            footerActionText: "text-gray-500 text-sm",
                            footerActionLink: "text-blue-600 font-semibold hover:text-blue-700 text-sm",
                            identityPreviewText: "text-gray-700",
                            identityPreviewEditButtonIcon: "text-blue-600",
                        },
                    }}
                    routing="path"
                    path="/sign-in"
                    signUpUrl="/sign-up"
                    forceRedirectUrl="/dashboard"
                />
            </div>

            <footer className="mt-16 text-[10px] font-bold text-gray-400 tracking-widest uppercase flex items-center gap-4">
                <span>© 2024 Narratly Co-Writer</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
            </footer>
        </div>
    )
}

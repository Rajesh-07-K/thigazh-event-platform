"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { Lock, Mail, ArrowRight, AlertCircle, KeyRound } from "lucide-react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please verify your credentials.");
        setLoading(false);
        return;
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string = "Password@123") => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Logo size="lg" showTagline={false} className="justify-center" />
        <h2 className="text-2xl font-display font-bold text-primary">Welcome back</h2>
        <p className="text-xs sm:text-sm text-neutral-500">
          Sign in to manage your tickets, access reservations, or curate events.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-6 sm:px-10 rounded-3xl border border-primary-100 shadow-card space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-800 text-white font-semibold text-sm transition-all shadow-subtle flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In to THIGAZH</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Accounts Quick-Fill Section */}
          <div className="pt-4 border-t border-primary-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <KeyRound className="w-3.5 h-3.5 text-accent" />
              <span>Quick Test Demo Logins:</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount("attendee@thigazh.com")}
                className="p-2 rounded-xl bg-surface hover:bg-primary-100 border border-primary-200/60 text-primary font-medium text-center transition-colors"
              >
                Attendee
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("organizer@thigazh.com")}
                className="p-2 rounded-xl bg-surface hover:bg-primary-100 border border-primary-200/60 text-primary font-medium text-center transition-colors"
              >
                Organizer
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("admin@thigazh.com")}
                className="p-2 rounded-xl bg-surface hover:bg-primary-100 border border-primary-200/60 text-primary font-medium text-center transition-colors"
              >
                Admin
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-neutral-500 pt-2">
            Don't have an account yet?{" "}
            <Link href="/auth/signup" className="text-accent hover:underline font-semibold">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-neutral-500">Loading sign in...</div>}>
      <SignInContent />
    </Suspense>
  );
}

"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { Lock, Mail, User, Building, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "ORGANIZER" ? "ORGANIZER" : "ATTENDEE";

  const [role, setRole] = useState<"ATTENDEE" | "ORGANIZER">(defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (role === "ORGANIZER" && !organizationName.trim()) {
      setError("Please provide your organization or company name.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          organizationName: role === "ORGANIZER" ? organizationName : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      // Success
      if (role === "ORGANIZER") {
        router.push("/organizer");
      } else {
        router.push("/events");
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Logo size="lg" showTagline={false} className="justify-center" />
        <h2 className="text-2xl font-display font-bold text-primary">Join THIGAZH</h2>
        <p className="text-xs sm:text-sm text-neutral-500">
          Create an account to reserve passes, attend gatherings, or host events.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-6 sm:px-10 rounded-3xl border border-primary-100 shadow-card space-y-6">
          {/* Role selector tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-surface rounded-2xl border border-primary-100">
            <button
              type="button"
              onClick={() => setRole("ATTENDEE")}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                role === "ATTENDEE"
                  ? "bg-primary text-white shadow-subtle"
                  : "text-neutral-600 hover:text-primary"
              }`}
            >
              Event Attendee
            </button>
            <button
              type="button"
              onClick={() => setRole("ORGANIZER")}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                role === "ORGANIZER"
                  ? "bg-primary text-white shadow-subtle"
                  : "text-neutral-600 hover:text-primary"
              }`}
            >
              Event Organizer
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meera Raman"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                />
              </div>
            </div>

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
                  placeholder="meera@example.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                />
              </div>
            </div>

            {role === "ORGANIZER" && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Organization / Collective Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. South Heritage Arts Guild"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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
                <span>Creating Account...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-neutral-500 pt-2">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-accent hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-neutral-500">Loading registration...</div>}>
      <SignUpContent />
    </Suspense>
  );
}

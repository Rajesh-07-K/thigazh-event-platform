"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import {
  Compass,
  CalendarPlus,
  Ticket,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  User,
  Menu,
  X,
  Search,
} from "lucide-react";

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "ATTENDEE" | "ORGANIZER" | "ADMIN";
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-primary-100/60 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Logo showTagline={false} size="md" />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/events"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === "/events" ? "text-primary font-semibold" : "text-neutral-600"
                }`}
              >
                Discover Events
              </Link>
              <Link
                href="/tickets/verify"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname.startsWith("/tickets/verify") ? "text-primary font-semibold" : "text-neutral-600"
                }`}
              >
                Verify Ticket
              </Link>
            </nav>
          </div>

          {/* Search Bar - Desktop */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden lg:flex items-center relative w-72"
          >
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search concerts, workshops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-primary-200/50 rounded-full pl-9 pr-4 py-1.5 text-sm text-primary placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </form>

          {/* User Controls - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === "ORGANIZER" && (
                  <Link
                    href="/organizer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-primary hover:bg-surface rounded-xl transition-colors border border-primary-200/60"
                  >
                    <LayoutDashboard className="w-4 h-4 text-accent" />
                    <span>Organizer Hub</span>
                  </Link>
                )}

                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-primary hover:bg-surface rounded-xl transition-colors border border-primary-200/60"
                  >
                    <ShieldCheck className="w-4 h-4 text-gold-600" />
                    <span>Admin</span>
                  </Link>
                )}

                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-primary hover:bg-surface rounded-xl transition-colors"
                >
                  <Ticket className="w-4 h-4 text-neutral-500" />
                  <span>My Tickets</span>
                </Link>

                <div className="h-4 w-px bg-primary-200/80 mx-1" />

                <div className="flex items-center gap-2.5 pl-1">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold text-xs border border-primary-200">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-sm font-medium text-primary hover:text-accent transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary-800 rounded-xl shadow-subtle hover:shadow-card transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-600 hover:text-primary rounded-lg focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-primary-100 bg-[#FAF8F5] px-4 pt-3 pb-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-primary-200/50 rounded-xl pl-9 pr-4 py-2 text-sm text-primary focus:outline-none"
            />
          </form>

          <div className="flex flex-col space-y-2 pt-2">
            <Link
              href="/events"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-primary hover:bg-surface rounded-lg"
            >
              <Compass className="w-4 h-4 text-accent" />
              Discover Events
            </Link>
            <Link
              href="/tickets/verify"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-primary hover:bg-surface rounded-lg"
            >
              <ShieldCheck className="w-4 h-4 text-gold-600" />
              Verify Ticket
            </Link>

            {user ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-primary hover:bg-surface rounded-lg"
                >
                  <Ticket className="w-4 h-4 text-neutral-600" />
                  My Tickets & Bookings
                </Link>

                {user.role === "ORGANIZER" && (
                  <Link
                    href="/organizer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-primary hover:bg-surface rounded-lg"
                  >
                    <LayoutDashboard className="w-4 h-4 text-accent" />
                    Organizer Hub
                  </Link>
                )}

                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-primary hover:bg-surface rounded-lg"
                  >
                    <ShieldCheck className="w-4 h-4 text-gold-600" />
                    Admin Console
                  </Link>
                )}

                <div className="pt-2 border-t border-primary-100 flex items-center justify-between px-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-primary">{user.name}</span>
                    <span className="text-xs text-neutral-500">{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-4 border-t border-primary-100 flex flex-col gap-2">
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-medium text-primary border border-primary-200 rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-medium bg-primary text-white rounded-xl"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

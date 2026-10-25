import Link from "next/link";
import Logo from "./Logo";
import { Sparkles, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#1F0C21] text-ivory border-t border-primary-900/40 text-neutral-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-primary-800/60">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="font-display font-bold text-2xl text-white tracking-tight">THIGAZH</span>
              <span className="text-accent font-serif text-base">திகழ்</span>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Events That Make You Shine. Modern multi-tenant event discovery, high-integrity reservations, and digital ticketing.
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Authentic Cultural & Tech Gatherings</span>
            </div>
          </div>

          {/* Discover Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Discover</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <Link href="/events?category=Music+%26+Concerts" className="hover:text-accent transition-colors">
                  Music & Concerts
                </Link>
              </li>
              <li>
                <Link href="/events?category=Technology+%26+AI" className="hover:text-accent transition-colors">
                  Technology & AI
                </Link>
              </li>
              <li>
                <Link href="/events?category=Food+%26+Culinary" className="hover:text-accent transition-colors">
                  Food & Culinary
                </Link>
              </li>
              <li>
                <Link href="/events?category=Arts+%26+Workshops" className="hover:text-accent transition-colors">
                  Arts & Workshops
                </Link>
              </li>
              <li>
                <Link href="/events?category=Cinema+%26+Culture" className="hover:text-accent transition-colors">
                  Cinema & Culture
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Platform</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <Link href="/events" className="hover:text-accent transition-colors">
                  All Events
                </Link>
              </li>
              <li>
                <Link href="/tickets/verify" className="hover:text-accent transition-colors">
                  Ticket Verification
                </Link>
              </li>
              <li>
                <Link href="/auth/signup?role=ORGANIZER" className="hover:text-accent transition-colors">
                  Host an Event
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-accent transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Integrity & Guarantees */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Integrity</h4>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Every booking is backed by atomic inventory locks and a 10-minute hold guarantee. Never oversold.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-800/80 text-accent-200 text-xs rounded-full border border-primary-700/50">
                🔒 Protected Inventory Engine
              </span>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p>© {new Date().getFullYear()} THIGAZH (திகழ்). All rights reserved.</p>
          <p className="flex items-center gap-1">
            Crafted with precision for experiences that shine.
          </p>
        </div>
      </div>
    </footer>
  );
}

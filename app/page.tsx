import Link from "next/link";
import { prisma } from "@/lib/db";
import EventCard from "@/components/EventCard";
import {
  Compass,
  Sparkles,
  Calendar,
  ShieldCheck,
  Clock,
  ArrowRight,
  Music,
  Cpu,
  Utensils,
  Palette,
  Film,
} from "lucide-react";

export const revalidate = 0; // Always fresh database records

export default async function HomePage() {
  // Fetch real published events with ticket tiers
  let events: any[] = [];
  try {
    events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { startAt: "asc" },
      include: {
        organization: {
          select: { name: true },
        },
        ticketTiers: {
          select: {
            id: true,
            name: true,
            price: true,
            totalQuantity: true,
            soldQuantity: true,
            reservedQuantity: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Database query failed on HomePage:", error);
  }

  const transformedEvents = events.map((event: any) => {
    const prices = (event.ticketTiers || []).map((t: any) => t.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const totalAvailable = (event.ticketTiers || []).reduce(
      (sum: number, t: any) => sum + Math.max(0, t.totalQuantity - t.soldQuantity - t.reservedQuantity),
      0
    );

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      category: event.category,
      venue: event.venue,
      city: event.city,
      startAt: event.startAt,
      coverImage: event.coverImage,
      minPrice,
      totalAvailable,
      organization: event.organization,
    };
  });

  const featuredEvents = transformedEvents.slice(0, 3);
  const upcomingEvents = transformedEvents.slice(3, 6);

  const categories = [
    { name: "Music & Concerts", icon: Music, count: "Carnatic, Indie & Live Bands" },
    { name: "Technology & AI", icon: Cpu, count: "Conclaves, Hackathons & DeepTech" },
    { name: "Food & Culinary", icon: Utensils, count: "Masterclasses & Tastings" },
    { name: "Arts & Workshops", icon: Palette, count: "Pottery, Painting & Crafts" },
    { name: "Cinema & Culture", icon: Film, count: "Screenplays, Panels & Heritage" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary-100/40 via-surface/60 to-transparent blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Brand Tag Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-primary-200/60 shadow-subtle text-xs font-semibold text-primary">
            <span className="font-serif text-accent font-bold">திகழ்</span>
            <span className="text-neutral-400">•</span>
            <span>Events That Make You Shine</span>
          </div>

          {/* Headline & Supporting Copy */}
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-primary tracking-tight leading-[1.15] text-balance">
              Find your next <span className="text-accent underline decoration-gold-400/50 decoration-wavy decoration-2">unforgettable</span> experience.
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 font-sans leading-relaxed text-balance max-w-2xl mx-auto">
              Discover concerts, creative workshops, technology gatherings and experiences worth remembering.
            </p>
          </div>

          {/* Search CTA Box */}
          <div className="max-w-2xl mx-auto pt-2">
            <form
              action="/events"
              method="GET"
              className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-white rounded-2xl border border-primary-200/80 shadow-card"
            >
              <div className="flex-1 flex items-center gap-3 px-4 py-2 w-full">
                <Compass className="w-5 h-5 text-accent flex-shrink-0" />
                <input
                  type="text"
                  name="search"
                  placeholder="Search by event name, category, or city..."
                  className="w-full text-sm text-primary placeholder-neutral-400 focus:outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary-800 text-sm font-semibold transition-all shadow-subtle flex items-center justify-center gap-2"
              >
                <span>Explore Events</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Filter Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-neutral-500">
              <span className="font-medium text-neutral-400">Popular:</span>
              <Link href="/events?category=Music+%26+Concerts" className="px-2.5 py-1 bg-surface hover:bg-primary-100 rounded-lg text-primary transition-colors">
                Margazhi Fusion
              </Link>
              <Link href="/events?category=Technology+%26+AI" className="px-2.5 py-1 bg-surface hover:bg-primary-100 rounded-lg text-primary transition-colors">
                AI DeepTech
              </Link>
              <Link href="/events?city=Chennai" className="px-2.5 py-1 bg-surface hover:bg-primary-100 rounded-lg text-primary transition-colors">
                Chennai
              </Link>
              <Link href="/events?city=Coimbatore" className="px-2.5 py-1 bg-surface hover:bg-primary-100 rounded-lg text-primary transition-colors">
                Coimbatore
              </Link>
            </div>
          </div>

          {/* Key Value Props Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8 border-t border-primary-100/60">
            <div className="flex items-center justify-center sm:justify-start gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-primary">10-Minute Hold Engine</h4>
                <p className="text-xs text-neutral-500">Guaranteed lock while you pay</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-primary">Zero Overselling</h4>
                <p className="text-xs text-neutral-500">Atomic database row-level locks</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-primary">Instant Digital Passes</h4>
                <p className="text-xs text-neutral-500">Verifiable QR code tokens</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-12 bg-surface/50 border-y border-primary-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display font-bold text-2xl text-primary">Browse by Category</h2>
              <p className="text-sm text-neutral-500">Curated experiences across art, melody, and craft</p>
            </div>
            <Link
              href="/events"
              className="text-sm font-semibold text-accent hover:text-accent-700 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  href={`/events?category=${encodeURIComponent(cat.name)}`}
                  className="group p-5 bg-card rounded-2xl border border-primary-100/70 hover:border-primary-300 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface group-hover:bg-primary-100 text-primary flex items-center justify-center mb-4 transition-colors">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary group-hover:text-accent transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{cat.count}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Handpicked for You</span>
              </div>
              <h2 className="font-display font-bold text-3xl text-primary">Featured Experiences</h2>
            </div>
            <Link
              href="/events"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-accent transition-colors"
            >
              <span>Explore all events ({transformedEvents.length})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Gatherings Section */}
      {upcomingEvents.length > 0 && (
        <section className="py-16 bg-surface/30 border-t border-primary-100/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div>
              <h2 className="font-display font-bold text-3xl text-primary">More Upcoming Gatherings</h2>
              <p className="text-sm text-neutral-500 mt-1">Reserve your spot early before passes sell out</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Organizer Banner CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-accent-100 text-xs font-medium backdrop-blur-md">
            <span>For Event Curators & Organizers</span>
          </div>

          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight max-w-3xl mx-auto text-balance">
            Host your next event with zero overselling anxiety.
          </h2>

          <p className="text-neutral-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Manage multi-tier pricing, track real-time revenue, and issue verifiable digital passes with THIGAZH’s atomic inventory engine.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup?role=ORGANIZER"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-accent text-white hover:bg-accent-600 font-semibold text-sm transition-all shadow-elevated"
            >
              Create Organizer Account
            </Link>
            <Link
              href="/events"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/20"
            >
              Browse Public Events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

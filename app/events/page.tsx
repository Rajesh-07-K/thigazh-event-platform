import Link from "next/link";
import { prisma } from "@/lib/db";
import EventCard from "@/components/EventCard";
import { Search, Filter, X, Calendar, MapPin, SlidersHorizontal } from "lucide-react";
import { Prisma } from "@prisma/client";

interface EventsPageProps {
  searchParams: {
    search?: string;
    category?: string;
    city?: string;
    sort?: string;
  };
}

export const revalidate = 0;

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const search = searchParams.search?.trim() || "";
  const category = searchParams.category?.trim() || "";
  const city = searchParams.city?.trim() || "";
  const sort = searchParams.sort || "date_asc";

  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { venue: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category && category !== "All") {
    where.category = { equals: category, mode: "insensitive" };
  }

  if (city && city !== "All") {
    where.city = { equals: city, mode: "insensitive" };
  }

  let orderBy: Prisma.EventOrderByWithRelationInput = { startAt: "asc" };
  if (sort === "date_desc") {
    orderBy = { startAt: "desc" };
  }

  let events: any[] = [];
  try {
    events = await prisma.event.findMany({
      where,
      orderBy,
      include: {
        organization: { select: { name: true } },
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
    console.error("Database query failed on EventsPage:", error);
  }

  // Calculate prices and availability
  let transformedEvents = events.map((event: any) => {
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

  // Sort by price if requested
  if (sort === "price_asc") {
    transformedEvents.sort((a, b) => a.minPrice - b.minPrice);
  } else if (sort === "price_desc") {
    transformedEvents.sort((a, b) => b.minPrice - a.minPrice);
  }

  // Get distinct categories and cities for filters
  const allEventsForFilters = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    select: { category: true, city: true },
  });

  const availableCategories = Array.from(new Set(allEventsForFilters.map((e) => e.category)));
  const availableCities = Array.from(new Set(allEventsForFilters.map((e) => e.city)));

  const hasActiveFilters = Boolean(search || (category && category !== "All") || (city && city !== "All"));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-primary">Discover Events</h1>
        <p className="text-neutral-500 text-sm sm:text-base">
          Find and reserve tickets for concerts, conferences, and workshops across Tamil Nadu.
        </p>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="p-4 sm:p-6 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-4">
        <form method="GET" action="/events" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by title, keyword..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              name="category"
              defaultValue={category || "All"}
              className="w-full px-3 py-2 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
            >
              <option value="All">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* City Dropdown */}
          <div>
            <select
              name="city"
              defaultValue={city || "All"}
              className="w-full px-3 py-2 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
            >
              <option value="All">All Cities</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex gap-2">
            <select
              name="sort"
              defaultValue={sort}
              className="w-full px-3 py-2 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
            >
              <option value="date_asc">Date: Earliest First</option>
              <option value="date_desc">Date: Latest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-800 transition-colors shadow-subtle"
            >
              Apply
            </button>
          </div>
        </form>

        {/* Category Pills Quick Select */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary-100/60">
          <Link
            href="/events"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !category || category === "All"
                ? "bg-primary text-white"
                : "bg-surface text-neutral-600 hover:bg-primary-100"
            }`}
          >
            All
          </Link>
          {availableCategories.map((cat) => (
            <Link
              key={cat}
              href={`/events?category=${encodeURIComponent(cat)}${city ? `&city=${encodeURIComponent(city)}` : ""}${sort ? `&sort=${sort}` : ""}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-primary text-white"
                  : "bg-surface text-neutral-600 hover:bg-primary-100"
              }`}
            >
              {cat}
            </Link>
          ))}

          {hasActiveFilters && (
            <Link
              href="/events"
              className="ml-auto inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </Link>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          Showing <strong className="text-primary">{transformedEvents.length}</strong> events
        </span>
      </div>

      {/* Events Grid or Empty State */}
      {transformedEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {transformedEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-card rounded-2xl border border-primary-100 p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-surface text-neutral-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-display font-semibold text-xl text-primary">No events found</h3>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">
            We couldn't find any events matching your selected search or filter criteria. Try clearing some filters.
          </p>
          <div className="pt-2">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-800 transition-colors"
            >
              View All Events
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

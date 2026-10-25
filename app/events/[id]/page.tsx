import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { releaseExpiredHolds } from "@/lib/reservation";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";
import EventBookingSection from "@/components/EventBookingSection";
import {
  Calendar,
  MapPin,
  Clock,
  Building,
  ArrowLeft,
  Share2,
  ShieldCheck,
} from "lucide-react";

export const revalidate = 0;

interface EventDetailPageProps {
  params: {
    id: string;
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = params;

  // Release stale holds first to ensure accurate inventory
  await releaseExpiredHolds();

  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      organization: true,
      ticketTiers: {
        orderBy: { price: "asc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const now = new Date();
  const isSalesOpen = now >= event.salesStartAt && now <= event.salesCutoffAt;

  const tiersWithAvailability = event.ticketTiers.map((tier) => {
    const available = Math.max(0, tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity);
    return {
      ...tier,
      availableQuantity: available,
      isSoldOut: available === 0,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discover</span>
        </Link>
      </div>

      {/* Hero Banner Section */}
      <div className="relative aspect-[21/9] sm:aspect-[21/8] w-full rounded-3xl overflow-hidden shadow-card border border-primary-100 bg-surface">
        <Image
          src={event.coverImage}
          alt={event.title}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Floating Badges */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-primary backdrop-blur-md shadow-sm">
            {event.category}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-md">
            {event.city}
          </span>
        </div>

        {/* Bottom Banner Title */}
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 text-white space-y-2">
          <h1 className="font-display font-bold text-2xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
            {event.title}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
            <span>Organized by</span>
            <strong className="text-white font-medium underline underline-offset-2">
              {event.organization.name}
            </strong>
          </p>
        </div>
      </div>

      {/* Main Grid: Details (Left) + Booking (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Column: Event Information */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key Facts Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date & Time */}
            <div className="p-4 rounded-2xl bg-card border border-primary-100 flex items-start gap-3.5 shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Date & Time</h4>
                <p className="text-sm font-semibold text-primary mt-0.5">{formatDate(event.startAt)}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Starts at {formatTime(event.startAt)}
                </p>
              </div>
            </div>

            {/* Venue & City */}
            <div className="p-4 rounded-2xl bg-card border border-primary-100 flex items-start gap-3.5 shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Location</h4>
                <p className="text-sm font-semibold text-primary mt-0.5">{event.venue}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{event.city}, Tamil Nadu</p>
              </div>
            </div>
          </div>

          {/* About Event Description */}
          <div className="bg-card rounded-2xl border border-primary-100 p-6 sm:p-8 shadow-subtle space-y-4">
            <h2 className="font-display font-bold text-2xl text-primary">About This Experience</h2>
            <div className="prose prose-neutral max-w-none text-neutral-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {event.description}
            </div>
          </div>

          {/* Organizer Bio */}
          <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-surface border border-primary-200 flex items-center justify-center text-primary font-bold text-lg">
                <Building className="w-6 h-6 text-accent" />
              </div>
              <div>
                <span className="text-xs text-neutral-400 uppercase tracking-wider">Hosted by</span>
                <h3 className="font-semibold text-base text-primary">{event.organization.name}</h3>
                <span className="text-xs text-neutral-500">Verified THIGAZH Event Creator</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Host</span>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Booking Widget */}
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <EventBookingSection
            eventId={event.id}
            ticketTiers={tiersWithAvailability}
            isSalesOpen={isSalesOpen}
            salesCutoffAt={event.salesCutoffAt}
          />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Tag } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";

export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  startAt: string | Date;
  coverImage: string;
  minPrice: number;
  totalAvailable?: number;
  organization?: {
    name: string;
  };
}

export default function EventCard({ event }: { event: EventCardData }) {
  const isSoldOut = event.totalAvailable === 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col bg-card rounded-2xl border border-primary-100/70 overflow-hidden shadow-subtle hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full bg-surface overflow-hidden">
        <Image
          src={event.coverImage}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 text-primary backdrop-blur-md shadow-sm">
            {event.category}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-md">
            {event.city}
          </span>
        </div>

        {/* Sold out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="px-4 py-1.5 rounded-full bg-red-600 text-white font-semibold text-xs tracking-wider uppercase">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Date & Time */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatShortDate(event.startAt)}</span>
          </div>

          {/* Title */}
          <h3 className="font-display font-semibold text-lg text-primary leading-snug group-hover:text-accent transition-colors line-clamp-2">
            {event.title}
          </h3>

          {/* Venue */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{event.venue}, {event.city}</span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="pt-3 border-t border-primary-100/50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider">Starts from</span>
            <span className="font-bold text-base text-primary">
              {formatCurrency(event.minPrice)}
            </span>
          </div>

          <span className="text-xs font-medium px-3 py-1.5 rounded-xl bg-surface group-hover:bg-primary group-hover:text-white transition-colors text-primary border border-primary-200/50">
            View Experience
          </span>
        </div>
      </div>
    </Link>
  );
}

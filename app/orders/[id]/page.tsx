import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import TicketQRCode from "@/components/TicketQRCode";
import PrintTicketButton from "@/components/PrintTicketButton";
import {
  CheckCircle,
  Calendar,
  MapPin,
  Ticket,
  ArrowRight,
  ShieldCheck,
  Building,
  ExternalLink,
} from "lucide-react";

export const revalidate = 0;

interface OrderConfirmationPageProps {
  params: {
    id: string;
  };
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const session = await getSessionUser();
  if (!session) {
    redirect(`/auth/signin?redirect=/orders/${params.id}`);
  }

  const { id } = params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      event: {
        include: {
          organization: true,
        },
      },
      items: {
        include: {
          ticketTier: true,
          tickets: {
            include: {
              ticketTier: true,
            },
          },
        },
      },
      transactions: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Security: only order owner or admin can view
  if (order.userId !== session.userId && session.role !== "ADMIN") {
    redirect("/account");
  }

  const allTickets = order.items.flatMap((item) => item.tickets);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Success Header Banner */}
      <div className="bg-card rounded-3xl border border-green-200 p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
        <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-800 text-xs font-semibold mb-1">
            <span>Booking Confirmed & Guaranteed</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-primary">
            You're ready to shine!
          </h1>
          <p className="text-sm text-neutral-600">
            Order Reference: <strong className="font-mono text-primary font-semibold">{order.orderNumber}</strong>
          </p>
          <p className="text-xs text-neutral-400">
            A confirmation has been logged to your THIGAZH account ({order.user.email}).
          </p>
        </div>

        <div className="no-print pt-2 sm:pt-0">
          <PrintTicketButton />
        </div>
      </div>

      {/* Event Details Card */}
      <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-primary-100">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Event Summary
          </span>
          <span className="text-xs font-medium text-accent">
            {order.event.category}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-bold text-xl text-primary">{order.event.title}</h2>
          <p className="text-xs text-neutral-500 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-accent" />
            <span>Presented by {order.event.organization.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <Calendar className="w-4 h-4 text-accent" />
            <div>
              <span className="font-semibold text-primary block">{formatDate(order.event.startAt)}</span>
              <span>Begins at {formatTime(order.event.startAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <MapPin className="w-4 h-4 text-gold-600" />
            <div>
              <span className="font-semibold text-primary block">{order.event.venue}</span>
              <span>{order.event.city}, Tamil Nadu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Tickets (Individual Passes) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xl text-primary flex items-center gap-2">
            <Ticket className="w-5 h-5 text-accent" />
            <span>Digital Admission Passes ({allTickets.length})</span>
          </h3>
          <span className="text-xs text-neutral-500">Show QR at venue check-in gate</span>
        </div>

        <div className="space-y-6">
          {allTickets.map((ticket, idx) => (
            <div
              key={ticket.id}
              className="print-card bg-card rounded-3xl border border-primary-200/80 p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
            >
              {/* Left Ticket Details */}
              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-white">
                    Pass #{idx + 1} • {ticket.ticketTier.name}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    Status: {ticket.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold text-base text-primary">
                    Attendee: {order.user.name}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Tier Price: {formatCurrency(ticket.ticketTier.price)}
                  </p>
                </div>

                <div className="pt-2 border-t border-primary-100/60">
                  <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                    Cryptographic Verification Token
                  </span>
                  <span className="font-mono font-bold text-sm text-primary tracking-wider select-all">
                    {ticket.verificationToken}
                  </span>
                </div>

                <div className="no-print pt-1">
                  <Link
                    href={`/tickets/verify?token=${encodeURIComponent(ticket.verificationToken)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-semibold"
                  >
                    <span>Inspect Live Verification Status</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Right Authentic QR Code */}
              <div className="flex flex-col items-center justify-center p-3 bg-surface rounded-2xl border border-primary-100 flex-shrink-0">
                <TicketQRCode token={ticket.verificationToken} size={150} />
                <span className="text-[10px] text-neutral-500 font-mono mt-1.5 tracking-tight">
                  Scan at Gate
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="no-print pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-primary-100">
        <Link
          href="/account"
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-surface hover:bg-primary-100 border border-primary-200 text-sm font-medium text-primary text-center transition-colors"
        >
          View in My Bookings
        </Link>
        <Link
          href="/events"
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-800 text-white text-sm font-semibold text-center transition-colors shadow-subtle flex items-center justify-center gap-2"
        >
          <span>Discover More Events</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/utils";
import {
  User,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export const revalidate = 0;

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/auth/signin?redirect=/account");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      orders: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        include: {
          event: true,
          items: {
            include: {
              ticketTier: true,
              tickets: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const now = new Date();
  const upcomingOrders = user.orders.filter((o) => new Date(o.event.startAt) >= now);
  const pastOrders = user.orders.filter((o) => new Date(o.event.startAt) < now);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Profile Header */}
      <div className="bg-card rounded-3xl border border-primary-100 p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-display font-bold text-2xl shadow-subtle">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="font-display font-bold text-2xl text-primary">{user.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-100 text-primary">
                {user.role}
              </span>
            </div>
            <p className="text-sm text-neutral-500">{user.email}</p>
            <p className="text-xs text-neutral-400">
              Member since {formatShortDate(user.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user.role === "ORGANIZER" && (
            <Link
              href="/organizer"
              className="px-4 py-2 rounded-xl bg-surface hover:bg-primary-100 border border-primary-200 text-xs font-semibold text-primary transition-colors"
            >
              Organizer Hub
            </Link>
          )}
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl bg-surface hover:bg-primary-100 border border-primary-200 text-xs font-semibold text-primary transition-colors"
            >
              Admin Console
            </Link>
          )}
        </div>
      </div>

      {/* Bookings Section */}
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-primary-100">
            <h2 className="font-display font-bold text-2xl text-primary flex items-center gap-2">
              <Ticket className="w-5 h-5 text-accent" />
              <span>Upcoming Experiences ({upcomingOrders.length})</span>
            </h2>
          </div>

          {upcomingOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {upcomingOrders.map((order) => {
                const ticketsCount = order.items.reduce((s, i) => s + i.tickets.length, 0);

                return (
                  <div
                    key={order.id}
                    className="bg-card rounded-2xl border border-primary-100 overflow-hidden shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-semibold text-accent uppercase tracking-wider block">
                            {order.event.category}
                          </span>
                          <h3 className="font-display font-bold text-lg text-primary mt-0.5 line-clamp-1">
                            {order.event.title}
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
                          Confirmed
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-neutral-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <span>{formatDate(order.event.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />
                          <span>{order.event.venue}, {order.event.city}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-surface rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between text-neutral-500">
                          <span>Order Reference</span>
                          <span className="font-mono font-medium text-primary">{order.orderNumber}</span>
                        </div>
                        <div className="flex justify-between text-neutral-500">
                          <span>Total Paid</span>
                          <span className="font-bold text-primary">{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-neutral-500">
                          <span>Passes Issued</span>
                          <span className="font-semibold text-primary">{ticketsCount} Pass{ticketsCount > 1 ? "es" : ""}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-surface/50 border-t border-primary-100/60 flex items-center justify-between">
                      <span className="text-xs text-neutral-400">
                        Booked on {formatShortDate(order.createdAt)}
                      </span>
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-700"
                      >
                        <span>View Digital Tickets</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-card rounded-2xl border border-primary-100 p-6 space-y-3 mt-4">
              <p className="text-sm text-neutral-500">You don't have any upcoming reservations.</p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-800 transition-colors"
              >
                Explore Events
              </Link>
            </div>
          )}
        </div>

        {/* Past Bookings */}
        {pastOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl text-primary pb-2 border-b border-primary-100">
              Past Experiences ({pastOrders.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 bg-card rounded-2xl border border-primary-100/60 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-primary">{order.event.title}</h4>
                    <p className="text-neutral-500">{formatShortDate(order.event.startAt)} • {order.event.city}</p>
                    <p className="font-mono text-neutral-400">{order.orderNumber}</p>
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="px-3 py-1.5 rounded-lg bg-surface hover:bg-primary-100 text-primary font-medium"
                  >
                    View Order
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

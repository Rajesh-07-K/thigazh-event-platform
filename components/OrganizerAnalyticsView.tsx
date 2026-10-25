"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/utils";
import {
  TrendingUp,
  Ticket,
  Calendar,
  Users,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function OrganizerAnalyticsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch("/api/organizer/analytics");
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Failed to load organizer analytics.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Network error loading analytics.");
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-neutral-500">Calculating authoritative aggregates...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-card rounded-2xl border border-red-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="font-bold text-primary">Unable to Access Organizer Hub</h3>
        <p className="text-sm text-neutral-600">{error}</p>
        <Link
          href="/auth/signup?role=ORGANIZER"
          className="inline-block px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
        >
          Register as Organizer
        </Link>
      </div>
    );
  }

  const { overview, eventSummaries, recentOrders, revenueTrend, organizations } = data;

  return (
    <div className="space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-accent uppercase tracking-wider block">
            Organizer Command Hub
          </span>
          <h1 className="font-display font-bold text-3xl text-primary">
            {organizations[0]?.name || "Organization Hub"}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Authoritative ticket sales, revenue aggregation, and live inventory status.
          </p>
        </div>

        <Link
          href="/organizer/events/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-800 text-sm font-semibold transition-all shadow-subtle hover:shadow-card self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-6 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Successful Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-primary">
            {formatCurrency(overview.totalSuccessfulRevenue)}
          </div>
          <p className="text-[11px] text-neutral-400">Excludes declined/failed transactions</p>
        </div>

        {/* Tickets Sold */}
        <div className="p-6 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Tickets Sold
            </span>
            <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-primary">
            {overview.totalTicketsSold}
          </div>
          <p className="text-[11px] text-neutral-400">Across all published tiers</p>
        </div>

        {/* Available Inventory */}
        <div className="p-6 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Remaining Inventory
            </span>
            <div className="w-8 h-8 rounded-lg bg-gold-50 text-gold-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-primary">
            {overview.totalAvailableInventory}
          </div>
          <p className="text-[11px] text-neutral-400">Available to purchase now</p>
        </div>

        {/* Active 10-Min Holds */}
        <div className="p-6 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Active Holds
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-primary">
            {overview.activeHoldsCount}
          </div>
          <p className="text-[11px] text-neutral-400">Currently in 10-minute checkout</p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-card rounded-3xl border border-primary-100 p-6 sm:p-8 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-primary">Revenue Velocity</h2>
            <p className="text-xs text-neutral-500">Historical daily completed ticket sales (in ₹)</p>
          </div>
          <span className="text-xs px-3 py-1 bg-surface rounded-full text-neutral-600 font-medium border border-primary-100">
            Real Authoritative Orders
          </span>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E07A5F" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#E07A5F" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4EFEA" />
              <XAxis dataKey="date" stroke="#888888" fontSize={11} />
              <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => `₹${val}`} />
              <Tooltip
                formatter={(value: any) => [`₹${value}`, "Revenue"]}
                contentStyle={{
                  backgroundColor: "#FAF8F5",
                  borderRadius: "0.75rem",
                  border: "1px solid #EEDEEF",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenueInRupees"
                stroke="#E07A5F"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events Breakdown Table */}
      <div className="bg-card rounded-3xl border border-primary-100 p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-primary">
            Curated Events ({eventSummaries.length})
          </h2>
          <Link
            href="/organizer/events/new"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
          >
            <span>+ Add Event</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface border-y border-primary-100 text-neutral-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sold / Capacity</th>
                <th className="py-3 px-4">Revenue</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100/60 text-primary">
              {eventSummaries.map((event: any) => {
                const soldPct = Math.round((event.ticketsSold / Math.max(1, event.totalCapacity)) * 100);

                return (
                  <tr key={event.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-4 px-4 font-semibold max-w-xs">
                      <div className="truncate">{event.title}</div>
                      <div className="text-[11px] font-normal text-neutral-400">{event.venue}, {event.city}</div>
                    </td>
                    <td className="py-4 px-4 text-neutral-600 whitespace-nowrap">
                      {formatShortDate(event.startAt)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-green-50 text-green-700 border border-green-200">
                        {event.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-medium">
                        {event.ticketsSold} / {event.totalCapacity} ({soldPct}%)
                      </div>
                      <div className="w-24 bg-neutral-200 rounded-full h-1 mt-1 overflow-hidden">
                        <div className="bg-accent h-full" style={{ width: `${soldPct}%` }} />
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold whitespace-nowrap">
                      {formatCurrency(event.revenue)}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/events/${event.id}`}
                        className="text-accent hover:text-accent-700 font-medium ml-2"
                      >
                        Public Page
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders Stream */}
      <div className="bg-card rounded-3xl border border-primary-100 p-6 sm:p-8 shadow-card space-y-4">
        <h2 className="font-display font-bold text-xl text-primary">Recent Orders</h2>
        {recentOrders.length > 0 ? (
          <div className="divide-y divide-primary-100/60">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold text-primary">{order.customerName} ({order.customerEmail})</div>
                  <div className="text-neutral-500">{order.eventTitle} • {order.itemsCount} tickets</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{formatCurrency(order.totalAmount)}</div>
                  <div className="text-[10px] text-neutral-400">{formatDate(order.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">No recent orders yet.</p>
        )}
      </div>
    </div>
  );
}

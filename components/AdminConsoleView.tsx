"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/utils";
import {
  ShieldCheck,
  Users,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function AdminConsoleView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Forbidden. Admin access required.");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Network error fetching admin records.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleToggleStatus = async (eventId: string, currentStatus: string) => {
    setUpdatingId(eventId);
    const nextStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        // Refresh local state
        setData((prev: any) => ({
          ...prev,
          recentEvents: prev.recentEvents.map((e: any) =>
            e.id === eventId ? { ...e, status: nextStatus } : e
          ),
        }));
      } else {
        alert("Failed to update event status.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-gold-500 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-neutral-500">Loading admin operations...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-card rounded-2xl border border-red-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="font-bold text-primary">Admin Access Required</h3>
        <p className="text-sm text-neutral-600">{error}</p>
        <Link
          href="/auth/signin"
          className="inline-block px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
        >
          Sign In with Admin Account
        </Link>
      </div>
    );
  }

  const { stats, recentEvents, recentUsers } = data;

  return (
    <div className="space-y-10">
      {/* Admin Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-3xl text-primary">Platform Administration</h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            System moderation, tenant monitoring, and platform metrics.
          </p>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-1">
          <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Total Platform GMV</span>
          <div className="text-2xl font-bold font-display text-primary">{formatCurrency(stats.totalRevenue)}</div>
          <p className="text-[11px] text-green-700 font-medium">Successful bookings</p>
        </div>

        <div className="p-5 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-1">
          <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Total Users</span>
          <div className="text-2xl font-bold font-display text-primary">{stats.totalUsers}</div>
          <p className="text-[11px] text-neutral-400">Attendees & Organizers</p>
        </div>

        <div className="p-5 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-1">
          <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Organizations</span>
          <div className="text-2xl font-bold font-display text-primary">{stats.totalOrganizations}</div>
          <p className="text-[11px] text-neutral-400">Verified hosts</p>
        </div>

        <div className="p-5 bg-card rounded-2xl border border-primary-100 shadow-subtle space-y-1">
          <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Total Events</span>
          <div className="text-2xl font-bold font-display text-primary">{stats.totalEvents}</div>
          <p className="text-[11px] text-neutral-400">Created on platform</p>
        </div>
      </div>

      {/* Event Moderation Table */}
      <div className="bg-card rounded-3xl border border-primary-100 p-6 sm:p-8 shadow-card space-y-6">
        <h2 className="font-display font-bold text-xl text-primary">Event Moderation & Publishing</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface border-y border-primary-100 text-neutral-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Event Title</th>
                <th className="py-3 px-4">Host Organization</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4 text-right">Moderation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100/60 text-primary">
              {recentEvents.map((event: any) => (
                <tr key={event.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold max-w-xs truncate">{event.title}</td>
                  <td className="py-3.5 px-4 text-neutral-600">{event.organization?.name || "Independent"}</td>
                  <td className="py-3.5 px-4 text-neutral-600">{event.city}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                        event.status === "PUBLISHED"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium">{event._count?.orders || 0}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      disabled={updatingId === event.id}
                      onClick={() => handleToggleStatus(event.id, event.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                        event.status === "PUBLISHED"
                          ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                          : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                      }`}
                    >
                      {updatingId === event.id
                        ? "Saving..."
                        : event.status === "PUBLISHED"
                        ? "Unpublish"
                        : "Approve & Publish"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registered Users Directory */}
      <div className="bg-card rounded-3xl border border-primary-100 p-6 sm:p-8 shadow-card space-y-4">
        <h2 className="font-display font-bold text-xl text-primary">Recent Registered Users</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface border-y border-primary-100 text-neutral-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100/60 text-primary">
              {recentUsers.map((u: any) => (
                <tr key={u.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3 px-4 font-semibold">{u.name}</td>
                  <td className="py-3 px-4 text-neutral-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-primary-100 text-primary">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-500">{formatShortDate(u.createdAt)}</td>
                  <td className="py-3 px-4 text-right font-medium">{u._count?.orders || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

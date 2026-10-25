"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Ticket,
  Plus,
  Trash2,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Building,
} from "lucide-react";

interface TicketTierInput {
  name: string;
  description: string;
  priceInRupees: number;
  totalQuantity: number;
}

export default function CreateEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Music & Concerts");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Chennai");
  const [coverImage, setCoverImage] = useState(
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80"
  );

  // Timings
  const today = new Date();
  const nextMonth = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const nextMonthEnd = new Date(nextMonth.getTime() + 4 * 60 * 60 * 1000);

  const [startAt, setStartAt] = useState(nextMonth.toISOString().slice(0, 16));
  const [endAt, setEndAt] = useState(nextMonthEnd.toISOString().slice(0, 16));
  const [salesStartAt, setSalesStartAt] = useState(today.toISOString().slice(0, 16));
  const [salesCutoffAt, setSalesCutoffAt] = useState(nextMonth.toISOString().slice(0, 16));

  // Tiers
  const [ticketTiers, setTicketTiers] = useState<TicketTierInput[]>([
    {
      name: "General Admission",
      description: "Standard entry with seating/standing access",
      priceInRupees: 499,
      totalQuantity: 100,
    },
    {
      name: "VIP Prime Seating",
      description: "Front-row priority seating with welcome drink",
      priceInRupees: 1499,
      totalQuantity: 30,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTier = () => {
    setTicketTiers((prev) => [
      ...prev,
      {
        name: `Tier ${prev.length + 1}`,
        description: "",
        priceInRupees: 999,
        totalQuantity: 50,
      },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (ticketTiers.length <= 1) {
      alert("At least one ticket tier is required.");
      return;
    }
    setTicketTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof TicketTierInput, value: any) => {
    setTicketTiers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate tiers
    for (const tier of ticketTiers) {
      if (!tier.name.trim()) {
        setError("All ticket tiers must have a name.");
        setLoading(false);
        return;
      }
      if (tier.priceInRupees < 0 || tier.totalQuantity < 1) {
        setError("Tier prices must be non-negative and quantities at least 1.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          venue,
          city,
          coverImage,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          salesStartAt: new Date(salesStartAt).toISOString(),
          salesCutoffAt: new Date(salesCutoffAt).toISOString(),
          ticketTiers: ticketTiers.map((t) => ({
            name: t.name,
            description: t.description || undefined,
            price: Math.round(t.priceInRupees * 100), // convert to paise
            totalQuantity: Number(t.totalQuantity),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create event.");
        setLoading(false);
        return;
      }

      router.push("/organizer");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/organizer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizer Hub</span>
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="font-display font-bold text-3xl text-primary">Create New Event</h1>
        <p className="text-xs sm:text-sm text-neutral-500">
          Publish an experience with multi-tier ticketing protected by 10-minute hold reservation.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details */}
        <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle space-y-4">
          <h2 className="font-display font-bold text-lg text-primary">General Information</h2>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Event Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Coimbatore Folk & Sufi Night"
              className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
              >
                <option value="Music & Concerts">Music & Concerts</option>
                <option value="Technology & AI">Technology & AI</option>
                <option value="Food & Culinary">Food & Culinary</option>
                <option value="Arts & Workshops">Arts & Workshops</option>
                <option value="Cinema & Culture">Cinema & Culture</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
              >
                <option value="Chennai">Chennai</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Madurai">Madurai</option>
                <option value="Tiruchirappalli">Tiruchirappalli</option>
                <option value="Salem">Salem</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Venue Name & Address
            </label>
            <input
              type="text"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Sir Mutha Venkatasubba Rao Concert Hall"
              className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Cover Image URL (Unsplash or CDN)
            </label>
            <input
              type="url"
              required
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Full Description & Highlights
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail what attendees will experience, artists/speakers, schedule, and guidelines..."
              className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
            />
          </div>
        </div>

        {/* Timings & Sales Period */}
        <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle space-y-4">
          <h2 className="font-display font-bold text-lg text-primary">Dates & Sales Windows</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Event Starts At
              </label>
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Event Ends At
              </label>
              <input
                type="datetime-local"
                required
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Sales Start Date
              </label>
              <input
                type="datetime-local"
                required
                value={salesStartAt}
                onChange={(e) => setSalesStartAt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Sales Cutoff Date
              </label>
              <input
                type="datetime-local"
                required
                value={salesCutoffAt}
                onChange={(e) => setSalesCutoffAt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none text-primary"
              />
            </div>
          </div>
        </div>

        {/* Ticket Tiers Management */}
        <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-primary-100">
            <div>
              <h2 className="font-display font-bold text-lg text-primary">Ticket Tiers & Capacities</h2>
              <p className="text-xs text-neutral-500">
                Define seating categories, pricing, and guaranteed total inventory.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddTier}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-primary-100 border border-primary-200 text-xs font-semibold text-primary flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tier</span>
            </button>
          </div>

          <div className="space-y-4">
            {ticketTiers.map((tier, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-surface/60 border border-primary-100 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Tier #{idx + 1}</span>
                  {ticketTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(idx)}
                      className="text-red-600 hover:text-red-700 p-1 text-xs"
                      title="Remove tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Tier Name
                    </label>
                    <input
                      type="text"
                      required
                      value={tier.name}
                      onChange={(e) => handleTierChange(idx, "name", e.target.value)}
                      placeholder="e.g. Balcony, VIP"
                      className="w-full px-3 py-2 text-xs bg-white border border-primary-200 rounded-lg text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Price (in ₹ INR)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={tier.priceInRupees}
                      onChange={(e) => handleTierChange(idx, "priceInRupees", Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-primary-200 rounded-lg text-primary font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Total Seats / Capacity
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={tier.totalQuantity}
                      onChange={(e) => handleTierChange(idx, "totalQuantity", Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-primary-200 rounded-lg text-primary font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                    Tier Perks / Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={tier.description}
                    onChange={(e) => handleTierChange(idx, "description", e.target.value)}
                    placeholder="e.g. Free beverage voucher, priority entrance"
                    className="w-full px-3 py-2 text-xs bg-white border border-primary-200 rounded-lg text-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-primary hover:bg-primary-800 text-white font-semibold text-sm transition-all shadow-subtle hover:shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Publishing Event & Tiers...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Publish Experience to THIGAZH</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

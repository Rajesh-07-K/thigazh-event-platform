"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Ticket, Plus, Minus, Lock, AlertCircle, Sparkles } from "lucide-react";

interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  totalQuantity: number;
  soldQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  isSoldOut: boolean;
}

interface EventBookingSectionProps {
  eventId: string;
  ticketTiers: TicketTier[];
  isSalesOpen: boolean;
  salesCutoffAt: string | Date;
}

export default function EventBookingSection({
  eventId,
  ticketTiers,
  isSalesOpen,
  salesCutoffAt,
}: EventBookingSectionProps) {
  const router = useRouter();
  // Map of tierId -> quantity
  const [quantities, setQuantities] = useState<{ [tierId: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (tierId: string, delta: number, maxAvailable: number) => {
    setError(null);
    setQuantities((prev) => {
      const current = prev[tierId] || 0;
      const next = Math.max(0, Math.min(10, Math.min(maxAvailable, current + delta)));
      return {
        ...prev,
        [tierId]: next,
      };
    });
  };

  const selectedItems = Object.entries(quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([tierId, qty]) => {
      const tier = ticketTiers.find((t) => t.id === tierId)!;
      return {
        ticketTierId: tierId,
        tierName: tier.name,
        quantity: qty,
        unitPrice: tier.price,
        subtotal: tier.price * qty,
      };
    });

  const totalTickets = selectedItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalAmount = selectedItems.reduce((acc, curr) => acc + curr.subtotal, 0);

  const handleReserve = async () => {
    if (selectedItems.length === 0) {
      setError("Please select at least 1 ticket to reserve.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          items: selectedItems.map((item) => ({
            ticketTierId: item.ticketTierId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Redirect to sign in with return path
          router.push(`/auth/signin?redirect=/events/${eventId}`);
          return;
        }
        setError(data.error || "Failed to reserve tickets. Please try again.");
        setLoading(false);
        return;
      }

      // Successful hold created! Redirect to checkout
      router.push(`/checkout/${data.reservation.holdId}`);
    } catch (err) {
      console.error("Booking error:", err);
      setError("An unexpected error occurred. Please check your network connection.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-primary-200/80 p-6 sm:p-8 shadow-card space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-primary-100">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-accent" />
          <h2 className="font-display font-bold text-xl text-primary">Select Tickets</h2>
        </div>
        <span className="text-xs text-neutral-500">Max 10 per order</span>
      </div>

      {!isSalesOpen && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-900 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>Ticket sales are currently closed for this event.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-900 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Ticket Tier Cards */}
      <div className="space-y-4">
        {ticketTiers.map((tier) => {
          const qty = quantities[tier.id] || 0;
          const available = tier.availableQuantity;
          const isSoldOut = tier.isSoldOut || available <= 0;

          return (
            <div
              key={tier.id}
              className={`p-4 sm:p-5 rounded-xl border transition-all ${
                qty > 0
                  ? "border-primary bg-primary-50/20 shadow-subtle"
                  : isSoldOut
                  ? "border-neutral-200 bg-neutral-50/50 opacity-60"
                  : "border-primary-100 hover:border-primary-200 bg-white"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base text-primary">{tier.name}</h3>
                    {available > 0 && available <= 15 && (
                      <span className="text-[10px] uppercase font-bold text-accent bg-accent-50 px-2 py-0.5 rounded-full">
                        Only {available} left!
                      </span>
                    )}
                  </div>
                  {tier.description && (
                    <p className="text-xs text-neutral-500 max-w-md">{tier.description}</p>
                  )}
                  <div className="text-sm font-bold text-primary pt-1">
                    {formatCurrency(tier.price)}
                    <span className="text-xs font-normal text-neutral-400 ml-1">/ person</span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center self-end sm:self-center">
                  {isSoldOut ? (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-200 text-neutral-600">
                      Sold Out
                    </span>
                  ) : !isSalesOpen ? (
                    <span className="text-xs font-medium text-neutral-400">Unavailable</span>
                  ) : (
                    <div className="flex items-center border border-primary-200 rounded-xl bg-surface p-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(tier.id, -1, available)}
                        disabled={qty === 0 || loading}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-bold text-sm text-primary">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(tier.id, 1, available)}
                        disabled={qty >= Math.min(10, available) || loading}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Box & Reserve Action */}
      {totalTickets > 0 && (
        <div className="pt-4 border-t border-primary-100 space-y-4">
          <div className="space-y-1.5 text-sm">
            {selectedItems.map((item) => (
              <div key={item.ticketTierId} className="flex justify-between text-neutral-600 text-xs">
                <span>
                  {item.tierName} × {item.quantity}
                </span>
                <span className="font-medium text-primary">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base text-primary pt-2 border-t border-primary-100">
              <span>Total Payable</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="p-3 bg-surface rounded-xl flex items-center gap-2 text-xs text-neutral-600">
            <Lock className="w-4 h-4 text-accent flex-shrink-0" />
            <span>
              Reserving locks tickets for <strong>10 minutes</strong>. No one else can purchase your reserved seats during checkout.
            </span>
          </div>

          <button
            type="button"
            onClick={handleReserve}
            disabled={loading || !isSalesOpen}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-800 text-white font-semibold text-sm transition-all shadow-subtle hover:shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Securing Your Reservation...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Reserve Tickets ({totalTickets})</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

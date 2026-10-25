"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HoldCountdown from "@/components/HoldCountdown";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  RotateCcw,
  Building,
  Lock,
  Wallet,
} from "lucide-react";

interface HoldItem {
  id: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
  ticketTier: {
    id: string;
    name: string;
    price: number;
    currency: string;
  };
}

interface HoldData {
  id: string;
  userId: string;
  eventId: string;
  status: string;
  expiresAt: string;
  remainingSeconds: number;
  isExpired: boolean;
  totalAmount: number;
  event: {
    id: string;
    title: string;
    venue: string;
    city: string;
    startAt: string;
    coverImage: string;
  };
  items: HoldItem[];
}

export default function CheckoutPage({ params }: { params: { holdId: string } }) {
  const router = useRouter();
  const { holdId } = params;

  const [hold, setHold] = useState<HoldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("UPI_SIMULATED");
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    // Generate unique idempotency key for this session
    setIdempotencyKey(`idemp-${holdId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);

    fetchHold();
  }, [holdId]);

  const fetchHold = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reservations/${holdId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/signin?redirect=/checkout/${holdId}`);
          return;
        }
        const data = await res.json();
        setError(data.error || "Failed to load reservation.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setHold(data.hold);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Network error loading your reservation.");
      setLoading(false);
    }
  };

  const handleHoldExpired = () => {
    if (hold) {
      setHold({
        ...hold,
        isExpired: true,
        remainingSeconds: 0,
      });
    }
  };

  const handlePay = async (simulateResult: "SUCCESS" | "FAILURE") => {
    if (!hold || hold.isExpired) {
      setError("Reservation has expired. Please select tickets again.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdId: hold.id,
          idempotencyKey,
          simulateResult,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Payment was declined or hold is invalid.");
        setProcessing(false);
        return;
      }

      // Successful payment! Navigate to confirmation page
      router.push(`/orders/${data.order.id}`);
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred while processing payment.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-neutral-500">Loading your reservation hold...</p>
      </div>
    );
  }

  if (error && !hold) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-display font-bold text-2xl text-primary">Reservation Not Found</h2>
        <p className="text-sm text-neutral-500">{error}</p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-800 transition-colors"
        >
          Discover Available Events
        </Link>
      </div>
    );
  }

  if (!hold) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="font-display font-bold text-3xl text-primary">Checkout & Payment</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Complete payment to finalize your booking and receive digital ticket passes.
        </p>
      </div>

      {/* 10-Minute Hold Countdown Banner */}
      <HoldCountdown
        initialSeconds={hold.remainingSeconds}
        onExpire={handleHoldExpired}
      />

      {/* Expired State Notice */}
      {hold.isExpired ? (
        <div className="p-8 rounded-3xl bg-card border border-red-200 shadow-card text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-2xl text-primary">10-Minute Hold Window Expired</h2>
          <p className="text-sm text-neutral-600 max-w-md mx-auto">
            To ensure fair access, reservations are held for exactly 10 minutes. Your tickets have been safely released back to the event pool.
          </p>
          <div className="pt-2">
            <Link
              href={`/events/${hold.eventId}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-800 transition-colors shadow-subtle"
            >
              <span>Return to Event & Re-select</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Left Column: Payment Methods & Simulated Gateway */}
          <div className="md:col-span-2 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle space-y-4">
              <h3 className="font-display font-bold text-lg text-primary flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                <span>Payment Method</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("UPI_SIMULATED")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    paymentMethod === "UPI_SIMULATED"
                      ? "border-primary bg-primary-50/20 shadow-subtle"
                      : "border-primary-100 hover:border-primary-200"
                  }`}
                >
                  <Wallet className="w-5 h-5 text-accent" />
                  <div>
                    <span className="font-semibold text-xs text-primary block">UPI (Fast)</span>
                    <span className="text-[11px] text-neutral-500">GPay, PhonePe, Paytm</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CARD_SIMULATED")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    paymentMethod === "CARD_SIMULATED"
                      ? "border-primary bg-primary-50/20 shadow-subtle"
                      : "border-primary-100 hover:border-primary-200"
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-gold-600" />
                  <div>
                    <span className="font-semibold text-xs text-primary block">Credit / Debit</span>
                    <span className="text-[11px] text-neutral-500">Visa, Mastercard, RuPay</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("NET_BANKING_SIMULATED")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    paymentMethod === "NET_BANKING_SIMULATED"
                      ? "border-primary bg-primary-50/20 shadow-subtle"
                      : "border-primary-100 hover:border-primary-200"
                  }`}
                >
                  <Building className="w-5 h-5 text-primary" />
                  <div>
                    <span className="font-semibold text-xs text-primary block">Net Banking</span>
                    <span className="text-[11px] text-neutral-500">All Major Banks</span>
                  </div>
                </button>
              </div>

              {/* Mock Sandbox Notice */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Simulated Mock Payment Gateway Sandbox</span>
                </div>
                <p className="text-[11px] opacity-90">
                  This environment runs a simulated gateway for evaluation. No real financial charges are incurred.
                </p>
              </div>
            </div>

            {/* Payment Actions */}
            <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle space-y-4">
              <h3 className="font-semibold text-sm text-primary">Simulate Transaction Outcome</h3>
              <p className="text-xs text-neutral-500">
                Test both success and decline branches to verify atomic inventory transitions and idempotency protections:
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Success Button */}
                <button
                  type="button"
                  onClick={() => handlePay("SUCCESS")}
                  disabled={processing}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-800 text-white font-semibold text-sm transition-all shadow-subtle hover:shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? (
                    <span>Processing Payment...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Pay {formatCurrency(hold.totalAmount)} (Mock Success)</span>
                    </>
                  )}
                </button>

                {/* Simulated Failure Button */}
                <button
                  type="button"
                  onClick={() => handlePay("FAILURE")}
                  disabled={processing}
                  className="py-3.5 px-4 rounded-xl bg-surface hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Simulate Decline (Mock Failure)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle space-y-6">
            <h3 className="font-display font-bold text-lg text-primary pb-3 border-b border-primary-100">
              Booking Summary
            </h3>

            {/* Event Overview */}
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-primary line-clamp-2">{hold.event.title}</h4>
              <p className="text-xs text-neutral-500">{formatDate(hold.event.startAt)}</p>
              <p className="text-xs text-neutral-500">{hold.event.venue}, {hold.event.city}</p>
            </div>

            {/* Hold Items List */}
            <div className="space-y-3 pt-3 border-t border-primary-100">
              {hold.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-medium text-primary block">{item.ticketTier.name}</span>
                    <span className="text-neutral-400">Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</span>
                  </div>
                  <span className="font-semibold text-primary">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Row */}
            <div className="pt-4 border-t border-primary-100 flex justify-between items-baseline">
              <span className="font-bold text-sm text-primary">Total Amount</span>
              <span className="font-display font-bold text-2xl text-primary">
                {formatCurrency(hold.totalAmount)}
              </span>
            </div>

            <div className="p-3 bg-surface rounded-xl flex items-center gap-2 text-xs text-neutral-500">
              <Lock className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <span>Encrypted with idempotency protection.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

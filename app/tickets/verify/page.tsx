"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Calendar,
  MapPin,
  Building,
  User,
  Ticket,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface VerifiedTicketData {
  id: string;
  verificationToken: string;
  status: "VALID" | "USED" | "CANCELLED";
  issuedAt: string;
  usedAt: string | null;
  tierName: string;
  price: number;
  currency: string;
  attendeeName: string;
  attendeeEmail: string;
  orderNumber: string;
  event: {
    id: string;
    title: string;
    venue: string;
    city: string;
    startAt: string;
    endAt: string;
    organizationName: string;
  };
}

function TicketVerificationContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [inputToken, setInputToken] = useState(tokenParam);
  const [loading, setLoading] = useState(false);
  const [verifiedTicket, setVerifiedTicket] = useState<VerifiedTicketData | null>(null);
  const [verificationResult, setVerificationResult] = useState<"VALID" | "USED" | "INVALID" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [admitLoading, setAdmitLoading] = useState(false);
  const [admitSuccess, setAdmitSuccess] = useState<string | null>(null);

  const verifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setAdmitSuccess(null);
    setVerifiedTicket(null);
    setVerificationResult(null);

    try {
      const res = await fetch(`/api/tickets/verify/${encodeURIComponent(tokenToVerify.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setVerificationResult("INVALID");
        setErrorMessage(data.error || "Ticket not found or invalid token.");
        setLoading(false);
        return;
      }

      setVerifiedTicket(data.ticket);
      setVerificationResult(data.ticket.status);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setVerificationResult("INVALID");
      setErrorMessage("Network error while verifying ticket.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenParam) {
      setInputToken(tokenParam);
      verifyToken(tokenParam);
    }
  }, [tokenParam]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      verifyToken(inputToken);
    }
  };

  const handleAdmitPass = async () => {
    if (!verifiedTicket) return;
    setAdmitLoading(true);
    try {
      const res = await fetch(`/api/tickets/verify/${encodeURIComponent(verifiedTicket.verificationToken)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Admit check-in failed.");
        setAdmitLoading(false);
        return;
      }
      setAdmitSuccess("Ticket marked as ADMITTED at gate!");
      setVerificationResult("USED");
      setVerifiedTicket({
        ...verifiedTicket,
        status: "USED",
        usedAt: new Date().toISOString(),
      });
      setAdmitLoading(false);
    } catch (err) {
      console.error(err);
      alert("Error admitting ticket.");
      setAdmitLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-primary-200 flex items-center justify-center mx-auto text-primary shadow-subtle">
          <ShieldCheck className="w-6 h-6 text-accent" />
        </div>
        <h1 className="font-display font-bold text-3xl text-primary">Ticket Verification Registry</h1>
        <p className="text-sm text-neutral-500 max-w-md mx-auto">
          Scan or enter a THIGAZH ticket verification token to validate admission authenticity.
        </p>
      </div>

      {/* Manual Search Form */}
      <div className="bg-card rounded-2xl border border-primary-100 p-6 shadow-subtle">
        <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="e.g. THG-XXXX-XXXX-XXXX or TKT-VF-..."
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-surface border border-primary-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-primary uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-800 text-white font-semibold text-sm transition-colors shadow-subtle disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Pass"}
          </button>
        </form>
      </div>

      {/* Result Display */}
      {verificationResult === "VALID" && verifiedTicket && (
        <div className="bg-card rounded-3xl border border-green-300 p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-green-100">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-green-700 block">
                Verification Confirmed
              </span>
              <h2 className="font-display font-bold text-2xl text-primary">
                Valid Digital Admission Pass
              </h2>
            </div>
          </div>

          {admitSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{admitSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 bg-surface rounded-xl space-y-1">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent" />
                <span>Ticket Holder</span>
              </span>
              <p className="font-semibold text-primary">{verifiedTicket.attendeeName}</p>
              <p className="text-xs text-neutral-500">{verifiedTicket.attendeeEmail}</p>
            </div>

            <div className="p-3.5 bg-surface rounded-xl space-y-1">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-accent" />
                <span>Ticket Tier</span>
              </span>
              <p className="font-semibold text-primary">{verifiedTicket.tierName}</p>
              <p className="text-xs text-neutral-500">{formatCurrency(verifiedTicket.price)}</p>
            </div>
          </div>

          <div className="p-4 bg-surface rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-sm text-primary">{verifiedTicket.event.title}</div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>{formatDate(verifiedTicket.event.startAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <MapPin className="w-3.5 h-3.5 text-gold-600" />
              <span>{verifiedTicket.event.venue}, {verifiedTicket.event.city}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Building className="w-3.5 h-3.5 text-neutral-400" />
              <span>Host: {verifiedTicket.event.organizationName}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-primary-100">
            <div className="text-xs font-mono text-neutral-500">
              Token: <strong>{verifiedTicket.verificationToken}</strong>
            </div>

            <button
              type="button"
              onClick={handleAdmitPass}
              disabled={admitLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-600 transition-colors shadow-subtle disabled:opacity-50"
            >
              {admitLoading ? "Admitting..." : "Admit at Gate"}
            </button>
          </div>
        </div>
      )}

      {verificationResult === "USED" && verifiedTicket && (
        <div className="bg-card rounded-3xl border border-amber-300 p-6 sm:p-8 shadow-card space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">
                Already Checked In
              </span>
              <h2 className="font-display font-bold text-2xl text-primary">
                Pass Was Previously Admitted
              </h2>
            </div>
          </div>
          <p className="text-xs text-neutral-600">
            This digital pass was already admitted at the venue on{" "}
            <strong>{verifiedTicket.usedAt ? formatDate(verifiedTicket.usedAt) : "Gate Scanner"}</strong>.
          </p>
        </div>
      )}

      {verificationResult === "INVALID" && (
        <div className="bg-card rounded-3xl border border-red-200 p-6 sm:p-8 shadow-card text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7" />
          </div>
          <h2 className="font-display font-bold text-xl text-primary">Invalid Verification Token</h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {errorMessage || "No ticket matching this verification token exists in the THIGAZH system."}
          </p>
        </div>
      )}
    </div>
  );
}

export default function TicketVerificationPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-neutral-500">Loading verification tool...</div>}>
      <TicketVerificationContent />
    </Suspense>
  );
}

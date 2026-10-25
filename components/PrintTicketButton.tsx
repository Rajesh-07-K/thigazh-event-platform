"use client";

import { Printer } from "lucide-react";

export default function PrintTicketButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-primary-100 border border-primary-200 text-xs font-semibold text-primary transition-colors shadow-subtle"
    >
      <Printer className="w-4 h-4 text-accent" />
      <span>Print / Save Pass (PDF)</span>
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface TicketQRCodeProps {
  token: string;
  size?: number;
}

export default function TicketQRCode({ token, size = 160 }: TicketQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    async function generateQR() {
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        const verificationUrl = `${origin}/tickets/verify?token=${encodeURIComponent(token)}`;
        const url = await QRCode.toDataURL(verificationUrl, {
          width: size,
          margin: 1,
          color: {
            dark: "#231124",
            light: "#FFFFFF",
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error("QR Code generation error:", err);
      }
    }

    if (token) {
      generateQR();
    }
  }, [token, size]);

  if (!qrDataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-neutral-100 rounded-xl flex items-center justify-center text-xs text-neutral-400 animate-pulse border border-neutral-200"
      >
        Generating QR...
      </div>
    );
  }

  return (
    <div className="inline-block p-2 bg-white rounded-xl shadow-subtle border border-primary-100">
      <img
        src={qrDataUrl}
        alt={`Ticket QR Code for ${token}`}
        width={size}
        height={size}
        className="rounded-lg"
      />
    </div>
  );
}

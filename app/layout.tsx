import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "THIGAZH (திகழ்) — Events That Make You Shine",
  description:
    "Discover concerts, creative workshops, technology gatherings, and experiences worth remembering. High-integrity event reservations and digital ticketing.",
  keywords: ["events", "tickets", "chennai", "concerts", "workshops", "thigazh", "booking"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="flex flex-col min-h-screen bg-[#FAF8F5] text-primary selection:bg-accent/20 selection:text-primary">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

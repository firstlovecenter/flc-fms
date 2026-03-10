import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "First Love Center — Facility Management", template: "%s | First Love Center" },
  description: "Single-tenant facility management platform for modern churches — bookings, payments, maintenance, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

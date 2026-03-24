import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { GlobalDarkBackground } from "@/components/theme/global-dark-background";
import PullToRefresh from "@/components/layout/PullToRefresh";

export const metadata: Metadata = {
  title: { default: "FLC FMS — Facility Management", template: "%s | FLC FMS" },
  description: "First Love Center — Facility Management. Bookings, maintenance, and more.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FLC FMS",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1628" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <GlobalDarkBackground />
          <PullToRefresh />
          {children}
        </ThemeProvider>
        <Script id="sw-register" strategy="afterInteractive">{`
          var isProduction = ${JSON.stringify(isProduction)};
          if ('serviceWorker' in navigator) {
            if (!isProduction) {
              navigator.serviceWorker.getRegistrations().then(function(regs) {
                regs.forEach(function(reg) { reg.unregister(); });
              });
              if ('caches' in window) {
                caches.keys().then(function(keys) {
                  keys.forEach(function(key) { caches.delete(key); });
                });
              }
            } else {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                setInterval(function() { reg.update(); }, 60 * 60 * 1000);
                if (reg.waiting) {
                  reg.waiting.postMessage('SKIP_WAITING');
                }
                reg.addEventListener('updatefound', function() {
                  var newSW = reg.installing;
                  if (newSW) {
                    newSW.addEventListener('statechange', function() {
                      if (newSW.state === 'activated') {
                        newSW.postMessage('CLEAN_CACHE');
                      }
                    });
                  }
                });
              }).catch(function() {});
            }
          }
        `}</Script>
      </body>
    </html>
  );
}

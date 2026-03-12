import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { GlobalDarkBackground } from "@/components/theme/global-dark-background";

export const metadata: Metadata = {
  title: { default: "Revival Mgmt — Facility Management", template: "%s | Revival Mgmt" },
  description: "First Love Center — Facility Management. Bookings, payments, maintenance, and more.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Revival Mgmt",
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <GlobalDarkBackground />
          {children}
        </ThemeProvider>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(function(reg) {
              // Check for updates periodically
              setInterval(function() { reg.update(); }, 60 * 60 * 1000);
              // If a new SW is waiting, activate it
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
        `}</Script>
      </body>
    </html>
  );
}

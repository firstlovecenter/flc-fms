import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Outfit, DM_Serif_Display, Open_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import PullToRefresh from "@/components/layout/PullToRefresh";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

// Public/visitor type pairing, matching anagkazo-campus.com exactly:
// DM Serif Display headings over an Open Sans body. Scoped to .surface-warm;
// staff data surfaces keep Outfit.
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

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
  themeColor: "#FAF5E5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${dmSerifDisplay.variable} ${openSans.variable}`}
    >
      <body className="surface-warm font-sans antialiased">
        <ThemeProvider>
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

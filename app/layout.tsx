import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/nav/SiteHeader";
import SmoothScroll from "@/components/SmoothScroll";
import { buildCommandIndex } from "@/lib/commandIndex";

import Script from "next/script";

const montSerrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Leonardo Torres — Tech Lead & Solutions Architect",
    template: "%s · Leonardo Torres",
  },
  description:
    "Tech Lead at Getnet (Santander). Nine years designing distributed systems for aviation and payments — architecture, cloud and engineering leadership.",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden" suppressHydrationWarning>
      <body className={`${montSerrat.variable} min-h-screen bg-background antialiased flex flex-col`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <SmoothScroll />
          <SiteHeader commands={buildCommandIndex()} />
          <main className="flex-grow pt-20">{children}</main>
          <Footer />
          {process.env.NODE_ENV === 'production' && (
            <Script
              src="https://umami.leodots.dev/script.js"
              data-website-id="17a00389-820d-4753-86c5-2c28f6fe73d8"
              strategy="afterInteractive"
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}

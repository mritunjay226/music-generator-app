import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { FloatingPlayer } from "@/components/FloatingPlayer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACE Studio",
  description: "AI Music Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${inter.variable} antialiased`}
      >
        {/* Ambient Musical Aurora Background */}
        <div className="fixed inset-0 z-[-1] bg-[var(--bg)] overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/15 blur-[120px] mix-blend-multiply animate-aurora-1" />
          <div className="absolute top-[20%] right-[-10%] w-[45%] h-[50%] rounded-full bg-purple-400/10 blur-[130px] mix-blend-multiply animate-aurora-2" />
          <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[55%] rounded-full bg-cyan-400/15 blur-[140px] mix-blend-multiply animate-aurora-3" />

          {/* Subtle Grain Overlay */}
          <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
        </div>

        <Providers>
          {children}
          <FloatingPlayer />
        </Providers>
      </body>
    </html>
  );
}

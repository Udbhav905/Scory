import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./Components/Header";
import Providers from "./Providers";
import SplashScreen from "./Components/SplashScreen";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0d1b2a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://scory-one.vercel.app/"),
  title: {
    default: "Scory – Live Cricket Scores & Analytics",
    template: "%s | Scory",
  },
  description: "Real‑time cricket scores, ball‑by‑ball commentary, detailed match analysis, and tournament tracking. The ultimate platform for cricket enthusiasts and scorers.",
  keywords: ["cricket", "live scores", "match analysis", "scorecard", "tournament", "cricket stats"],
  authors: [{ name: "UDP" }],
  creator: "UDP",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Scory",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Scory",
    title: "Scory – Live Cricket Scores & Analytics",
    description: "Real‑time cricket scores, ball‑by‑ball commentary, detailed match analysis, and tournament tracking.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Scory – Cricket at your fingertips" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scory – Live Cricket Scores & Analytics",
    description: "Real‑time cricket scores, ball‑by‑ball commentary, detailed match analysis.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/`,  
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <SplashScreen />
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
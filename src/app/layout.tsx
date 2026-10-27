import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const description = "Location-specific stocking recommendations for independent shops, powered by Qloo taste data.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "ShelfSense",
  description,
  openGraph: { title: "ShelfSense", description },
  twitter: { card: "summary_large_image", title: "ShelfSense", description },
};

export const viewport: Viewport = { themeColor: "#0e2a33" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

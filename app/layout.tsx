import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Puffed - Track Your Smoke",
  description: "The social app for cigar and tobacco enthusiasts. Log, rate, discover, and share your smoke journey.",
  keywords: ["cigar", "tobacco", "smoking", "cigar app", "cigar tracking", "cigar journal"],
  authors: [{ name: "Puffed" }],
  openGraph: {
    title: "Puffed - Track Your Smoke",
    description: "The social app for cigar and tobacco enthusiasts.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d0d0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased smoke-bg`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Nimu - AI Video & Audio Creation Platform";
const siteDescription =
  "Transform your ideas into professional videos and audio content in minutes. Nimu uses cutting-edge AI technology to power your creative workflow with multi-model support for Veo3, Runway, and Pika.";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: "%s | Nimu",
  },
  description: siteDescription,
  keywords: [
    "AI video generation",
    "AI audio synthesis",
    "video creation",
    "Veo3",
    "Runway",
    "Pika",
    "AI content creation",
    "video editing",
    "audio generation",
    "creative AI tools",
  ],
  authors: [{ name: "Nimu Contributors" }],
  creator: "Buddhsen Tripathi",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    siteName: "Nimu",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nimu - AI Video & Audio Creation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

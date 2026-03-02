import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/header";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AdGen — Professional Ad Generator That Actually Works",
  description:
    "Enter your business. Pick from generated concepts. Get publish-ready ads with your brand, pricing & CTA baked in — under 60 seconds.",
  keywords: ["ad generator", "marketing automation", "ad design", "ad creation", "professional ads"],
  openGraph: {
    title: "AdGen — Professional Ad Generator That Actually Works",
    description: "Publish-ready ads in 60 seconds. No design skills. No Photoshop.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} font-body antialiased bg-background text-foreground`}
      >
        <Header />
        <main className="min-h-screen">{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

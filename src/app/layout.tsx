import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AdGen AI - AI-Powered Marketing Design Platform",
  description: "Generate stunning, publish-ready marketing ads in seconds. No design skills required.",
  keywords: ["AI", "marketing", "design", "ads", "automation", "generative AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

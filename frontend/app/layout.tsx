import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RHYNEX — Dark-Web Threat Actor Attribution",
  description:
    "Rynex links dark-web threat actors across marketplaces into ranked, explainable attribution confidence.",
  icons: {
    icon: [{ url: "/favicon.webp", type: "image/webp" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#fafafa] text-neutral-900">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

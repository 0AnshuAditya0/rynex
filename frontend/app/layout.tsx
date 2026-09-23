"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

function NavLinks() {
  const pathname = usePathname();

  const links = [
    { href: "/overview", label: "Overview" },
    { href: "/search", label: "Search" },
    { href: "/export", label: "Export" },
  ];

  return (
    <div className="flex items-center gap-6 text-sm font-medium">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`transition ${
              isActive
                ? "text-sky-400 font-semibold border-b-2 border-sky-400 pb-0.5"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#0a0e17] text-slate-100">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-800/80 bg-[#0f172a]/90 backdrop-blur sticky top-0 z-50">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
              <Link href="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-lg text-xs font-mono">
                  v0.1
                </span>
                Rynex
              </Link>
              <NavLinks />
            </nav>
          </header>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}

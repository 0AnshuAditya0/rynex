"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/overview", label: "Dashboard" },
    { href: "/search", label: "Search" },
    { href: "/metrics", label: "Metrics" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/export", label: "Export" },
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
    <nav className="hidden items-center justify-end gap-7 md:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`font-mono text-xs font-bold tracking-[0.18em] transition ${
            pathname === link.href ? "text-neutral-900" : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          {link.label.toUpperCase()}
        </Link>
      ))}
    </nav>
    <button
      type="button"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      className="flex size-10 items-center justify-center border border-neutral-300 bg-white text-neutral-900 md:hidden"
    >
      {open ? <X className="size-5" /> : <Menu className="size-5" />}
    </button>
    {open && (
      <div className="absolute inset-x-4 top-full z-50 border border-neutral-200 bg-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.3)] md:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={`block border-b border-neutral-100 px-5 py-3.5 font-mono text-xs font-bold tracking-[0.18em] last:border-b-0 ${
              pathname === link.href ? "bg-blue-50 text-blue-700" : "text-neutral-700"
            }`}
          >
            {link.label.toUpperCase()}
          </Link>
        ))}
      </div>
    )}
    </>
  );
}

function PrototypeBadge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay slightly so it reads as a notification arriving, not layout.
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed left-3 top-14 z-[60] flex items-center gap-2 border border-amber-300 bg-amber-50/95 px-2.5 py-1 shadow-[0_8px_30px_-12px_rgba(217,119,6,0.5)] backdrop-blur sm:top-2"
    >
      <span className="relative flex size-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping bg-amber-500 opacity-60" />
        <span className="relative inline-flex size-1.5 bg-amber-600" />
      </span>
      <p className="whitespace-nowrap font-mono text-[10px] font-bold tracking-widest text-amber-800">
        PROTOTYPE — SYNTHETIC DEMO DATA
      </p>
      <button
        type="button"
        aria-label="Dismiss prototype notice"
        onClick={() => setVisible(false)}
        className="ml-1 shrink-0 font-mono text-sm leading-none text-amber-500 transition hover:text-amber-800"
      >
        ×
      </button>
    </div>
  );
}

export default function Shell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  return (
    <>
        <PrototypeBadge />
        <div className="min-h-screen flex flex-col">
          <header className={`z-50 bg-transparent ${isLanding ? "absolute inset-x-0 top-0" : "relative"}`}>
            <div className="relative mx-auto w-full max-w-[1440px] px-4 pt-3 sm:px-8 lg:px-12">
              <p className="absolute left-1/2 top-3 -translate-x-1/2">
                <Link href="/" aria-label="RHYNEX home">
                  <Image src="/content.webp" alt="RHYNEX" width={1983} height={793} className="h-14 w-auto" priority />
                </Link>
              </p>
              <div className="flex items-center justify-end pt-3">
                <NavLinks />
              </div>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="relative overflow-hidden border-t-4 border-blue-700 bg-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-[8%] top-4 h-20 w-20"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(29,78,216,0.3) 1.2px, transparent 1.2px)",
                backgroundSize: "14px 14px",
              }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute left-[4%] top-6 h-8 w-8 bg-blue-600/70" />
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 200">
              <circle cx="1290" cy="100" r="90" fill="none" stroke="rgba(29,78,216,0.18)" strokeWidth="1.5" />
              <line x1="0" y1="150" x2="1440" y2="30" stroke="rgba(29,78,216,0.12)" strokeWidth="1" />
            </svg>
            <div className="relative mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center bg-blue-700 font-mono text-sm font-black text-white">R</span>
                    <span className="text-lg font-black tracking-tight text-neutral-900">RYNEX</span>
                  </p>
                  <p className="mt-3 max-w-sm text-xs leading-relaxed text-neutral-600">
                    Dark-web threat-actor attribution PoC. Handles, keys, wallets and
                    hidden-service footprints — fused into ranked, explainable confidence.
                  </p>
                  <p className="mt-3 font-mono text-[11px] tracking-widest text-neutral-400">
                    ALL DATA IS SYNTHETIC — DEMONSTRATION ONLY
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-neutral-900">INVESTIGATE</p>
                  <div className="mt-3 flex flex-col gap-2 text-sm">
                    <Link href="/overview" className="text-neutral-600 transition hover:text-blue-700">Dashboard</Link>
                    <Link href="/search" className="text-neutral-600 transition hover:text-blue-700">Search</Link>
                    <Link href="/watchlist" className="text-neutral-600 transition hover:text-blue-700">Watchlist</Link>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-neutral-900">SYSTEM</p>
                  <div className="mt-3 flex flex-col gap-2 text-sm">
                    <Link href="/metrics" className="text-neutral-600 transition hover:text-blue-700">Metrics</Link>
                    <Link href="/export" className="text-neutral-600 transition hover:text-blue-700">Export</Link>
                    <Link href="/" className="text-neutral-600 transition hover:text-blue-700">Home</Link>
                  </div>
                </div>
              </div>
              <div className="mt-10 flex flex-col gap-2 border-t border-neutral-200 pt-5 font-mono text-[11px] tracking-widest text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
                <span>RYNEX v0.1 // INTEL</span>
                <span>DATA × TRANSPARENCY × TRUST</span>
              </div>
            </div>
          </footer>
        </div>
    </>
  );
}

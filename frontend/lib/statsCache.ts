/** Stale-while-revalidate cache for summary stats (localStorage).
 *
 * Purpose: hero/overview stat cards render instantly from last-known values
 * when the backend is slow or down, instead of blank boxes. Freshness is
 * always shown via lastSynced — cached numbers are never passed off as live.
 */

export interface HeroStatsCache {
  actors: number | null;
  infraMatches: number | null;
  rebrands: number | null;
  categories: number | null;
  lastSynced: string;
}

export interface OverviewStatsCache {
  actorsLoaded: number | null;
  active: number | null;
  rebranded: number | null;
  inactive: number | null;
  lastSynced: string;
}

const HERO_KEY = "rynex_hero_stats";
const OVERVIEW_KEY = "rynex_overview_stats";

function read<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota — caching is best-effort, never fatal.
  }
}

export function getCachedHeroStats(): HeroStatsCache | null {
  return read<HeroStatsCache>(HERO_KEY);
}

export function setCachedHeroStats(stats: Omit<HeroStatsCache, "lastSynced">): HeroStatsCache {
  const entry: HeroStatsCache = { ...stats, lastSynced: new Date().toISOString() };
  write(HERO_KEY, entry);
  return entry;
}

export function getCachedOverviewStats(): OverviewStatsCache | null {
  return read<OverviewStatsCache>(OVERVIEW_KEY);
}

export function setCachedOverviewStats(stats: Omit<OverviewStatsCache, "lastSynced">): OverviewStatsCache {
  const entry: OverviewStatsCache = { ...stats, lastSynced: new Date().toISOString() };
  write(OVERVIEW_KEY, entry);
  return entry;
}

export function formatSynced(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

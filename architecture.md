# RYNEX Architecture

## 1. Big picture

```
SEED DATA (JSON, synthetic)
  actors.json (200) ─┐
  posts.json (796) ──┼─► data_store.py (in-memory, process lifetime)
  infra_examples.json ┘
                              │
  ┌─────────────────────────────┼─────────────────────────────────┐
  │                    FastAPI (port 8000)                        │
  │  /actors  /search  /graph  /posts  /infra  /export            │
  │  /metrics (calibration, infra-summary)  /scan  /watchlist     │
  └─────────────────────────────┼─────────────────────────────────┘
                              │ JSON
  ┌─────────────────────────────┼─────────────────────────────────┐
  │              Next.js 16 (port 3000)                           │
  │  landing / overview / search / metrics / watchlist /         │
  │  export / actors/[id]  +  localStorage SWR cache             │
  └───────────────────────────────────────────────────────────────┘
```

No database in the live path. `seed.py` (MongoDB/Neo4j) exists for a
production-shaped store but the running API reads only `data_store.py`.
That is a deliberate PoC tradeoff, documented here instead of hidden.

## 2. Attribution pipeline (per actor)

`app/helpers/actor_pipeline.py :: compute_actor_confidence()`

1. **Entity resolution** (`entity_resolution.py`) — exact shared PGP/wallet
   match → `identifier_match` 1.0 + `matched_actor_id`. Deterministic.
2. **Stylometry** (`stylometry.py`) — TF-IDF cosine of the pair, calibrated
   to a percentile against ~198 background actors. Percentile (not raw
   similarity) feeds the score, so verbosity can't game it.
3. **Behavioural** (`behavioural.py`) — 0.5 posting-time bucket similarity
   + 0.5 identifier-hygiene (platform overlap + breadth). 0.0 only when no
   candidate exists to compare against (legitimate zero, shown plainly).
4. **Infra** (`infra_correlation.py`) — best `combined_infra_score` across
   the actor's onions (cert/banner matches + descriptor flag bonus).
5. **Fusion** (`confidence.py`) — weights 0.4 / 0.25 / 0.25 / 0.1.
   Every response carries the full breakdown; the UI renders it verbatim.

Trust links (`find_trust_links`) are graph-only: shared clearnet indicator
or shared platform+category (category required — platform alone fires on
~3,300 pairs; constrained it yields 468, max 7 per actor, capped to top-3
per ego graph with the hidden count returned, never silently dropped).

## 3. Endpoints worth knowing

| Endpoint | Computes |
|---|---|
| `GET /actors?limit=&category=&status=` | filtered list + live confidence each |
| `GET /actors/{id}` | profile + confidence + stylometry + behavioural detail + infra |
| `GET /graph/{id}` | ego graph: identifiers, SAME_AS, TRUSTS (capped) + `trust_hidden` |
| `GET /metrics/calibration` | stylometry-only retrieval vs 3 ground-truth pairs (Top-1/Top-5/MRR/ROC-AUC + curves) |
| `GET /metrics/infra-summary` | dataset-wide signal aggregation (drives landing + metrics panels) |
| `POST /scan/trigger`, `GET /scan/status` | SIMULATED feed ticks (in-memory demo posts) |
| `GET /watchlist?min_confidence=` | threshold filter over live scores |
| `GET /export?format=csv\|json\|pdf\|html` | full-set reports; `/export/actor/{id}` per-case PDF |
| `GET /infra/sample-artifact` | real X.509 parse of a locally generated sample cert |

## 4. Frontend notes

- Typed client in `lib/api.ts`; every number on screen traces to an endpoint
  (verified side-by-side repeatedly during build).
- `lib/statsCache.ts` — stale-while-revalidate for landing/Overview stat
  cards (`rynex_hero_stats`, `rynex_overview_stats`): render cache instantly,
  refresh in background, keep cache silently on failure, honest
  `-- (backend unavailable)` only when no cache exists. Freshness always
  shown via `Last synced`.
- Known performance trait: `/actors?limit=500` takes ~8s (200 live
  confidence computations). Pages show honest loading states; the cache
  above exists precisely because of this.

## 5. Known limitations (say these before a judge finds them)

- n=3 ground-truth pairs: calibration curves illustrate separation, not a
  generalization claim. Stated on the page itself.
- Collection is simulated; Tor crawling, RBAC, STIX/MISP, alerting are
  roadmap, not built. The site says so.
- Hygiene sub-signal is weak on this dataset (all actors single-platform);
  posting-time carries the behavioural separation. Reported, not hidden.

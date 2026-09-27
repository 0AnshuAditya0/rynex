# RYNEX — Dark-Web Threat Actor De-anonymization (PoC)

Rynex links dark-web threat actors across marketplaces, forums and rebranded
personas into ranked, explainable attribution confidence. Handles, PGP keys,
wallets and hidden-service footprints go in — one confidence score with a
visible four-signal breakdown comes out.

> **Scope:** prototype on synthetic demo data (200 actors, 796 posts).
> Simulated collection feed, honestly labeled wherever it appears.

## Quickstart

**Backend** (FastAPI, in-memory store — no database needed):

```powershell
cd backend
..\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --port 8000
# health: http://localhost:8000/health
# API docs: http://localhost:8000/docs
```

**Frontend** (Next.js 16):

```powershell
cd frontend
npm install
npm run dev
# open: http://localhost:3000
```

The frontend expects the API at `http://localhost:8000`
(`NEXT_PUBLIC_API_URL` override supported). Keep both ports as-is —
backend CORS only allows `localhost:3000`.

## What it does

| Capability | Where | Notes |
|---|---|---|
| Entity resolution (shared PGP/wallet → SAME_AS) | `/actors/[id]`, graph | Deterministic, evidence shown |
| Trust links (shared infra / platform+category → TRUSTS) | graph, capped top-3 | Weak signal, dotted gray, never conflated with SAME_AS |
| Stylometric persona ID (TF-IDF + background calibration) | `/metrics` | 3/3 rebrands rank #1 of ~199 |
| Behavioural profiling (posting-time + identifier hygiene) | confidence breakdown | Real signal, was a 0.0 stub |
| Infra correlation (cert/banner/favicon + descriptor checks) | actor profile | Plus real X.509 sample parser demo |
| Confidence fusion (0.4 / 0.25 / 0.25 / 0.1) | every actor | Full breakdown, no black box |
| Threshold watchlist | `/watchlist` | Static view, not alerting |
| Exports CSV / JSON / HTML / PDF + per-actor case report | `/export` | xhtml2pdf, pure Python |
| Simulated collection feed + stale-while-revalidate stats cache | `/metrics`, landing | Labeled SIMULATED; survives backend hiccups |

## Repo layout

```
backend/
  app/main.py            # FastAPI app + router wiring
  app/data_store.py      # in-memory store (seed_data JSON)
  app/routers/           # actors, search, graph, posts, infra, export,
                         # metrics (calibration + infra-summary), scan, watchlist
  app/services/          # entity_resolution, stylometry, infra_correlation,
                         # confidence, behavioural, artifact_parser
  seed_data/             # actors.json, posts.json, infra_examples.json, sample_cert.pem
  seed.py                # optional MongoDB/Neo4j seeding (NOT used by live API)
frontend/
  app/                   # landing, overview, search, metrics, watchlist, export, actors/[id]
  components/            # GraphViewer, ConfidenceBadge, InfraCorrelationView,
                         # ScanFeed, SearchBar, ExportButton, AbstractBg, ...
  lib/api.ts             # typed API client
  lib/statsCache.ts      # localStorage SWR cache (rynex_hero_stats, rynex_overview_stats)
```

See `architecture.md` for system design and `script.md` for the demo video walkthrough.

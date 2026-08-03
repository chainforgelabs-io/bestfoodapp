# Places import + SEO rollout runbook

## Prerequisites

1. Production `MONGODB_URI` available locally (importer never runs on Vercel).
2. StatCan 2021 CSD GeoJSON → `backend/lib/places/data/csd-2021.geojson`
3. Overture extract(s) via `overturemaps` CLI (see `backend/lib/places/data/README.md`)

## Phase order

### 1. Cities (national, once)

```bash
npm run places:import-cities -- --file=backend/lib/places/data/csd-2021.geojson
```

Smoke: Saskatoon pop ≈ 266141, Regina ≈ 226404.

### 2. Backfill restaurant slugs

```bash
npm run seo:backfill-slugs
```

### 3. Places batches (confirm each until autopilot)

```bash
# Saskatoon
npm run places:import -- --file=backend/lib/places/data/sk-places.geojson --batch=saskatoon --city=saskatoon --province=SK --release=YYYY-MM-DD.0
```

Then open `/admin/places`, edit/approve the batch. System records corrections.

Repeat: Regina → rest of SK → Alberta → national.

QA gate after Saskatoon: compare coverage to `healthinspections.saskatchewan.ca` manually (do not scrape). If Overture misses >20% of licensed establishments, pause expansion.

### 4. Autopilot

After ~3 batches with edit rate &lt; 2%, toggle Autopilot ON in `/admin/places`.

### 5. Monthly resync

```bash
npm run places:resync -- --file=... --release=... --out=backend/lib/places/data/resync-report.json
```

Review report before any apply (apply is manual / future tooling).

### 6. SEO verification

- `curl -s https://bestfoodapp.com/sitemap.xml | head`
- `curl -s https://bestfoodapp.com/restaurant/<slug> | grep application/ld+json`
- Rich Results Test on a restaurant URL
- Admin `/admin/seo` for metrics

### 7. Sitemap invariant test

```bash
npm run seo:test-sitemap
```

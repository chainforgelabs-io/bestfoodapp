# Places import local data (gitignored)

Drop source extracts here before running scripts.

## Cities (StatCan 2021 CSD)

1. Download the Census Subdivision cartographic boundary file (2021) from Statistics Canada.
2. Convert shapefile → GeoJSON locally (e.g. `ogr2ogr -f GeoJSON csd-2021.geojson ...`).
3. Optionally join population attributes into the same GeoJSON properties.
4. Save as `csd-2021.geojson` in this folder.
5. Run: `node backend/lib/places/scripts/importCities.js`

Smoke test expectations: Saskatoon population 266141, Regina 226404 (`csdUid` 4711066 / 4706027 area — verify against file).

## Places (Overture)

```bash
# macOS often has pip3, not pip
python3 -m pip install overturemaps

# Saskatchewan bbox → ~50–70 MB GeoJSON
python3 -m overturemaps download \
  --bbox=-110.1,48.9,-101.1,60.1 \
  -f geojson \
  --type=place \
  -o backend/lib/places/data/sk-places.geojson
```

Then filter to one city batch (point-in-polygon against imported cities):

```bash
npm run places:import -- \
  --file=backend/lib/places/data/sk-places.geojson \
  --batch=saskatoon \
  --city=saskatoon \
  --province=SK \
  --release=2026-07-23.0
```

Expect ~600–900 Saskatoon eat/drink rows; importer aborts if &lt;300 or &gt;1500.
Current Overture schema uses `taxonomy.hierarchy` (`food_and_drink`) plus `categories.primary`.

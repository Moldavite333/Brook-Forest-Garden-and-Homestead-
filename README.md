# High Altitude Garden Planner — v0.1

**Your property. Not your county.** A private, offline-first garden field notebook and property-specific cultivar screening app.

## Working now
- Six editable Brook Forest growing areas (descriptions provisional)
- Add/edit exact varieties, paste catalog text to suggest fields, verify before saving
- **Will It Grow Here?** with transparent, conservative sunlight, soil, nighttime low, moisture, weed and growing-window checks
- Journal trials by cultivar, area, and season; log flowering, fruiting, drought, frost, harvest and interventions
- Record local weather, import a basic timestamp/metric/value CSV or Ecowitt-style dateutc/tempf CSV
- Automatically flag suspicious snow-depth changes >6 inches inside 3 hours; preserve original measurement and manually verified override
- Optional regional 7-day modeled Open-Meteo forecast when coordinates supplied privately
- IndexedDB storage in the current browser, offline shell, full backup/restore JSON

## Not yet supported
**No live weather-station integration** and no sync with the existing Brook Forest Weather app yet. No automatic seed-catalog URL fetching, packet photo recognition, modeled historical climate fitting, multi-device sync, account management or guaranteed survival predictions.

## Install
Host the files at the root of a GitHub Pages site or any static HTTPS host. Enable Pages for the repository's main branch and root folder. Visit the site on an Android phone and choose Chrome → Add to Home screen/Install app when offered.

## Critical privacy + backup
This repository is public. Do not commit real property coordinates, personal garden records, photos, API keys, or sensor keys. The UI stores entered coordinates and journals locally in the browser via IndexedDB (fallback: localStorage). Data is **not synced** between devices. Export JSON backups regularly using Data → Export full JSON backup. When fetching optional modeled weather, the supplied coordinates are sent to Open-Meteo.

## Station integration plan
Implement a private server-side intake endpoint with credential handling, sensor provenance, local history and backfill. Do not place Ecowitt/Ambient API secrets in GitHub Pages. Add real observation and QC flags to a secure database before calling data property-specific. Eventually integrate with Brook Forest Weather ingestion while maintaining distinct plant and weather entities.

## CSV example
```csv
timestamp,metric,value,zone,source
2026-09-24T07:15:00-06:00,night_low_f,38.2,zone-kitchen,manual
2026-10-09T08:00:00-06:00,snow_depth_inches,6.2,,snow gauge
```
Accepted metrics: `night_low_f`, `air_temp_f`, `soil_temp_f`, `rain_inches`, `snow_depth_inches`. Ecowitt-style `dateutc,tempf` data is imported as **air temperature snapshots**, not nighttime lows.

## Design guardrails
- Never convert regional weather estimates into observed site measurements.
- Never invent unknown cultivar metadata or published growing-degree days.
- Do not treat correlation between cold nights and crop failure as proof.
- Keep flagged raw readings when storing a verified manual value.
- All outcomes and assessments must be revisable as local evidence accumulates.

## Local smoke test
Serve via `python -m http.server 8000`, open `http://localhost:8000`. (Offline service workers require secure context / localhost.) 

# esm-etl-app

An O3 single-page application for administering the EthiopiaEMR ETL (Extract-Transform-Load) process. It replaces the legacy Groovy/GSP page (`ethiopiaemretl/etl/sync.page`) with a fully O3-native interface that renders inside the standard shell, providing at-a-glance health metrics, safe and destructive sync controls, and a per-table status breakdown — all without any backend changes.

## Route

| Path | Description |
|------|-------------|
| `/openmrs/spa/etl-admin` | ETL administration dashboard |

The app-menu tile in `esm-clinical-workflow-app` links directly to this route.

## Backend dependency

| Module | Minimum version | Purpose |
|--------|-----------------|---------|
| `ethiopiaemretl` | `>= 1.0.0` | Exposes the three REST endpoints this app consumes (sync status, incremental sync, table recreate) |

The app wraps three existing `EtlSyncController` endpoints:

| Endpoint | Method | Action |
|----------|--------|--------|
| `/ws/rest/v1/ethiopiaemretl/sync/status` | `GET` | Fetch per-table sync status |
| `/ws/rest/v1/ethiopiaemretl/sync` | `POST` | Trigger an incremental ETL refresh |
| `/ws/rest/v1/ethiopiaemretl/recreate` | `POST` | Drop and rebuild all ETL flat tables |

## Distro configuration

For the app to appear in the deployed import map, add it to the distro's `frontend/spa-assemble-config.json`:

```json
{
  "frontendModules": {
    "@palladium-ethiopia/esm-etl-app": "next"
  }
}
```

This is a separate change in the distro repository and is required before the app is accessible in production.

## Features

### Status hero strip
Three at-a-glance metric tiles summarise the current ETL state: overall health (healthy vs. N tables failed), the most recent sync time expressed as a relative duration, and the total number of tables tracked. The strip is hidden while data is loading so it never shows stale values.

### Incremental refresh
Triggers the ETL's standard incremental sync — picks up new and changed records since the last run without touching existing data. Safe to run at any time without disrupting reports. A spinner replaces the button label while the operation is in progress, and both action buttons are disabled to prevent concurrent runs.

### Destructive recreate
Drops and rebuilds every ETL flat table, then fully repopulates from scratch. Because this makes reports incomplete until it finishes, clicking the button opens a Carbon danger `Modal` that requires explicit confirmation before the POST is sent. A red accent and a "Destructive" tag on the card make the severity visually clear.

### Per-table status table
Shows each flat table's last sync time, status (green/red tag with icon), duration in milliseconds, and records processed. Table names are rendered in a monospaced font. Last sync times are shown as relative durations (e.g. "3 hours ago") with the exact local timestamp available on hover via a `DefinitionTooltip`.

### UTC timezone fix
The backend returns `last_sync` as a naive MySQL `DATETIME` string in UTC (`NOW()` on the database server equals `UTC_TIMESTAMP()` because the DB runs in UTC). The `parseSyncTime` helper parses the string explicitly as UTC using the dayjs UTC plugin and converts it to the viewer's local timezone, so relative times and tooltip timestamps are correct regardless of where the viewer is located.

## Development

```bash
# Install dependencies from the monorepo root
yarn install

# Start a dev server for this app only
yarn start --sources 'packages/esm-etl-app'
```

The dev server proxies API calls to the backend configured in `.env` (copy `example.env` to get started).

## Tests

```bash
yarn test --filter @palladium-ethiopia/esm-etl-app
```

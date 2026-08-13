# esm-shr-app

An O3 single-page application for administering the EthiopiaEMR Shared Health Record (SHR) outbox — the queue of clinical records waiting to be sent to Ethiopia's national Shared Health Record. It gives site administrators a view of that queue and the ability to act on it, which previously required a SQL client against the tenant database.

## Route

| Path | Description |
|------|-------------|
| `/openmrs/spa/shr-admin` | SHR administration dashboard |

## Backend dependency

| Module | Minimum version | Purpose |
|--------|-----------------|---------|
| `ethiopiaemr-module-shr` | `>= 1.0.2` | Exposes the three REST endpoints this app consumes |

The app wraps three `ShrOutboxAdminController` endpoints, all of which require the **`Manage SHR Outbox`** privilege:

| Endpoint | Method | Action |
|----------|--------|--------|
| `/ws/rest/v1/ethiopiaemrshr/outbox/list` | `GET` | A page of outbox rows, per-status counts, filter and paging |
| `/ws/rest/v1/ethiopiaemrshr/outbox/sync` | `POST` | Send a bounded batch of queued records now |
| `/ws/rest/v1/ethiopiaemrshr/outbox/retry/{id}` | `POST` | Requeue one failed or dead-lettered record and send it |

Nobody holds `Manage SHR Outbox` by default. Grant it to the appropriate role, or every request returns `{"status":"error"}` and the page shows a permission message.

The same privilege gates the frontend, following the pattern in `esm-admin-app`: it is declared on the page and on the nav tile extension in `routes.json`, and `Root` redirects an authenticated user without it back to `home` rather than letting them sit on a page whose every request will be refused. The privilege string lives in `src/permissions.constants.ts`.

## Distro configuration

Registered in the distro's `frontend/spa-assemble-config.json`:

```json
{
  "frontendModules": {
    "@palladium-ethiopia/esm-shr-app": "next"
  }
}
```

That is a separate change in the distro repository and is required before the app is reachable in a deployed environment.

## Features

### Overview strip
Three metric tiles summarise the queue: health (all sent / N waiting / N need attention), the most recent activity as a relative time, and the total number of records in the outbox. Hidden while loading so it never shows stale values.

### Status breakdown
A row of Carbon tags showing how many records sit in each state — Pending, Submitted, Sent, Failed, Dead letter. All five are always shown, including zeroes: "0 failed" is information, whereas an absent row leaves the reader unsure whether it was checked.

### Send queued records
Sends waiting records immediately rather than at the daily scheduled task. Bounded to 50 per press, because the push is synchronous inside the request — an unbounded drain of a large backlog would hold the request open until it timed out and fire the whole backlog at OpenFn at once. The response reports how many remain, so the button can simply be pressed again. Disabled when nothing is pending.

### Per-record retry
Failed and dead-lettered records get a Retry action. The server decides what is retryable (`row.retryable`) rather than the UI re-deriving the rule, so the two cannot disagree. A retry requeues the record — resetting its retry counter — and pushes it immediately, so the outcome is visible without waiting for a scheduler tick.

### Honest status language
`SUBMITTED` is styled blue, not green, and the copy says the record was "handed to OpenFn". That is not delivery: OpenFn has accepted the work order, and the module's status-poll task resolves it to `SENT` or `FAILED` once the job actually runs. Only `SENT` means the record reached the SHR.

### Long error text
Errors from OpenFn and the SHR run to ~300 characters and would otherwise dictate the row height for the whole table. The cell clamps to two lines; the full text is available on hover via a `DefinitionTooltip`.

### Polling
The list refreshes every 30 seconds, but polling pauses while a send or retry is in flight — a refresh landing mid-push would redraw the table underneath the user and could show a row in a state the action is about to change.

## Development

```bash
# Install dependencies from the monorepo root
yarn install

# Start a dev server for this app only
yarn start --sources 'packages/esm-shr-app'
```

The dev server proxies API calls to the backend configured in `.env` (copy `example.env` to get started).

## Tests

```bash
yarn test --filter @palladium-ethiopia/esm-shr-app
```

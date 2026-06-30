# esm-reports-app

An O3 single-page application that brings the EthiopiaEMR reporting suite into the OpenMRS 3 shell. It provides a left-navigation report browser organised by category, a dynamic parameter form for each report, on-screen tabular results, and one-click downloads of available report designs (e.g. Excel templates).

## Routes

| Path | Description |
|------|-------------|
| `/openmrs/spa/reports` | Root — shows the info landing page until a report is selected |
| `/openmrs/spa/reports/:reportUuid` | Report runner for the selected report UUID |

## Backend dependencies

| Module | Minimum version | Purpose |
|--------|-----------------|---------|
| `ethiopiaemrreports` | `>= 1.0.0` | Serves the grouped report list and report details via legacy fragment actions |
| `reporting` | `>= 1.27.0` | Core OpenMRS Reporting module — evaluates report definitions |
| `reportingrest` | `>= 1.15.0` | REST API used to run reports and stream result datasets |

The app communicates with two distinct API layers. The grouped report list and per-report details (including parameter definitions and available rendering designs) come from legacy servlet-container fragment actions exposed by `ethiopiaemrreports` (`/ethiopiaemrreports/report/reportUtils/...`). Actual report evaluation and result retrieval use the standard `reportingrest` REST API. Both paths must be proxied through the O3 gateway.

## Features

### Left-navigation report browser
Reports returned by the backend are grouped into categories (e.g. Common, Cohort Analysis, EHR Reports) and rendered in the O3 left nav. Selecting a report navigates to its runner page.

### Dynamic parameter form
Each report declares zero or more parameters with a name, display label, and Java type. The runner renders the appropriate Carbon input for each parameter — a `DatePicker` for any `java.util.Date`-typed parameter, and a `TextInput` for everything else. The Run and Download buttons are disabled until all parameters are filled.

### On-screen results table
After a report runs, each result dataset is displayed in a scrollable Carbon `DataTable`. Columns are rendered in the dataset's server-declared order — the `metadata.columns` returned by `reportingrest`, i.e. the SQL `SELECT` order — so tables match the source paper layout rather than the hash order of the per-row JSON. Datasets that exist only to feed a report design template are hidden (see [Report layout](#report-layout)).

### Report design downloads
If a report has one or more rendering designs (e.g. an Excel template), a Download button is shown for each. Downloads are generated server-side and streamed to the browser; an `AbortController` cancels any in-flight download when the user navigates away.

## Report layout

The app needs **no per-report configuration** — column order and hidden datasets are both derived from data the backend already returns, so adding a report requires no frontend change.

- **Column order** comes from each dataset's `metadata.columns` (the SQL `SELECT` order preserved by `reportingrest`). Any column present in the data but absent from `metadata.columns` is appended rather than dropped; if the server omits metadata entirely, the renderer falls back to the row keys.
- **Hidden feeder datasets** are derived from each `ReportDesign`'s `repeatingSections` (`dataset:<name>` tokens, fetched via the `v=custom:(uuid,name,properties)` representation). A dataset named there feeds a template (e.g. an Excel export) and is hidden from the on-screen tables; everything else is shown. The captured name is matched against each dataset's `definition.name`, so a report's dataset key and its `DataSetDefinition` name must agree. If the designs can't be read, nothing is hidden — a visible feeder is preferable to a broken page.

## Development

```bash
# Install dependencies from the monorepo root
yarn install

# Start a dev server for this app only
yarn start --sources 'packages/esm-reports-app'
```

The dev server proxies API calls to the backend configured in `.env` (copy `example.env` to get started).

## Tests

```bash
yarn test --filter @palladium-ethiopia/esm-reports-app
```

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
After a report runs, each result dataset is displayed in a scrollable Carbon `DataTable`. Column order is controlled by the `columnOrderByUuid` config (see below) so that tables match the source paper layout rather than the alphabetical order that the REST API returns.

### Report design downloads
If a report has one or more rendering designs (e.g. an Excel template), a Download button is shown for each. Downloads are generated server-side and streamed to the browser; an `AbortController` cancels any in-flight download when the user navigates away.

## Configuration

Configuration is managed through the O3 config system (`@openmrs/esm-framework`). The schema is defined in `src/config-schema.ts`.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `columnOrderByUuid` | `Object` | See schema | Map of report UUID → ordered column name array. Columns are rendered in this order; columns present in the data but not listed are appended at the end. |
| `hiddenDatasets` | `Array<string>` | `["immRegisterExcel"]` | Dataset names that feed an Excel template only and should not appear in the on-screen table. |

Example configuration override:

```json
{
  "@palladium-ethiopia/esm-reports-app": {
    "columnOrderByUuid": {
      "your-report-uuid-here": ["Column A", "Column B", "Column C"]
    },
    "hiddenDatasets": ["excelOnlyDataset"]
  }
}
```

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

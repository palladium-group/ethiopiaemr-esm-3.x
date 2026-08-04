# @palladium-ethiopia/esm-radiology-imaging-app

Radiology imaging workflow microfrontend for EthiopiaEMR / OpenMRS 3 — worklists, appointment scheduling, PACS integration, and reporting.

Part of the [ethiopiaemr-esm-3.x](https://github.com/palladium-group/ethiopiaemr-esm-3.x) monorepo.

## Development

From the monorepo root:

```bash
yarn install
yarn turbo run typescript --filter=@palladium-ethiopia/esm-radiology-imaging-app
yarn start --sources packages/esm-radiology-imaging-app --backend http://localhost --port 8095
```

Or from this package directory:

```bash
yarn start --backend http://localhost
```

## Build

```bash
yarn turbo run build --filter=@palladium-ethiopia/esm-radiology-imaging-app
```

## Configuration

Module config key: `@palladium-ethiopia/esm-radiology-imaging-app`

See `src/config-schema.ts` for available options (PACS URL, radiology order type UUID, appointment location, etc.).

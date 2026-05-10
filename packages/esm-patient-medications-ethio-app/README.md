# Ethiopia patient medications microfrontend (`esm-patient-medications-ethio-app`)

This package is **Palladium Ethiopia’s** place for **custom medication behaviour** in the patient chart. It replaces only the medications **dashboard body** extension from **`@openmrs/esm-patient-medications-app`** while you can keep the rest of that app (order basket, workspaces, etc.).

## Extension id

- **Extension name:** **`medications-details-widget-ethio`** (distinct from community’s **`medications-details-widget`**).
- **Slot:** **`patient-chart-medications-dashboard-slot`**
- **Component export:** **`medicationsSummary`** (wired in `src/index.ts`)

The dashboard UI is ported from community: **`MedicationsSummary`**, **`MedicationsDetailsTable`**, **`api/`**, **`print/`**, config schema, and **`translations/en.json`** keys used by that UI.

## Distro configuration

When both **`@openmrs/esm-patient-medications-app`** and this module load, remove the community widget from that slot via SPA frontend config so only the Ethio extension shows (this module attaches itself via `routes.json`; you only need **`remove`** for community):

```json
"@openmrs/esm-patient-chart-app": {
  "extensionSlots": {
    "patient-chart-medications-dashboard-slot": {
      "remove": ["medications-details-widget"]
    }
  }
}
```

Adjust the key/layout to match how your distro merges `frontendConfiguration` (`dev-config.json`, GP, assemble, etc).


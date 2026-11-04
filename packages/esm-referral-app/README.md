# esm-referral-app

O3 frontend for `ethiopiaemr-module-referral`. Mounted at `/openmrs/spa/referral`.

- **Incoming / Outgoing** — work lists, defaulting to the referrals that need action here.
- **Referral page** — the full referral, its action history, and the buttons its status allows (submit, send, cancel, accept, reject, refer back, send feedback, re-refer).
- **New referral** — `/referral/new`, optionally `?patientUuid=<uuid>` to prefill from a registered patient.
- **Dashboard** — counts by status, acceptance rate, average response time, rejection reasons.
- **Catchment** — destinations selected from the Master Facility Registry, plus the services this facility refers for (needs `Manage Referral Catchment`).

The page reads this facility's own referral table. Opening it asks this server to pull the queue OpenFn filed under this facility's Master Facility Code. The browser does not call OpenFn.

```sh
yarn install
yarn workspace @palladium-ethiopia/esm-referral-app typescript
yarn workspace @palladium-ethiopia/esm-referral-app build
openmrs develop --sources packages/esm-referral-app --backend http://localhost:8080
```

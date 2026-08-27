const openmrsRspackConfig = require('openmrs/default-rspack-config');

// OpenMRS core 10 excludes all of `node_modules` from the swc loader; core 8 excluded
// everything except `@openmrs/*`. We consume `@openmrs/esm-patient-common-lib` from npm
// and it is published as TypeScript source (`main: src/index.ts`, no `dist`), so it still
// has to be transpiled or rspack fails to parse it as JavaScript.
//
// Mirrors the override already used by packages/esm-order-catalog-ethio-app/webpack.config.js.
openmrsRspackConfig.scriptRuleConfig.exclude = /node_modules(?![/\\]@openmrs)/;

module.exports = openmrsRspackConfig;

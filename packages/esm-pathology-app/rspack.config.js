const { scriptRuleConfig } = require('@openmrs/rspack-config');
const openmrsConfig = require('openmrs/default-rspack-config');

// patient-common-lib (npm) ships TS as main; allow SWC to transpile @openmrs shared fallbacks
scriptRuleConfig.exclude = [/node_modules(?![/\\]@openmrs)/, /\.test\.(m)?(ts|tsx)$/];

module.exports = (env, argv) => {
  const config = openmrsConfig(env, argv);
  config.plugins = (config.plugins || []).filter(
    (plugin) => !(plugin && plugin.constructor && plugin.constructor.name === 'TsCheckerRspackPlugin'),
  );
  return config;
};

const { scriptRuleConfig } = require('@openmrs/webpack-config');
const openmrsWebpackConfig = require('openmrs/default-webpack-config');

const testFilePattern = /\.test\.(m)?(ts|tsx)$/;

if (scriptRuleConfig.exclude) {
  scriptRuleConfig.exclude = [scriptRuleConfig.exclude, testFilePattern];
} else {
  scriptRuleConfig.exclude = [/node_modules(?![/\\]@openmrs)/, testFilePattern];
}

module.exports = openmrsWebpackConfig;

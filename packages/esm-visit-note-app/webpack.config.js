const config = require('openmrs/default-webpack-config');

config.externals = [...(config.externals || []), /^@openmrs\/esm-patient-notes-app/];

module.exports = config;

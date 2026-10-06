const path = require('path');
const rootConfig = require('../../jest.config.js');

const packageConfig = {
  ...rootConfig,
  collectCoverage: false,
  moduleNameMapper: {
    ...rootConfig.moduleNameMapper,
    '\\.(png|jpe?g|gif)$': path.resolve(__dirname, '__mocks__', 'file.mock.js'),
  },
};

module.exports = packageConfig;

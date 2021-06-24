// An example configuration file.
exports.config = {
  directConnect: true,

  // Capabilities to be passed to the webdriver instance.
  capabilities: {
    'browserName': 'chrome',
    chromeOptions: {
      args: [ "--headless", "--disable-gpu", "--window-size=800,600" ]
    }
  },

  // Framework to use. Jasmine is recommended.a
  framework: 'jasmine',

  // Spec patterns are relative to the current working directory when
  // protractor is called.
  //specs: ['example_spec.js'],
  specs: ['tests/loginPage.spec.js'],
  // specs: ['TC_01', 'TC02', ],

  // Options to be passed to Jasmine.
  jasmineNodeOpts: {
    defaultTimeoutInterval: 30000
  }
};

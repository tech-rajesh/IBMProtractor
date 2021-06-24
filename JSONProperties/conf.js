var HtmlReporter = require('protractor-beautiful-reporter');
directConnect: true
exports.config = {
   framework: 'jasmine2',
   onPrepare: function () 
  {
      jasmine.getEnv().addReporter(new HtmlReporter({
      baseDirectory: 'Report/screenshots'
   }).getJasmine2Reporter());
},
 // seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['BankManagerLogin.spec.js'],
};
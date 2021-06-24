// import { browser, element, by, ElementFinder, ProtractorBrowser, protractor} from 'protractor'
// import {} from "../specs/loge"
// import { CutomLogger } from './t';
const test= require('./loggerConfig')
const CutomLogger = new test.MOB();
describe('Protractor Typescript Demo', function() {
	browser.ignoreSynchronization = true; // for non-angular websites
	browser.manage().window().maximize()
	it('Mouse Operations', function() {
		// set implicit time to 30 seconds
		browser.manage().timeouts().implicitlyWait(30000);

		browser.get("https://google.com")
		// using general logger
		CutomLogger.logger.log('info', "1 *** infomational");
		CutomLogger.logger.log('warn', "2 *** warning");
		CutomLogger.logger.log('error', "3 *** erroe");
		// using respective loglevel methods
		CutomLogger.logger.info("4 *** informational");
		CutomLogger.logger.warn("5 *** warning");
		CutomLogger.logger.error("6 *** error");
	});
});
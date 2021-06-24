const { browser, element } = require("protractor")

describe('Handle Input box- non Angular Application', () => {


    beforeAll(() => {
        
        //Handle non- Angular applicaiton
        browser.waitForAngularEnabled(false)
        browser.get('https://in.godaddy.com/')
        browser.manage().window().maximize()

    })

    afterEach(() => {
        browser.sleep(4000)

    })
    it('Click on Search box', function () {

        element(by.css("[name='domainToCheck']")).sendKeys('iphoneApp')

    })


    it('Clear Text from Search box', function () {

        element(by.css("[name='domainToCheck']")).clear();


    })


    it('Click on Search box', function () {

        element(by.css("[name='domainToCheck']")).sendKeys('IBM Automation')

    })

})
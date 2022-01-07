const { browser, element, by } = require("protractor")

describe('SmokeTest', () => {


    xit('TC_01', function () {

        browser.get('https://juliemr.github.io/protractor-demo/')
        browser.sleep(3000)
        element(by.buttonText('Go!')).click()
        browser.sleep(3000)



})

it('TC_01', async function () {

    browser.get('https://juliemr.github.io/protractor-demo/')
    browser.sleep(3000)
    element(by.css("[ng-model='first']")).sendKeys('121')
    element(by.css("[ng-model='second']")).sendKeys('212')
    element(by.buttonText('Go!')).click()
    browser.sleep(3000)

    
    
    console.log(await element(by.cssContainingText('.ng-binding','3334')).getText());

})

})
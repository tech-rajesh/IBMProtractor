const { browser } = require('protractor');
const readData = require('../cred.json')

//Actual Test


describe('Verify App login feature', () => {

    //     console.log(readData);
    // console.log(readData.url);
    // console.log(readData.user);
    // console.log(readData.pass);

    it('verify ', () => {

        browser.waitForAngularEnabled(false)
        browser.get(readData.url);
        element(by.css("input#txtUsername")).sendKeys(readData.user)

        browser.sleep(4000)


    })

})


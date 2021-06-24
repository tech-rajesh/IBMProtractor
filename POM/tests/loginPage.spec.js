
const loginPage = require('../pages/loginPage')
const data = require('../cred.json')
// const data = require('../../cred.json')
const { browser } = require('protractor')


describe('Login Feature Test', () => {


    beforeAll(function () {
        browser.waitForAngularEnabled(false)
        browser.get(data.url)
    })

    afterEach(() => {
        browser.sleep(3000)
    })

    xit('verify login with Valid user', () => {

        loginPage.enterUserName(data.user)
        loginPage.enterPassword(data.pass)
        loginPage.clickLoginBtn();

    })


    it('verify message with user blank ', () => {

        // loginPage.enterUserName(data.user)
        loginPage.enterPassword(data.pass)
        loginPage.clickLoginBtn();
        loginPage.verifyMessageUserRequired(data.userBlank)
        console.log('====================Execution Completed===========');

    })

    it('verify Application Title', () => {

        loginPage.verifyTitle('HRM')

    })



})
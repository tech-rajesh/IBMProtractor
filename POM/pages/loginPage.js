const { browser } = require("protractor");

let loginPage = function () {

    let edit_UserName = element(by.css("input#txtUsername"));
    let edit_Password = element(by.css("input#txtPassword"))
    let Btn_Login = element(by.css("input#btnLogin"))
    let message_user_blank = element(by.css("#spanMessage"));


    this.enterUserName = function (user) {
        edit_UserName.sendKeys(user)

    }

    this.enterPassword = function (pass) {
        edit_Password.sendKeys(pass)

    }
    this.clickLoginBtn = function () {
        Btn_Login.click()

    }

    this.verifyTitle = async function (expectedTitle) {
        
        expect(await browser.getTitle()).toContain(expectedTitle)

    }

    this.verifyMessageUserRequired = async function (expectedTitle) {
        
        expect(await message_user_blank.getText()).toContain(expectedTitle)

    }


}

module.exports = new loginPage();
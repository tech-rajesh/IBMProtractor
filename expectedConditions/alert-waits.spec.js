const { browser, $ } = require("protractor")

describe("Expected Conditions", () => {

    it("wait for an alert & accept", async () => {
        browser.waitForAngularEnabled(false)
        await browser.get("http://only-testing-blog.blogspot.com/2014/01/new-testing.html?")
        let ec = browser.ExpectedConditions;

        await browser.wait(ec.alertIsPresent(), 30000, 'Waiting for an alert');
        console.log(await (await browser.switchTo().alert()).getText());
        (await browser.switchTo().alert()).accept()


        //let SubmitButton = element(by.css("#submitButton"));
        await browser.wait(ec.elementToBeClickable(by.css("#submitButton")), 30000, 'Waiting for an alert');
        
    })

})
const { browser, element, by } = require("protractor")

describe("Actions", () => {

    beforeAll(async () => {
        browser.waitForAngularEnabled(false)
        await browser.get("https://www.globalsqa.com/demo-site/draganddrop/");
        browser.manage().window().maximize()
    })

    it("Drag & Drop", async () => {
        await browser.sleep(5000)
        browser.switchTo().frame(2)
        
        let source = element(by.xpath("//img[contains(@src,'tatras3')]"));
        let target = element(by.xpath("//div[@id='trash']"));

        await browser.actions().dragAndDrop(await source.getWebElement(),
            await target.getWebElement())
            .perform();
    })


    afterAll(async () => {
        await browser.sleep(5000);
    })
})